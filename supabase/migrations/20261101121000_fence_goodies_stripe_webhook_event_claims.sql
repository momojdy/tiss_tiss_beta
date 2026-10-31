-- Fence Goodies Stripe webhook event claims so expired workers cannot
-- complete or fail a newer worker's claim for the same Stripe event.

alter table public.goodies_stripe_webhook_events
  add column if not exists claim_token uuid;

drop function if exists public.claim_goodies_stripe_webhook_event(text,text,boolean);
create function public.claim_goodies_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim_token uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if nullif(trim(p_event_id),'') is null or nullif(trim(p_event_type),'') is null then
    raise exception 'Stripe event identity is required' using errcode='22023';
  end if;

  insert into public.goodies_stripe_webhook_events(
    event_id,event_type,livemode,status,attempts,locked_at,claim_token,updated_at
  ) values (
    p_event_id,p_event_type,coalesce(p_livemode,false),'processing',1,now(),gen_random_uuid(),now()
  )
  on conflict(event_id) do update set
    event_type=excluded.event_type,
    livemode=excluded.livemode,
    status='processing',
    attempts=public.goodies_stripe_webhook_events.attempts+1,
    locked_at=now(),
    claim_token=gen_random_uuid(),
    last_error=null,
    updated_at=now()
  where public.goodies_stripe_webhook_events.status='failed'
     or (public.goodies_stripe_webhook_events.status='processing'
         and public.goodies_stripe_webhook_events.locked_at < now()-interval '30 minutes')
  returning claim_token into v_claim_token;

  return v_claim_token;
end;
$$;

drop function if exists public.complete_goodies_stripe_webhook_event(text);
create function public.complete_goodies_stripe_webhook_event(
  p_event_id text,
  p_claim_token uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.goodies_stripe_webhook_events
     set status='processed',processed_at=now(),last_error=null,claim_token=null,updated_at=now()
   where event_id=p_event_id and status='processing' and claim_token=p_claim_token;
  if not found then
    raise exception 'Stripe event claim is no longer owned by this worker' using errcode='P0001';
  end if;
end;
$$;

drop function if exists public.fail_goodies_stripe_webhook_event(text,text);
create function public.fail_goodies_stripe_webhook_event(
  p_event_id text,
  p_claim_token uuid,
  p_error text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.goodies_stripe_webhook_events
     set status='failed',last_error=left(nullif(trim(p_error),''),1000),
         claim_token=null,updated_at=now()
   where event_id=p_event_id and status='processing' and claim_token=p_claim_token;
end;
$$;

revoke all on function public.claim_goodies_stripe_webhook_event(text,text,boolean) from public, anon, authenticated;
revoke all on function public.complete_goodies_stripe_webhook_event(text,uuid) from public, anon, authenticated;
revoke all on function public.fail_goodies_stripe_webhook_event(text,uuid,text) from public, anon, authenticated;
grant execute on function public.claim_goodies_stripe_webhook_event(text,text,boolean) to service_role;
grant execute on function public.complete_goodies_stripe_webhook_event(text,uuid) to service_role;
grant execute on function public.fail_goodies_stripe_webhook_event(text,uuid,text) to service_role;
