begin;
create table if not exists private.goodies_fx_refresh_config(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 wantiss_multiplier numeric(30,16),
 multiplier_source_rate_id uuid,
 last_rate_id uuid,
 last_quote_date date,
 last_checked_at timestamptz,
 last_success_at timestamptz,
 last_error_code text,
 consecutive_failures integer not null default 0 check(consecutive_failures>=0)
);
insert into private.goodies_fx_refresh_config(singleton) values(true) on conflict do nothing;
alter table private.goodies_fx_refresh_config enable row level security;
revoke all on private.goodies_fx_refresh_config from public,anon,authenticated,service_role;

create or replace function private.goodies_fx_refresh_snapshot()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',c.enabled,'source','Frankfurter daily reference',
  'last_quote_date',c.last_quote_date,'last_checked_at',c.last_checked_at,'last_success_at',c.last_success_at,
  'last_error_code',c.last_error_code,'consecutive_failures',c.consecutive_failures,
  'expires_at',(select expires_at from public.exchange_rates where id=c.last_rate_id),
  'fresh',exists(select 1 from public.exchange_rates r where r.from_currency='USD' and r.to_currency='HTG'
   and r.is_active and r.expires_at>now() and r.wantiss_rate>0 and r.wantiss_rate::text not in ('NaN','Infinity','-Infinity')))
 from private.goodies_fx_refresh_config c where c.singleton;
$$;
revoke all on function private.goodies_fx_refresh_snapshot() from public,anon,authenticated,service_role;

create or replace function public.goodies_fx_refresh_status()
returns jsonb language sql stable security definer set search_path='' as $$select private.goodies_fx_refresh_snapshot()$$;
revoke all on function public.goodies_fx_refresh_status() from public,anon,authenticated;
grant execute on function public.goodies_fx_refresh_status() to service_role;

create or replace function public.goodies_admin_fx_refresh_status()
returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.goodies_finance_assert();return private.goodies_fx_refresh_snapshot();end $$;
revoke all on function public.goodies_admin_fx_refresh_status() from public,anon;
grant execute on function public.goodies_admin_fx_refresh_status() to authenticated;

create or replace function public.goodies_publish_usd_htg_quote(p_quote_date date,p_market_rate numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.goodies_fx_refresh_config%rowtype;existing public.exchange_rates%rowtype;
 expiry timestamptz;market numeric;wantiss numeric;quote_id uuid;
begin
 select * into strict cfg from private.goodies_fx_refresh_config where singleton for update;
 if not cfg.enabled or cfg.wantiss_multiplier is null or cfg.wantiss_multiplier<=0
  or cfg.wantiss_multiplier::text in ('NaN','Infinity','-Infinity') then
  raise exception 'Exchange rate refresh is unavailable' using errcode='55000';end if;
 if p_quote_date is null or p_market_rate is null or p_market_rate<=0 or p_market_rate>1000000000
  or p_market_rate::text in ('NaN','Infinity','-Infinity') then
  raise exception 'Invalid reference quote' using errcode='22023';end if;
 expiry:=(p_quote_date::timestamp+interval '4 days') at time zone 'UTC';
 if p_quote_date>(now() at time zone 'UTC')::date or expiry<=now()
  or p_quote_date<cfg.last_quote_date then
  raise exception 'Reference quote is unavailable for this date' using errcode='22023';end if;
 market:=round(p_market_rate,10);wantiss:=round(market*cfg.wantiss_multiplier,10);
 if market<=0 or wantiss<=0 or wantiss::text in ('NaN','Infinity','-Infinity') then
  raise exception 'Invalid reference quote' using errcode='22023';end if;
 select * into existing from public.exchange_rates where id=cfg.last_rate_id;
 if found and (existing.market_rate<=0 or existing.market_rate::text in ('NaN','Infinity','-Infinity')
  or market>existing.market_rate*1.2 or market<existing.market_rate*0.8) then
  raise exception 'Reference quote requires financial review' using errcode='22023';end if;
 if found and cfg.last_quote_date=p_quote_date and existing.market_rate=market and existing.wantiss_rate=wantiss
  and existing.from_currency='USD' and existing.to_currency='HTG' and existing.expires_at=expiry and existing.is_active then
  update private.goodies_fx_refresh_config set last_checked_at=now(),last_success_at=now(),last_error_code=null,consecutive_failures=0 where singleton;
  return jsonb_build_object('status','unchanged','quote_id',existing.id,'quote_date',p_quote_date,'expires_at',expiry);
 end if;
 insert into public.exchange_rates(from_currency,to_currency,market_rate,wantiss_rate,expires_at,is_active)
 values('USD','HTG',market,wantiss,expiry,true) returning id into quote_id;
 update private.goodies_fx_refresh_config set last_rate_id=quote_id,last_quote_date=p_quote_date,last_checked_at=now(),
  last_success_at=now(),last_error_code=null,consecutive_failures=0 where singleton;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values(null,'goodies_exchange_rate_refreshed','exchange_rate',quote_id::text,'Validated USD/HTG daily reference refresh',
  jsonb_build_object('quote_id',cfg.last_rate_id,'quote_date',cfg.last_quote_date),
  jsonb_build_object('quote_id',quote_id,'quote_date',p_quote_date,'expires_at',expiry,
   'source','https://api.frankfurter.dev/v2/rates?base=USD&quotes=HTG','multiplier_source_rate_id',cfg.multiplier_source_rate_id));
 return jsonb_build_object('status','updated','quote_id',quote_id,'quote_date',p_quote_date,'expires_at',expiry);
end $$;
revoke all on function public.goodies_publish_usd_htg_quote(date,numeric) from public,anon,authenticated;
grant execute on function public.goodies_publish_usd_htg_quote(date,numeric) to service_role;

create or replace function public.goodies_record_fx_refresh_failure(p_code text)
returns void language plpgsql security definer set search_path='' as $$
declare cfg private.goodies_fx_refresh_config%rowtype;
begin
 if p_code is null or p_code not in ('provider_unavailable','provider_invalid','source_stale','write_unavailable') then
  raise exception 'Invalid refresh outcome' using errcode='22023';end if;
 select * into strict cfg from private.goodies_fx_refresh_config where singleton for update;
 update private.goodies_fx_refresh_config set last_checked_at=now(),last_error_code=p_code,
  consecutive_failures=least(consecutive_failures,999999)+1 where singleton;
 if cfg.last_error_code is distinct from p_code then
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values(null,'goodies_exchange_rate_refresh_failed','goodies_config','usd-htg',p_code,jsonb_build_object('code',p_code,'last_rate_id',cfg.last_rate_id));
 end if;
end $$;
revoke all on function public.goodies_record_fx_refresh_failure(text) from public,anon,authenticated;
grant execute on function public.goodies_record_fx_refresh_failure(text) to service_role;

select cron.schedule('goodies-usd-htg-refresh','17 */4 * * *',$job$
 select net.http_post(
  url:='https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/refresh-goodies-exchange-rate',
  headers:=jsonb_build_object('Content-Type','application/json','x-goodies-worker-token',
   (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1)),body:='{}'::jsonb,timeout_milliseconds:=60000)
 where exists(select 1 from private.goodies_fx_refresh_config where singleton and enabled)
  and exists(select 1 from vault.decrypted_secrets where name='goodies_refund_worker_token' and nullif(decrypted_secret,'') is not null);
$job$);
commit;
