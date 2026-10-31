-- Allow the webhook to distinguish completed duplicates from an in-flight delivery.
create or replace function public.get_goodies_stripe_webhook_event_status(p_event_id text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_status text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  select status into v_status from public.goodies_stripe_webhook_events where event_id=p_event_id;
  return v_status;
end;
$$;
revoke all on function public.get_goodies_stripe_webhook_event_status(text) from public,anon,authenticated;
grant execute on function public.get_goodies_stripe_webhook_event_status(text) to service_role;