create or replace function public.monitor_goodies_card_auth_expiry_worker()
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_response record;
  v_failed integer := 0;
  v_issue text;
  v_alert_key text;
  v_stale_count integer := 0;
begin
  select r.status_code,r.timed_out,r.error_msg,r.content,r.created
    into v_response
    from net._http_response r
   where r.content like '%"expired"%'
   order by r.created desc
   limit 1;

  if not found or v_response.created < now()-interval '10 minutes' then
    v_issue := 'No successful abandoned 3DS expiry worker heartbeat was recorded in the last 10 minutes.';
    v_alert_key := 'goodies_3ds_expiry_worker_missing_heartbeat';
  else
    begin
      v_failed := coalesce((v_response.content::jsonb->>'failed')::integer,0);
    exception when others then
      v_failed := 1;
    end;
    if v_response.timed_out or v_response.error_msg is not null
       or v_response.status_code < 200 or v_response.status_code >= 300 or v_failed > 0 then
      v_issue := 'The abandoned 3DS expiry worker returned an error. HTTP status: '
        ||coalesce(v_response.status_code::text,'unknown')
        ||'; failed orders: '||v_failed
        ||'; details: '||left(coalesce(v_response.error_msg,v_response.content,'No response body'),500);
      v_alert_key := 'goodies_3ds_expiry_worker_failure';
    end if;
  end if;

  select count(*) into v_stale_count
    from public.goodies_orders o
   where o.payment_method='card'
     and o.payment_status='requires_action'
     and o.payment_provider_ref is not null
     and o.created_at < now()-interval '60 minutes'
     and o.status in ('scheduled','placed','cancelled','declined','expired');

  if v_issue is null and v_stale_count > 0 then
    v_issue := v_stale_count||' Goodies card authentication attempts remain unresolved more than 60 minutes after checkout.';
    v_alert_key := 'goodies_3ds_expiry_backlog';
  end if;

  if v_issue is not null then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,null,'Goodies card verification operations alert',v_issue,
      'goodies_refund_attention','Goodies','goodies/refunds',
      jsonb_build_object('alert_key',v_alert_key,'observed_at',now())
    from public.wantiss_admin_staff s
    join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin'
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.notifications n
        where n.user_id=s.user_id
          and n.metadata->>'alert_key'=v_alert_key
          and n.created_at > now()-interval '1 hour'
      );
  end if;

  return v_issue is null;
end;
$function$;

revoke all on function public.monitor_goodies_card_auth_expiry_worker() from public,anon,authenticated;
grant execute on function public.monitor_goodies_card_auth_expiry_worker() to postgres,service_role;

select cron.schedule(
  'monitor-goodies-card-auth-expiry-worker',
  '*/5 * * * *',
  $$select public.monitor_goodies_card_auth_expiry_worker()$$
);
