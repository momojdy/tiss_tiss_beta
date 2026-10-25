create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='goodies-expire-unaccepted-orders';
    perform cron.schedule('goodies-expire-unaccepted-orders','* * * * *','select public.expire_unaccepted_goodies_orders()');
  else
    raise exception 'pg_cron installed without cron schema; order expiry cannot be scheduled safely';
  end if;
end $$;
