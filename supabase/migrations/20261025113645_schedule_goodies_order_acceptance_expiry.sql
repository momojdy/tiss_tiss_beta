-- Run the order response expiry worker every minute.
-- The worker promotes scheduled orders when due, expires unanswered orders,
-- restores reserved catalog stock, and notifies affected users.
do $$
declare v_job_id bigint;
begin
  if not exists (select 1 from pg_extension where extname='pg_cron') then
    raise exception 'pg_cron must be enabled before scheduling Goodies order expiry';
  end if;
  select jobid into v_job_id from cron.job where jobname='goodies-expire-unaccepted-orders' limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule('goodies-expire-unaccepted-orders','* * * * *','select public.expire_unaccepted_goodies_orders()');
end $$;
