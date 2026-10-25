do $$
declare v_job_id bigint;
begin
 if not exists(select 1 from vault.decrypted_secrets where name='goodies_refund_worker_token' and decrypted_secret is not null) then
   raise exception 'Goodies refund worker token is not configured';
 end if;
 select jobid into v_job_id from cron.job where jobname='goodies-card-refund-worker' limit 1;
 if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
 perform cron.schedule('goodies-card-refund-worker','* * * * *',$cmd$select net.http_post(
   url := 'https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/process-goodies-card-refunds',
   headers := jsonb_build_object('Content-Type','application/json','x-goodies-worker-token',
     (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1)),
   body := '{}'::jsonb
 );$cmd$);
end $$;
