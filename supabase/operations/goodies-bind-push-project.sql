-- Set wantiss.goodies.eas_project_id to the independently verified existing EAS project.
-- This prepares the binding only. It never enables push or registers a device.
begin;
set local lock_timeout='3s';
do $binding$
declare target uuid:=nullif(current_setting('wantiss.goodies.eas_project_id',true),'')::uuid;
  config private.goodies_push_config%rowtype;
begin
  if current_user not in ('postgres','supabase_admin') then
    raise exception 'Privileged deployment connection required' using errcode='42501';end if;
  if target is null then raise exception 'Verified existing EAS project ID required';end if;
  select * into strict config from private.goodies_push_config where id for update;
  if config.eas_project_id=target then return;end if;
  if config.enabled or config.eas_project_id is not null then
    raise exception 'Existing push configuration requires review before rebinding';end if;
  update private.goodies_push_config set eas_project_id=target where id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
    values(null,'goodies_push_project_bound','goodies_config','push',
      'Owner-approved device setup; verified existing Expo project; push remains disabled pending provider credentials',
      jsonb_build_object('enabled',config.enabled,'eas_project_id',config.eas_project_id),
      jsonb_build_object('enabled',false,'eas_project_id',target));
end $binding$;
commit;
