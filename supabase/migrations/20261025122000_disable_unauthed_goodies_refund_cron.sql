-- The refund worker requires an authenticated customer or business-member JWT.
-- Do not invoke it from a public cron request; customer/vendor clients invoke it for eligible terminal orders.
do $$ begin perform cron.unschedule(jobid) from cron.job where jobname='goodies-card-refund-worker'; end $$;
