-- Preserve the existing Wantiss adjustment; fetch a new quote rather than extending an expired row.
begin;
set local lock_timeout='3s';
do $enable$
declare cfg private.goodies_fx_refresh_config%rowtype;basis public.exchange_rates%rowtype;
begin
 if current_user not in ('postgres','supabase_admin') then
  raise exception 'Privileged deployment connection required' using errcode='42501';end if;
 select * into strict cfg from private.goodies_fx_refresh_config where singleton for update;
 if cfg.enabled then
  if cfg.wantiss_multiplier is null or cfg.wantiss_multiplier<=0
   or cfg.wantiss_multiplier::text in ('NaN','Infinity','-Infinity') or cfg.multiplier_source_rate_id is null then
   raise exception 'The existing Wantiss adjustment requires financial review';end if;
  return;
 end if;
 if cfg.wantiss_multiplier is null then
  select * into basis from public.exchange_rates where from_currency='USD' and to_currency='HTG'
   and is_active and market_rate>0 and wantiss_rate>0
   and market_rate::text not in ('NaN','Infinity','-Infinity') and wantiss_rate::text not in ('NaN','Infinity','-Infinity')
   order by created_at desc,id desc limit 1;
  if not found then raise exception 'An approved existing Wantiss rate adjustment is required';end if;
  update private.goodies_fx_refresh_config set wantiss_multiplier=basis.wantiss_rate/basis.market_rate,multiplier_source_rate_id=basis.id where singleton;
 end if;
 if not exists(select 1 from private.goodies_fx_refresh_config where singleton and wantiss_multiplier>0
  and wantiss_multiplier::text not in ('NaN','Infinity','-Infinity') and multiplier_source_rate_id is not null) then
  raise exception 'The existing Wantiss adjustment requires financial review';end if;
 update private.goodies_fx_refresh_config set enabled=true where singleton;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values(null,'goodies_exchange_rate_refresh_enabled','goodies_config','usd-htg',
  'Owner-requested cash readiness repair; preserve existing Wantiss adjustment; credential-free daily reference source',
  jsonb_build_object('enabled',true,'source','Frankfurter daily reference','multiplier_source_rate_id',coalesce(cfg.multiplier_source_rate_id,basis.id)));
end $enable$;
commit;
