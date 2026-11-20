begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
-- Shared Wantiss accounts/sessions own devices. Goodies reuses the existing
-- notification inbox; this outbox contains delivery state, never new events.
create table private.goodies_push_config (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  eas_project_id uuid
);
insert into private.goodies_push_config(id) values(true);
create table private.wantiss_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references auth.sessions(id) on delete cascade,
  binding_id uuid not null default gen_random_uuid(),
  token text not null unique check (token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,255}\]$'),
  eas_project_id uuid not null,
  platform text not null check (platform in ('android','ios')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index wantiss_push_devices_user on private.wantiss_push_devices(user_id) where enabled;
create table private.goodies_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references private.wantiss_push_devices(id) on delete cascade,
  binding_id uuid not null,
  status text not null default 'pending' check (status in ('pending','sending','ticket','checking','delivered','failed','uncertain','suppressed')),
  attempts integer not null default 0,
  receipt_checks integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  ticket_id uuid,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id,device_id)
);
create index goodies_push_deliveries_work on private.goodies_push_deliveries(next_attempt_at,id) where status in ('pending','ticket','sending','checking');
alter table private.goodies_push_config enable row level security;
alter table private.wantiss_push_devices enable row level security;
alter table private.goodies_push_deliveries enable row level security;
revoke all on private.goodies_push_config,private.wantiss_push_devices,private.goodies_push_deliveries from public,anon,authenticated,service_role;

create function public.goodies_register_push_device(p_token text,p_platform text,p_project_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();sid uuid;cfg private.goodies_push_config%rowtype;device uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_token is null or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,255}\]$' or p_platform is null or p_platform not in ('android','ios') or p_project_id is null then
  raise exception 'Invalid device registration' using errcode='22023';end if;
 select s.id into sid from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=actor and (s.not_after is null or s.not_after>now());
 if sid is null then raise exception 'Current session required' using errcode='42501';end if;
 select * into cfg from private.goodies_push_config where id;
 if not cfg.enabled or cfg.eas_project_id is null then return jsonb_build_object('status','disabled');end if;
 if cfg.eas_project_id<>p_project_id then raise exception 'Device project unavailable' using errcode='22023';end if;
 -- Serialize this account's device cap; never accept a caller-supplied account.
 perform 1 from auth.users where id=actor for update;
 if (select count(*) from private.wantiss_push_devices where user_id=actor and enabled and token<>p_token)>=20 then
  raise exception 'Device limit reached' using errcode='54000';end if;
 insert into private.wantiss_push_devices(user_id,session_id,token,platform,eas_project_id)
 values(actor,sid,p_token,p_platform,p_project_id)
 on conflict(token) do update set user_id=excluded.user_id,session_id=excluded.session_id,platform=excluded.platform,
  eas_project_id=excluded.eas_project_id,enabled=true,updated_at=now(),
  binding_id=case when wantiss_push_devices.user_id<>excluded.user_id or wantiss_push_devices.session_id<>excluded.session_id then gen_random_uuid() else wantiss_push_devices.binding_id end
 returning id into device;
 return jsonb_build_object('status','registered','device_id',device);
