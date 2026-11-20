-- Expired invitations must not remain apparently open forever. No new
-- orders, payments, Wallet entries or checkout data are created by this job.
create or replace function private.goodies_expire_group_orders()
returns integer
language plpgsql
set search_path=''
as $function$
declare affected integer;
begin
  update public.goodies_group_orders g
     set status='expired',updated_at=now()
   where g.status='open'
     and g.expires_at<=now()
     and g.order_id is null;
  get diagnostics affected=row_count;
  return affected;
end
$function$;
revoke all on function private.goodies_expire_group_orders() from public,anon,authenticated;

-- pg_cron is installed on the hosted project but intentionally absent from
-- the disposable PGlite harness. Schedule only where the extension exists.
do $schedule$
begin
  if to_regclass('cron.job') is not null then
    perform cron.schedule(
      'goodies-expire-group-orders',
      '* * * * *',
      'select private.goodies_expire_group_orders()'
    );
  end if;
end
$schedule$;