end $$;
create function public.goodies_unregister_push_device(p_token text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 update private.wantiss_push_devices set enabled=false,updated_at=now()
 where user_id=auth.uid() and token=p_token and session_id::text=auth.jwt()->>'session_id';
end $$;
create function public.goodies_push_registration_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 return (select jsonb_build_object('enabled',enabled and eas_project_id is not null,'project_id',eas_project_id) from private.goodies_push_config where id);
end $$;

create function private.goodies_push_allowed(n public.notifications)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare prefs jsonb;bid uuid;
begin
 if n.user_id is null or lower(coalesce(n.feature_name,''))<>'goodies' or n.notification_type like 'goodies_admin_%' or coalesce(n.destination,'') like 'admin%' then return false;end if;
 select notification_preferences into prefs from public.user_settings where user_id=n.user_id;
 if n.destination='goodies_courier' or n.notification_type like 'goodies_courier_%' then
  return exists(select 1 from public.goodies_courier_roster where courier_id=n.user_id and is_approved);
 end if;
 if coalesce(n.destination,'') like 'business_%' or n.notification_type like 'goodies_vendor_%' or n.notification_type like 'goodies_ingredient_%' or (n.notification_type='store_message' and n.metadata ? 'business_id') then
  if coalesce(prefs->'goodies_vendor_push','true'::jsonb)='false'::jsonb then return false;end if;
  if coalesce(n.metadata->>'business_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false;end if;
  bid:=(n.metadata->>'business_id')::uuid;
  return exists(select 1 from public.business_members where user_id=n.user_id and business_id=bid);
 end if;
 if n.notification_type in ('goodies_promo','goodies_promotion') then
  return coalesce(prefs->'goodies_promos',prefs->'promotions','true'::jsonb)<>'false'::jsonb;
 end if;
 return coalesce(prefs->'goodies_orders',prefs->'orders','true'::jsonb)<>'false'::jsonb;
end $$;
create function private.goodies_enqueue_push()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.goodies_push_config where id and enabled) or not private.goodies_push_allowed(new) then return new;end if;
 insert into private.goodies_push_deliveries(notification_id,device_id,binding_id)
 select new.id,d.id,d.binding_id from private.wantiss_push_devices d join auth.sessions s on s.id=d.session_id
 join private.goodies_push_config c on c.id and c.enabled and c.eas_project_id=d.eas_project_id
 where d.user_id=new.user_id and d.enabled and d.updated_at>now()-interval '90 days' and (s.not_after is null or s.not_after>now())
 on conflict(notification_id,device_id) do nothing;
 return new;
end $$;
create trigger goodies_enqueue_push after insert on public.notifications for each row execute function private.goodies_enqueue_push();

create function public.goodies_claim_push_deliveries(p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from private.goodies_push_config where id and enabled and eas_project_id is not null) then return '[]'::jsonb;end if;
 -- A lost send response has an unknown provider outcome. Never blindly resend.
 update private.goodies_push_deliveries set status='uncertain',error_code='send_outcome_unknown',updated_at=now() where status='sending' and lease_until<now();
 update private.goodies_push_deliveries set status='ticket',lease_token=null,updated_at=now() where status='checking' and lease_until<now();
 update private.goodies_push_deliveries q set status='suppressed',lease_token=null,updated_at=now()
 where q.status in ('pending','ticket') and not exists(
  select 1 from private.wantiss_push_devices d join auth.sessions s on s.id=d.session_id join public.notifications n on n.id=q.notification_id
  join private.goodies_push_config c on c.id and c.enabled and c.eas_project_id=d.eas_project_id
  where d.id=q.device_id and d.binding_id=q.binding_id and d.enabled and d.user_id=n.user_id and s.user_id=d.user_id
   and (s.not_after is null or s.not_after>now()) and d.updated_at>now()-interval '90 days' and private.goodies_push_allowed(n));
 update private.goodies_push_deliveries set status='failed',error_code='delivery_expired',updated_at=now() where status in ('pending','ticket') and created_at<now()-interval '1 day';
 with picked as (
  select id from private.goodies_push_deliveries where status in ('pending','ticket') and next_attempt_at<=now()
  order by next_attempt_at,id limit least(greatest(coalesce(p_limit,25),1),100) for update skip locked
 ), claimed as (
  update private.goodies_push_deliveries q set status=case when q.status='ticket' then 'checking' else 'sending' end,
   attempts=q.attempts+case when q.status='pending' then 1 else 0 end,receipt_checks=q.receipt_checks+case when q.status='ticket' then 1 else 0 end,
   lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now() from picked where q.id=picked.id returning q.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'lease_token',q.lease_token,'operation',case when q.status='checking' then 'receipt' else 'send' end,
    'ticket_id',q.ticket_id,'token',d.token,'project_id',d.eas_project_id,'notification_id',q.notification_id,'user_id',n.user_id,
    'title',public.goodies_notification_text('lbl.notification.push.title','Goodies update',n.user_id),
    'body',public.goodies_notification_text('lbl.notification.push.body','Open Wantiss to see your update.',n.user_id))), '[]'::jsonb)
 into result from claimed q join private.wantiss_push_devices d on d.id=q.device_id join public.notifications n on n.id=q.notification_id;
 return result;
end $$;
create function public.goodies_finish_push_delivery(p_id uuid,p_lease uuid,p_outcome text,p_ticket_id uuid default null,p_code text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare q private.goodies_push_deliveries%rowtype;
begin
 select * into q from private.goodies_push_deliveries where id=p_id and lease_token=p_lease and status in ('sending','checking') for update;
 if not found then return false;end if;
 if p_outcome is null or p_outcome not in ('ticket','delivered','retry','failed','uncertain') or
  (p_outcome='ticket' and (q.status<>'sending' or p_ticket_id is null)) or (p_outcome='delivered' and q.status<>'checking') or
  (p_code is not null and p_code not in ('DeviceNotRegistered','MessageTooBig','MessageRateExceeded','MismatchSenderId','InvalidCredentials','provider_unavailable','provider_response_invalid','send_outcome_unknown','receipt_pending')) then
  raise exception 'Invalid delivery result' using errcode='22023';end if;
 update private.goodies_push_deliveries set
  status=case when p_outcome='retry' then case when q.status='checking' then 'ticket' when q.attempts<5 then 'pending' else 'failed' end else p_outcome end,
  ticket_id=coalesce(p_ticket_id,ticket_id),error_code=p_code,lease_token=null,lease_until=null,
  next_attempt_at=now()+make_interval(secs=>least(900,30*(2^least(q.attempts+q.receipt_checks,5))::integer)),updated_at=now() where id=q.id;
 if p_code='DeviceNotRegistered' then update private.wantiss_push_devices set enabled=false,updated_at=now() where id=q.device_id and binding_id=q.binding_id;end if;
 return true;
end $$;
revoke all on function public.goodies_register_push_device(text,text,uuid),public.goodies_unregister_push_device(text),public.goodies_push_registration_status() from public,anon;
grant execute on function public.goodies_register_push_device(text,text,uuid),public.goodies_unregister_push_device(text),public.goodies_push_registration_status() to authenticated;
revoke all on function private.goodies_push_allowed(public.notifications),private.goodies_enqueue_push() from public,anon,authenticated;
revoke all on function public.goodies_claim_push_deliveries(integer),public.goodies_finish_push_delivery(uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.goodies_claim_push_deliveries(integer),public.goodies_finish_push_delivery(uuid,uuid,text,uuid,text) to service_role;

-- This job remains inert until a separately approved rollout enables the config.
-- Reuse the existing private worker token; never put it in an app or CMS record.
select cron.schedule('goodies-push-delivery','* * * * *',$job$
 select net.http_post(
  url:='https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/process-goodies-push-notifications',
  headers:=jsonb_build_object('Content-Type','application/json','x-goodies-worker-token',
    (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1)),body:='{}'::jsonb)
 where exists(select 1 from private.goodies_push_config where id and enabled and eas_project_id is not null)
  and exists(select 1 from vault.decrypted_secrets where name='goodies_refund_worker_token' and nullif(decrypted_secret,'') is not null);
 $job$);
commit;
