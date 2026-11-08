begin;
-- Disabled until an approved deployment reconciles opening balances and enables the paired clients.
create table private.goodies_settlement_config(singleton boolean primary key default true check(singleton),enabled boolean not null default false,starts_at timestamptz);
insert into private.goodies_settlement_config default values;
create table private.goodies_vendor_accounts(business_id uuid primary key references public.businesses(id),created_at timestamptz not null default now());
create table private.goodies_order_settlements(order_id uuid primary key references public.goodies_orders(id),business_id uuid not null references public.businesses(id),cash_rate numeric(20,8),exchange_rate_id uuid,cash_sales_htg numeric(14,2) not null default 0,hold_until timestamptz,cash_paid numeric(14,2) not null default 0 check(cash_paid>=0),cash_received_at timestamptz,cash_receipt_reference text unique,created_at timestamptz not null default now());
create index goodies_order_settlements_business on private.goodies_order_settlements(business_id,hold_until);
create table private.goodies_payout_channels(method text primary key check(method in ('wal','moncash','natcash','gcash','bank')),enabled boolean not null default false);
insert into private.goodies_payout_channels values('wal',true),('moncash',false),('natcash',false),('gcash',false),('bank',false);
create table private.goodies_payout_destinations(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),owner_id uuid not null references auth.users(id),method text not null references private.goodies_payout_channels(method),country text not null check(country in ('HT','PH','US')),holder text not null check(length(holder) between 2 and 120),account_details jsonb not null,masked text not null,status text not null default 'pending' check(status in ('pending','verified','rejected')),created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id));
create index goodies_payout_destinations_business on private.goodies_payout_destinations(business_id,created_at);
create table private.goodies_vendor_payouts(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),requested_by uuid not null references auth.users(id),method text not null references private.goodies_payout_channels(method),destination_id uuid references private.goodies_payout_destinations(id),amount numeric(14,2) not null check(amount>0),currency text not null default 'USD' check(currency='USD'),payout_currency text not null,payout_amount numeric(14,2) not null check(payout_amount>0),locked_rate numeric(20,8) not null check(locked_rate>0),exchange_rate_id uuid,status text not null check(status in ('requested','processing','completed','failed')),idempotency_key text not null check(length(idempotency_key) between 8 and 120),provider_reference text unique,eta_from timestamptz not null,eta_to timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(business_id,idempotency_key));
create index goodies_vendor_payouts_business on private.goodies_vendor_payouts(business_id,created_at);
create table private.goodies_commission_payments(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),payer_id uuid not null references auth.users(id),amount numeric(14,2) not null check(amount>0),idempotency_key text not null,created_at timestamptz not null default now(),unique(business_id,idempotency_key));
create table private.goodies_bank_calendars(country text primary key,reviewed_until date not null,reviewed_by uuid not null references auth.users(id));
create table private.goodies_bank_holidays(country text not null,day date not null,primary key(country,day));
create table private.goodies_settlement_events(id uuid primary key default gen_random_uuid(),business_id uuid references public.businesses(id),actor_id uuid references auth.users(id),action text not null,resource_id text,details jsonb not null default '{}',created_at timestamptz not null default now());
create index goodies_settlement_events_business on private.goodies_settlement_events(business_id,created_at);
-- Private accounting records have no client table grants. Access is exclusively through scoped RPCs.
do $$ declare t text;begin foreach t in array array['goodies_settlement_config','goodies_vendor_accounts','goodies_order_settlements','goodies_payout_channels','goodies_payout_destinations','goodies_vendor_payouts','goodies_commission_payments','goodies_bank_holidays','goodies_bank_calendars','goodies_settlement_events'] loop execute format('alter table private.%I enable row level security',t);execute format('revoke all on private.%I from public,anon,authenticated',t);end loop;end $$;

create function private.goodies_settlement_assert(p_business uuid,p_manage boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.business_members where business_id=p_business and user_id=auth.uid() and (not p_manage or role='owner')) then raise exception 'Not authorized' using errcode='42501';end if;
 if not exists(select 1 from private.goodies_settlement_config where starts_at is not null and (not p_manage or enabled)) then raise exception 'Goodies settlement is unavailable' using errcode='55000';end if;
 if p_manage and exists(select 1 from public.businesses where id=p_business and verification='restricted') then raise exception 'Business restricted' using errcode='42501';end if;
end $$;
create function private.goodies_finance_assert(p_manage boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.wantiss_has_permission(case when p_manage then 'finance.approve' else 'finance.view' end,case when p_manage then 'manage' else 'view' end) then raise exception 'Not authorized' using errcode='42501';end if;
end $$;
create function private.goodies_settlement_lock(p_business uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into private.goodies_vendor_accounts(business_id) values(p_business) on conflict do nothing;
 perform 1 from private.goodies_vendor_accounts where business_id=p_business for update;
end $$;
create function private.goodies_settlement_items(p_business uuid)
returns table(order_id uuid,order_code text,total numeric,earned numeric,commission_due numeric,cash_paid numeric,exposure_htg numeric,hold_until timestamptz,blocked boolean,cash_courier boolean,commission_credit numeric,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 with facts as (
 select o.*,s.cash_paid,s.cash_sales_htg,s.hold_until,s.cash_received_at,
  greatest(0,1-least(coalesce(o.payment_refunded_amount,0),o.total)/nullif(o.total,0)) as remaining,
  (o.payment_dispute_status in ('open','lost') or o.delivery_dispute_status in ('open','resolved_refund') or o.payment_status in ('refund_pending','refund_manual_review','disputed','disputed_lost','refunded')) is true as blocked,
  (o.payment_method='cash' and not o.self_delivery and o.order_type<>'pickup' and o.courier_id is not null) as cash_courier
 from public.goodies_orders o join private.goodies_order_settlements s on s.order_id=o.id where s.business_id=p_business
 ), amounts as (
 select f.*,round((f.vendor_net_amount+case when f.self_delivery or f.order_type='pickup' then f.courier_net_delivery_amount+f.tip else 0 end)*remaining,2) as vendor_earned,
 round((f.platform_commission_amount+f.service_fee+f.delivery_commission_amount)*remaining,2) as cash_fee
 from facts f
 ) select a.id,a.order_code,a.total,
 case when a.status='completed' and not a.blocked and (a.payment_method<>'cash' and a.payment_status in ('paid','partially_refunded','dispute_won') or a.cash_courier and a.cash_received_at is not null) then a.vendor_earned else 0 end,
 case when a.payment_method='cash' and not a.cash_courier and a.status='completed' and not a.blocked and a.hold_until<=now() then a.cash_fee else 0 end,
 a.cash_paid,
 case when a.payment_method='cash' and a.status not in ('placed','scheduled','cancelled','declined','expired') and a.remaining>0 and not (a.cash_courier and a.status='completed') and not (a.status='completed' and not a.blocked and a.hold_until<=now() and a.cash_paid>=a.cash_fee) then round(a.cash_sales_htg*a.remaining,2) else 0 end,
 a.hold_until,a.blocked,a.cash_courier,case when a.cash_paid>0 and (a.remaining<1 or a.status in ('cancelled','declined','expired')) then greatest(a.cash_paid-case when a.status in ('cancelled','declined','expired') then 0 else a.cash_fee end,0) else 0 end,a.created_at from amounts a;
$$;

create function private.goodies_capture_settlement_order()
returns trigger language plpgsql security definer set search_path='' as $$
declare start_at timestamptz;rate numeric;rate_id uuid;exposure numeric;overdue boolean;
begin
 select starts_at into start_at from private.goodies_settlement_config;
 if start_at is null or new.created_at<start_at or (tg_op='UPDATE' and new.business_id is distinct from old.business_id) then return new;end if;
 if new.status in ('scheduled','placed') then return new;end if;
 perform private.goodies_settlement_lock(new.business_id);
 if not exists(select 1 from private.goodies_order_settlements where order_id=new.id) then
  if new.payment_method='cash' and new.status='accepted' then
   if not exists(select 1 from private.goodies_settlement_config where enabled) then raise exception 'Cash orders are temporarily unavailable' using errcode='P4202';end if;
   select round(er.wantiss_rate,8),er.id into rate,rate_id from public.exchange_rates er where er.from_currency='USD' and er.to_currency='HTG' and er.is_active and er.expires_at>now() and er.wantiss_rate>0 and er.wantiss_rate::text not in ('NaN','Infinity','-Infinity') order by er.created_at desc,er.id desc limit 1;
   if rate is null or rate<=0 then raise exception 'Cash orders are temporarily unavailable' using errcode='P4202';end if;
   select coalesce(sum(i.exposure_htg),0),coalesce(bool_or(i.commission_due>i.cash_paid and i.hold_until+interval '7 days'<=now()),false) into exposure,overdue from private.goodies_settlement_items(new.business_id) i;
   if overdue or exposure+round(new.total*rate,2)>5000 then raise exception 'Settle cash-order commission before accepting more cash orders' using errcode='P4201';end if;
  elsif new.payment_method='cash' and new.status not in ('cancelled','declined','expired') then
   raise exception 'Cash settlement reservation is missing' using errcode='55000';
  end if;
  insert into private.goodies_order_settlements(order_id,business_id,cash_rate,exchange_rate_id,cash_sales_htg) values(new.id,new.business_id,rate,rate_id,case when new.payment_method='cash' then round(new.total*coalesce(rate,0),2) else 0 end);
 end if;
 if new.status='completed' then
  update private.goodies_order_settlements set hold_until=coalesce(hold_until,greatest(now(),coalesce(new.customer_confirmed_at,new.delivered_at,now()))+interval '24 hours') where order_id=new.id;
 end if;
 return new;
end $$;
create trigger zz_goodies_settlement_order before insert or update on public.goodies_orders for each row execute function private.goodies_capture_settlement_order();

create function private.goodies_settlement_balance(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare earned numeric;pending numeric;reserved numeric;paid numeric;due numeric;exposure numeric;due_at timestamptz;credit numeric;
begin
 select coalesce(sum(i.earned) filter(where i.hold_until<=now()),0),coalesce(sum(i.earned) filter(where i.hold_until>now()),0),coalesce(sum(greatest(i.commission_due-i.cash_paid,0)),0),coalesce(sum(i.exposure_htg),0),min(i.hold_until+interval '7 days') filter(where i.commission_due>i.cash_paid),coalesce(sum(i.commission_credit),0) into earned,pending,due,exposure,due_at,credit from private.goodies_settlement_items(p_business) i;
 select coalesce(sum(amount) filter(where status in ('requested','processing')),0),coalesce(sum(amount) filter(where status='completed'),0) into reserved,paid from private.goodies_vendor_payouts where business_id=p_business;
 if exists(select 1 from unnest(array[earned,pending,reserved,paid,due,exposure,credit]) amount where amount::text in ('NaN','Infinity','-Infinity')) then raise exception 'Settlement requires financial review' using errcode='55000';end if;
 return jsonb_build_object('business_id',p_business,'wallet_ready',exists(select 1 from public.wallets where user_id=auth.uid()),'currency','USD','available',greatest(earned+credit-paid-reserved,0),'pending',pending,'reserved',reserved,'paid_out',paid,'recovery_due',greatest(paid+reserved-earned-credit,0),'commission_due',due,'commission_credit',credit,'cash_sales_htg',exposure,'cash_sales_limit_htg',5000,'settlement_due_at',due_at,'cash_paused',exposure>=5000 or coalesce(due_at<=now(),false),'hold_hours',24,'settlement_days',7);
end $$;
create function public.goodies_vendor_settlement_summary(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.goodies_settlement_assert(p_business);return private.goodies_settlement_balance(p_business);end $$;
create function public.goodies_vendor_settlement_ledger(p_business uuid,p_offset integer default 0,p_limit integer default 30,p_type text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.goodies_settlement_assert(p_business);
 if p_type is not null and p_type not in ('sale','fee','refund','payout','commission_payment') then raise exception 'Invalid ledger filter' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]') into result from (
 select * from (
  select 'order:'||i.order_id as id,i.order_code as label,case when o.payment_method='cash' and not i.cash_courier then 'fee' else 'sale' end as type,
  case when o.payment_method='cash' and not i.cash_courier then -(o.platform_commission_amount+o.service_fee+o.delivery_commission_amount) else o.vendor_net_amount+case when o.self_delivery or o.order_type='pickup' then o.courier_net_delivery_amount+o.tip else 0 end end as amount,
  case when o.status in ('cancelled','declined','expired') then 'reversed' when i.blocked then 'held' when o.status<>'completed' or i.hold_until>now() or i.cash_courier and i.earned=0 then 'pending' else 'posted' end as status,null::text as method,i.created_at,null::jsonb as details
  from private.goodies_settlement_items(p_business) i join public.goodies_orders o on o.id=i.order_id
  union all select 'refund:'||o.id,i.order_code,'refund',round(case when o.payment_method='cash' and not i.cash_courier then o.platform_commission_amount+o.service_fee+o.delivery_commission_amount else -(o.vendor_net_amount+case when o.self_delivery or o.order_type='pickup' then o.courier_net_delivery_amount+o.tip else 0 end) end*least(o.payment_refunded_amount,o.total)/nullif(o.total,0),2),'posted',null,coalesce(o.payment_refunded_at,o.updated_at),null::jsonb
  from private.goodies_settlement_items(p_business) i join public.goodies_orders o on o.id=i.order_id where o.payment_refunded_amount>0
  union all select p.id::text,'Goodies payout','payout',-p.amount,p.status,p.method,p.created_at,jsonb_build_object('eta_from',p.eta_from,'eta_to',p.eta_to,'receive_amount',p.payout_amount,'receive_currency',p.payout_currency) from private.goodies_vendor_payouts p where business_id=p_business
  union all select p.id::text,'Cash-order commission paid','commission_payment',p.amount,'completed','wal',p.created_at,null::jsonb from private.goodies_commission_payments p where business_id=p_business
 ) rows where p_type is null or rows.type=p_type or p_type='fee' and rows.type='commission_payment' order by created_at desc,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,30),1),100)
 ) x;
 return result;
end $$;
create function public.goodies_vendor_payout_options(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_settlement_assert(p_business);
 return jsonb_build_object('channels',(select jsonb_agg(to_jsonb(c) order by method) from private.goodies_payout_channels c),'rates',(select coalesce(jsonb_agg(jsonb_build_object('currency',r.to_currency,'rate',round(r.wantiss_rate,8)::text,'expires_at',r.expires_at)),'[]') from (select distinct on (to_currency) to_currency,wantiss_rate,expires_at from public.exchange_rates where from_currency='USD' and is_active and expires_at>now() and wantiss_rate>0 and wantiss_rate::text not in ('NaN','Infinity','-Infinity') order by to_currency,created_at desc,id desc)r),'cash_enabled',coalesce((select accept_cash_on_delivery from public.goodies_store_schedules where business_id=p_business limit 1),false),'destinations',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'method',method,'country',country,'masked',masked,'status',status,'usable',status='verified' and (method<>'bank' or exists(select 1 from private.goodies_bank_calendars cal where cal.country=goodies_payout_destinations.country and cal.reviewed_until>=(private.goodies_bank_arrival(now(),14,cal.country) at time zone private.goodies_bank_timezone(cal.country))::date))) order by created_at desc),'[]') from private.goodies_payout_destinations where business_id=p_business));
end $$;
create function public.goodies_register_payout_destination(p_business uuid,p_method text,p_country text,p_holder text,p_details jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare dest uuid;account text;
begin
 perform private.goodies_settlement_assert(p_business,true);
 if p_method not in ('moncash','natcash','gcash','bank') or p_country not in ('HT','PH','US') or (p_method in ('moncash','natcash') and p_country<>'HT') or (p_method='gcash' and p_country<>'PH') then raise exception 'Unsupported payout destination' using errcode='22023';end if;
 account:=regexp_replace(coalesce(p_details->>'account',''),'[ -]','','g');
 if p_method in ('moncash','natcash') then
  if account!~'^(\+?509)?[0-9]{8}$' then raise exception 'Invalid mobile wallet number' using errcode='22023';end if;account:='+509'||right(account,8);
 elsif p_method='gcash' then
  if account!~'^(\+?63|0)?9[0-9]{9}$' then raise exception 'Invalid mobile wallet number' using errcode='22023';end if;account:='+63'||right(account,10);
 end if;
 if account!~'^[+A-Za-z0-9]{6,40}$' or length(trim(coalesce(p_holder,''))) not between 2 and 120 or pg_column_size(p_details)>4000 or (p_method='bank' and (length(trim(coalesce(p_details->>'bank','')))<2 or length(trim(coalesce(p_details->>'routing','')))<4)) then raise exception 'Invalid payout destination' using errcode='22023';end if;
 insert into private.goodies_payout_destinations(business_id,owner_id,method,country,holder,account_details,masked) values(p_business,auth.uid(),p_method,p_country,trim(p_holder),jsonb_build_object('account',account,'bank',left(coalesce(p_details->>'bank',''),120),'routing',left(coalesce(p_details->>'routing',''),40)),right(account,4)) returning id into dest;
 insert into private.goodies_settlement_events(business_id,actor_id,action,resource_id) values(p_business,auth.uid(),'destination_registered',dest::text);
 return dest;
end $$;
create function private.goodies_bank_timezone(p_country text)
returns text language sql immutable set search_path='' as $$select case p_country when 'PH' then 'Asia/Manila' when 'US' then 'America/New_York' else 'America/Port-au-Prince' end$$;
create function private.goodies_bank_arrival(p_start timestamptz,p_days integer,p_country text)
returns timestamptz language plpgsql stable set search_path='' as $$
declare v_day date:=(p_start at time zone private.goodies_bank_timezone(p_country))::date;counted integer:=0;
begin
 while counted<p_days loop v_day:=v_day+1;if extract(isodow from v_day)<6 and not exists(select 1 from private.goodies_bank_holidays h where h.country=p_country and h.day=v_day) then counted:=counted+1;end if;end loop;
 return (v_day+time '17:00') at time zone private.goodies_bank_timezone(p_country);
end $$;
create function public.goodies_request_vendor_payout(p_business uuid,p_amount numeric,p_method text,p_destination uuid,p_key text,p_expected_receive numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing private.goodies_vendor_payouts%rowtype;dest private.goodies_payout_destinations%rowtype;summary jsonb;pid uuid;wallet_id uuid;eta1 timestamptz;eta2 timestamptz;fx numeric:=1;receive numeric;receive_currency text:='USD';fx_id uuid;
begin
 perform private.goodies_settlement_assert(p_business,true);
 if not exists(select 1 from public.businesses where id=p_business and verification='verified') then raise exception 'Verify your business before requesting payouts' using errcode='42501';end if;
 if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>round(p_amount,2) or length(coalesce(p_key,'')) not between 8 and 120 then raise exception 'Invalid payout request' using errcode='22023';end if;
 perform private.goodies_settlement_lock(p_business);
 select * into existing from private.goodies_vendor_payouts where business_id=p_business and idempotency_key=p_key;
 if found then
  if (p_expected_receive is not null and p_expected_receive is distinct from existing.payout_amount) or existing.amount<>p_amount or existing.method<>p_method or existing.destination_id is distinct from p_destination or existing.requested_by<>auth.uid() then raise exception 'Payout retry does not match' using errcode='22023';end if;
  return jsonb_build_object('id',existing.id,'status',existing.status,'eta_from',existing.eta_from,'eta_to',existing.eta_to,'receive_amount',existing.payout_amount,'receive_currency',existing.payout_currency);
 end if;
 if not exists(select 1 from private.goodies_payout_channels where method=p_method and enabled) then raise exception 'Payout method unavailable' using errcode='P4101';end if;
 summary:=public.goodies_vendor_settlement_summary(p_business);
 if p_amount>(summary->>'available')::numeric then raise exception 'Insufficient available earnings' using errcode='22023';end if;
 if p_method='wal' then
  if p_destination is not null then raise exception 'Invalid wallet destination' using errcode='22023';end if;
  select id into wallet_id from public.wallets where user_id=auth.uid() and balance::text not in ('NaN','Infinity','-Infinity') for update;
  if wallet_id is null then raise exception 'Create your Wantiss wallet first' using errcode='55000';end if;
  eta1:=now();eta2:=now();
 else
  select * into dest from private.goodies_payout_destinations where id=p_destination and business_id=p_business and owner_id=auth.uid() and method=p_method and status='verified';
  if not found then raise exception 'Verified payout destination required' using errcode='42501';end if;
  receive_currency:=case dest.country when 'HT' then 'HTG' when 'PH' then 'PHP' else 'USD' end;
  if receive_currency<>'USD' then
   select round(er.wantiss_rate,8),er.id into fx,fx_id from public.exchange_rates er where er.from_currency='USD' and er.to_currency=receive_currency and er.is_active and er.expires_at>now() and er.wantiss_rate>0 and er.wantiss_rate::text not in ('NaN','Infinity','-Infinity') order by er.created_at desc,er.id desc limit 1;
   if fx is null or fx<=0 then raise exception 'Payout exchange rate unavailable' using errcode='P4102';end if;
  end if;
  eta1:=case when p_method='bank' then private.goodies_bank_arrival(now(),7,dest.country) else now()+interval '2 days' end;
  eta2:=case when p_method='bank' then private.goodies_bank_arrival(now(),14,dest.country) else eta1 end;
  if p_method='bank' and not exists(select 1 from private.goodies_bank_calendars where country=dest.country and reviewed_until>=(eta2 at time zone private.goodies_bank_timezone(dest.country))::date) then raise exception 'Reviewed bank calendar required' using errcode='P4101';end if;
 end if;
 receive:=round(p_amount*fx,2);
 if p_expected_receive is not null and p_expected_receive is distinct from receive then raise exception 'Payout quote changed; reload before confirming' using errcode='P4103';end if;
 insert into private.goodies_vendor_payouts(business_id,requested_by,method,destination_id,amount,payout_currency,payout_amount,locked_rate,exchange_rate_id,status,idempotency_key,eta_from,eta_to) values(p_business,auth.uid(),p_method,p_destination,p_amount,receive_currency,receive,fx,fx_id,case when p_method='wal' then 'completed' else 'requested' end,p_key,eta1,eta2) returning id into pid;
 if p_method='wal' then
  update public.wallets set balance=balance+p_amount,updated_at=now() where id=wallet_id;
  insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata) values(auth.uid(),p_amount,'Goodies vendor payout','completed',p_amount,'USD','Goodies','goodies_vendor_payout','credit',pid::text,jsonb_build_object('business_id',p_business,'payout_id',pid));
 end if;
 insert into private.goodies_settlement_events(business_id,actor_id,action,resource_id,details) values(p_business,auth.uid(),case when p_method='wal' then 'payout_completed' else 'payout_requested' end,pid::text,jsonb_build_object('amount',p_amount,'method',p_method));
 return jsonb_build_object('id',pid,'status',case when p_method='wal' then 'completed' else 'requested' end,'eta_from',eta1,'eta_to',eta2,'receive_amount',receive,'receive_currency',receive_currency);
end $$;
create function public.goodies_pay_cash_commission(p_business uuid,p_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing private.goodies_commission_payments%rowtype;due numeric;wallet_id uuid;balance numeric;payment_id uuid;
begin
 perform private.goodies_settlement_assert(p_business,true);
 if length(coalesce(p_key,'')) not between 8 and 120 then raise exception 'Invalid payment request' using errcode='22023';end if;
 perform private.goodies_settlement_lock(p_business);
 select * into existing from private.goodies_commission_payments where business_id=p_business and idempotency_key=p_key;
 if found then
  if existing.payer_id<>auth.uid() then raise exception 'Not authorized' using errcode='42501';end if;
  return jsonb_build_object('id',existing.id,'amount',existing.amount,'status','completed');
 end if;
 select coalesce(sum(greatest(i.commission_due-i.cash_paid,0)),0) into due from private.goodies_settlement_items(p_business) i;
 if due<=0 then raise exception 'No commission is due' using errcode='22023';end if;
 select id,w.balance into wallet_id,balance from public.wallets w where user_id=auth.uid() for update;
 if wallet_id is null or balance::text in ('NaN','Infinity','-Infinity') or balance<due then raise exception 'Insufficient Wantiss wallet balance' using errcode='P4001';end if;
 insert into private.goodies_commission_payments(business_id,payer_id,amount,idempotency_key) values(p_business,auth.uid(),due,p_key) returning id into payment_id;
 update public.wallets set balance=wallets.balance-due,updated_at=now() where id=wallet_id;
 update private.goodies_order_settlements s set cash_paid=greatest(s.cash_paid,i.commission_due) from private.goodies_settlement_items(p_business) i where s.order_id=i.order_id and i.commission_due>i.cash_paid;
 insert into public.wallet_transactions(user_id,amount,description,status,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata) values(auth.uid(),due,'Goodies cash-order commission','completed',due,'USD','Goodies','goodies_cash_commission','debit',payment_id::text,jsonb_build_object('business_id',p_business,'commission_payment_id',payment_id));
 insert into private.goodies_settlement_events(business_id,actor_id,action,resource_id,details) values(p_business,auth.uid(),'commission_paid',payment_id::text,jsonb_build_object('amount',due));
 return jsonb_build_object('id',payment_id,'amount',due,'status','completed');
end $$;

create function public.goodies_admin_settlement_queue(p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_finance_assert();
 return jsonb_build_object(
 'channels',(select jsonb_agg(to_jsonb(c) order by method) from private.goodies_payout_channels c),
 'destinations',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select id,business_id,method,country,holder,masked,status,created_at from private.goodies_payout_destinations where status='pending' order by created_at,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),100))x),
 'payouts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select id,business_id,method,destination_id,amount,currency,payout_amount,payout_currency,status,eta_from,eta_to,created_at from private.goodies_vendor_payouts where method<>'wal' order by created_at desc,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),100))x),
 'cash_remittances',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select o.id,o.order_code,o.business_id,o.courier_id,o.total from public.goodies_orders o join private.goodies_order_settlements s on s.order_id=o.id where o.payment_method='cash' and o.status='completed' and not o.self_delivery and o.courier_id is not null and s.cash_received_at is null order by o.created_at,o.id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),100))x));
end $$;
create function public.goodies_admin_destination_details(p_destination uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.goodies_payout_destinations%rowtype;
begin
 perform private.goodies_finance_assert(true);
 if length(trim(coalesce(p_reason,'')))<10 then raise exception 'A reason is required' using errcode='22023';end if;
 select * into d from private.goodies_payout_destinations where id=p_destination;
 if not found then raise exception 'Destination not found' using errcode='P0002';end if;
 insert into private.goodies_settlement_events(business_id,actor_id,action,resource_id,details) values(d.business_id,auth.uid(),'destination_details_viewed',d.id::text,jsonb_build_object('reason',left(p_reason,500)));
 return jsonb_build_object('holder',d.holder,'country',d.country,'method',d.method,'details',d.account_details);
end $$;
create function public.goodies_admin_settlement_action(p_kind text,p_id uuid,p_decision text,p_reference text,p_reason text,p_amount numeric default null)
returns void language plpgsql security definer set search_path='' as $$
declare business uuid;p private.goodies_vendor_payouts%rowtype;d private.goodies_payout_destinations%rowtype;o public.goodies_orders%rowtype;
begin
 perform private.goodies_finance_assert(true);
 if length(trim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'A review reason is required' using errcode='22023';end if;
 if p_kind='destination' then
  select * into d from private.goodies_payout_destinations where id=p_id for update;
  if not found or p_decision not in ('verified','rejected') or d.status<>'pending' then raise exception 'Invalid destination decision' using errcode='22023';end if;
  business:=d.business_id;
  update private.goodies_payout_destinations set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 elsif p_kind='payout' then
  select business_id into business from private.goodies_vendor_payouts where id=p_id;
  if business is null then raise exception 'Payout not found' using errcode='P0002';end if;
  perform private.goodies_settlement_lock(business);
  select * into p from private.goodies_vendor_payouts where id=p_id for update;
  if p.method='wal' or not ((p.status='requested' and p_decision in ('processing','failed')) or (p.status='processing' and p_decision in ('completed','failed'))) then raise exception 'Invalid payout transition' using errcode='22023';end if;
  if p_decision='processing' and (not exists(select 1 from public.business_members where business_id=business and user_id=p.requested_by and role='owner') or not exists(select 1 from private.goodies_payout_destinations where id=p.destination_id and status='verified') or ((private.goodies_settlement_balance(business))->>'recovery_due')::numeric>0 or exists(select 1 from public.businesses where id=business and verification='restricted')) then raise exception 'Payout requires financial review' using errcode='55000';end if;
  if p.status='processing' and p_decision='failed' and length(trim(coalesce(p_reference,'')))<6 then raise exception 'Confirmed failure reference required' using errcode='22023';end if;
  if p_decision='completed' and (length(trim(coalesce(p_reference,'')))<6 or p_amount is distinct from p.payout_amount) then raise exception 'Verified transfer reference and exact amount required' using errcode='22023';end if;
  update private.goodies_vendor_payouts set status=p_decision,provider_reference=case when p_decision in ('completed','failed') and nullif(trim(p_reference),'') is not null then trim(p_reference) else provider_reference end,updated_at=now() where id=p_id;
 elsif p_kind='cash_remittance' then
  select * into o from public.goodies_orders where id=p_id;
  if not found or o.payment_method<>'cash' or o.status<>'completed' or o.self_delivery or o.courier_id is null or p_decision<>'received' or p_amount is distinct from o.total or length(trim(coalesce(p_reference,'')))<6 then raise exception 'Verified cash remittance required' using errcode='22023';end if;
  business:=o.business_id;perform private.goodies_settlement_lock(business);
  update private.goodies_order_settlements set cash_received_at=now(),cash_receipt_reference=trim(p_reference) where order_id=p_id and cash_received_at is null;
  if not found then raise exception 'Cash remittance already recorded or unavailable' using errcode='22023';end if;
 else raise exception 'Invalid settlement action' using errcode='22023';end if;
 insert into private.goodies_settlement_events(business_id,actor_id,action,resource_id,details) values(business,auth.uid(),p_kind||'_'||p_decision,p_id::text,jsonb_build_object('reason',p_reason,'reference',p_reference,'amount',p_amount));
end $$;
create function public.goodies_vendor_dashboard_range(p_business uuid,p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare summary jsonb;revenue numeric;gross numeric;fees numeric;refunds numeric;previous numeric;series jsonb;prior_series jsonb;span interval;
begin
 perform private.goodies_settlement_assert(p_business);
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>interval '370 days' then raise exception 'Invalid reporting period' using errcode='22023';end if;
 summary:=private.goodies_settlement_balance(p_business);span:=p_to-p_from+interval '1 day';
 select coalesce(sum(greatest(o.commissionable_subtotal*(1-least(o.payment_refunded_amount,o.total)/nullif(o.total,0)),0)),0),coalesce(sum(o.commissionable_subtotal),0),coalesce(sum(o.platform_commission_amount*(1-least(o.payment_refunded_amount,o.total)/nullif(o.total,0))),0),coalesce(sum(o.commissionable_subtotal*least(o.payment_refunded_amount,o.total)/nullif(o.total,0)),0) into revenue,gross,fees,refunds from public.goodies_orders o where o.business_id=p_business and o.status='completed' and o.created_at>=p_from and o.created_at<p_to+interval '1 day';
 select coalesce(sum(greatest(o.commissionable_subtotal*(1-least(o.payment_refunded_amount,o.total)/nullif(o.total,0)),0)),0) into previous from public.goodies_orders o where o.business_id=p_business and o.status='completed' and o.created_at>=p_from-span and o.created_at<p_from;
 select coalesce(jsonb_agg(jsonb_build_object('d',bucket::date,'v',amount) order by bucket),'[]') into series from (select date_trunc('day',o.created_at) as bucket,sum(greatest(o.commissionable_subtotal*(1-least(o.payment_refunded_amount,o.total)/nullif(o.total,0)),0)) amount from public.goodies_orders o where o.business_id=p_business and o.status='completed' and o.created_at>=p_from and o.created_at<p_to+interval '1 day' group by 1)x;
 select coalesce(jsonb_agg(jsonb_build_object('d',bucket::date,'v',amount) order by bucket),'[]') into prior_series from (select date_trunc('day',o.created_at) as bucket,sum(greatest(o.commissionable_subtotal*(1-least(o.payment_refunded_amount,o.total)/nullif(o.total,0)),0)) amount from public.goodies_orders o where o.business_id=p_business and o.status='completed' and o.created_at>=p_from-span and o.created_at<p_from group by 1)x;
 return summary||jsonb_build_object('business_id',p_business,'scope','goodies','revenue',revenue,'gross',gross,'fees',fees,'refunds',refunds,'prev_revenue',previous,'series',series,'prev_series',prior_series,'features',jsonb_build_array(jsonb_build_object('feature','goodies','amount',revenue)));
end $$;

create function public.goodies_admin_set_bank_calendar(p_country text,p_reviewed_until date,p_holidays date[],p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_finance_assert(true);
 if p_country not in ('HT','PH','US') or p_reviewed_until is null or p_reviewed_until<current_date+21 or p_reviewed_until>current_date+730 or length(trim(coalesce(p_reason,''))) not between 10 and 500 or cardinality(p_holidays)>100 or exists(select 1 from unnest(p_holidays) day where day is null or day>p_reviewed_until or day<current_date) then raise exception 'Invalid reviewed bank calendar' using errcode='22023';end if;
 delete from private.goodies_bank_holidays where country=p_country and day>=current_date;
 insert into private.goodies_bank_holidays(country,day) select p_country,day from unnest(p_holidays) day on conflict do nothing;
 insert into private.goodies_bank_calendars(country,reviewed_until,reviewed_by) values(p_country,p_reviewed_until,auth.uid()) on conflict(country) do update set reviewed_until=excluded.reviewed_until,reviewed_by=excluded.reviewed_by;
 insert into private.goodies_settlement_events(actor_id,action,resource_id,details) values(auth.uid(),'bank_calendar_reviewed',p_country,jsonb_build_object('reviewed_until',p_reviewed_until,'reason',p_reason));
end $$;

-- These controls deliberately require a separately approved operational activation.
create function public.goodies_admin_set_payout_channel(p_method text,p_enabled boolean,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_finance_assert(true);
 if p_method='wal' or length(trim(coalesce(p_reason,'')))<10 then raise exception 'Invalid channel change' using errcode='22023';end if;
 update private.goodies_payout_channels set enabled=p_enabled where method=p_method;
 if not found then raise exception 'Payout method not found' using errcode='P0002';end if;
 insert into private.goodies_settlement_events(actor_id,action,resource_id,details) values(auth.uid(),'channel_updated',p_method,jsonb_build_object('enabled',p_enabled,'reason',p_reason));
end $$;
create function public.goodies_vendor_set_cash_acceptance(p_business uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_settlement_assert(p_business);if not exists(select 1 from public.business_members where business_id=p_business and user_id=auth.uid() and role in ('owner','admin')) or exists(select 1 from public.businesses where id=p_business and verification='restricted') then raise exception 'Not authorized' using errcode='42501';end if;perform private.goodies_settlement_lock(p_business);
 update public.goodies_store_schedules set accept_cash_on_delivery=p_enabled,updated_at=now() where business_id=p_business;
 if not found then raise exception 'Set up your Goodies store first' using errcode='55000';end if;
 insert into private.goodies_settlement_events(business_id,actor_id,action,details) values(p_business,auth.uid(),'cash_acceptance_updated',jsonb_build_object('enabled',p_enabled));
end $$;
create or replace function public.goodies_cash_on_delivery_available(p_store_id text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.goodies_cash_global_enabled() and s.accept_cash_on_delivery and s.is_live and (
 case when exists(select 1 from private.goodies_settlement_config where starts_at is not null) then
  exists(select 1 from private.goodies_settlement_config where enabled) and
  exists(select 1 from public.exchange_rates er where from_currency='USD' and to_currency='HTG' and is_active and expires_at>now() and wantiss_rate>0 and wantiss_rate::text not in ('NaN','Infinity','-Infinity'))
  and coalesce((select sum(i.exposure_htg) from private.goodies_settlement_items(s.business_id) i),0)<5000
  and not exists(select 1 from private.goodies_settlement_items(s.business_id) i where i.commission_due>i.cash_paid and i.hold_until+interval '7 days'<=now())
 else exists(select 1 from public.goodies_courier_presence cp join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved where cp.is_available and cp.accepts_cash_on_delivery and cp.updated_at>now()-interval '3 minutes' and not exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=cp.courier_id and a.status in ('offered','accepted','picked_up'))) end),false)
 from public.goodies_store_schedules s where s.store_id=p_store_id;
$$;
create function private.goodies_notify_settlement_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.business_id is not null and (new.action in ('commission_due','commission_due_soon','cash_remittance_received','payout_requested','payout_processing','payout_completed','payout_failed','commission_paid','destination_verified','destination_rejected')) then
  insert into public.notifications(user_id,title,body,notification_type,feature_name,destination,metadata)
  select bm.user_id,'Goodies settlement update',case when new.action='commission_due' then 'Your weekly Goodies commission settlement is due. Open payouts to review the amount.' when new.action='commission_due_soon' then 'Your weekly Goodies commission settlement is due within 24 hours.' when new.action='cash_remittance_received' then 'Courier cash remittance was confirmed. Open payouts to review your balance.' when new.action='payout_requested' then 'Your Goodies payout request was recorded. Open payouts to check its status.' when new.action='payout_completed' then 'Your Goodies payout is completed.' when new.action='payout_failed' then 'Your Goodies payout could not be completed. Open payouts to review it.' when new.action='commission_paid' then 'Your Goodies cash-order commission payment is completed.' else 'Your Goodies settlement details were updated. Open payouts to review them.' end,'goodies_vendor_settlement_'||new.action,'Goodies','business_goodies_payouts',jsonb_build_object('business_id',new.business_id,'page','payouts','settlement_event_id',new.id)
  from public.business_members bm where bm.business_id=new.business_id and bm.role='owner';
 end if;
 return new;
end $$;
create trigger goodies_settlement_notification after insert on private.goodies_settlement_events for each row execute function private.goodies_notify_settlement_event();
CREATE OR REPLACE FUNCTION public.goodies_require_cash_policy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_store_accepts boolean;
  v_courier_available boolean;
  v_payment_context text;
  v_global_method_enabled boolean;
  v_method_key text;
begin
  v_payment_context := coalesce(current_setting('app.goodies_payment_context', true), '');

  -- The shared order creator inserts a temporary cash placeholder. Wallet and
  -- Card wrappers set this transaction-local context before calling it.
  if v_payment_context in ('wallet', 'card')
     and lower(coalesce(new.payment_method, '')) = 'cash' then
    v_method_key := case when v_payment_context = 'wallet' then 'Wallet' else 'Card' end;
    select exists (
      select 1
        from public.wantiss_cms_content c
       where c.content_key = 'goodies.content'
         and c.locale = 'en'
         and c.status = 'published'
         and coalesce(c.payload #>> array['fees', 'pay', v_method_key], '0') in ('1', 'true', 'TRUE')
    ) into v_global_method_enabled;
    if not coalesce(v_global_method_enabled, false) then
      raise exception '% payments are disabled for Goodies.', v_method_key
        using errcode = 'P0001';
    end if;
    new.payment_method := v_payment_context;
    return new;
  end if;

  if v_payment_context = lower(coalesce(new.payment_method, ''))
     and v_payment_context in ('wallet', 'card') then
    return new;
  end if;

  if lower(coalesce(new.payment_method, '')) <> 'cash' then
    return new;
  end if;

  if not exists(select 1 from public.goodies_store_schedules where store_id=new.store_id and business_id=new.business_id) or not coalesce(public.goodies_cash_on_delivery_available(new.store_id),false) then
    raise exception 'Cash ordering is unavailable for this store' using errcode='P0001';
  end if;

  return new;
end
$function$;
create function private.goodies_audit_settlement_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.actor_id is not null and new.actor_id=auth.uid() and public.wantiss_has_permission('finance.approve','manage') then
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values(new.actor_id,'goodies_settlement_'||new.action,'goodies_settlement',new.resource_id,coalesce(new.details->>'reason','Verified Goodies settlement action'),new.details||jsonb_build_object('business_id',new.business_id));
 end if;
 return new;
end $$;
revoke all on function private.goodies_audit_settlement_event() from public,anon,authenticated;
create trigger goodies_settlement_admin_audit after insert on private.goodies_settlement_events for each row execute function private.goodies_audit_settlement_event();

create function private.goodies_own_driver_wait(p_order_id uuid)
returns integer language plpgsql stable security definer set search_path='' as $$
declare o public.goodies_orders%rowtype;start_at timestamptz;
begin
 select * into o from public.goodies_orders where id=p_order_id;
 if not found then return null;end if;
 select starts_at into start_at from private.goodies_settlement_config;
 if start_at is not null and o.created_at>=start_at and not exists(select 1 from public.goodies_delivery_assignments a where a.order_id=o.id and a.status='offered' and a.expires_at>now()) and not exists(
  select 1 from public.goodies_courier_presence cp join public.goodies_courier_roster cr on cr.courier_id=cp.courier_id and cr.is_approved
  where cp.is_available and cp.updated_at>now()-interval '3 minutes' and (o.payment_method<>'cash' or cp.accepts_cash_on_delivery and public.goodies_cash_global_enabled())
  and not exists(select 1 from public.goodies_delivery_assignments a where a.courier_id=cp.courier_id and a.status in ('offered','accepted','picked_up'))
 ) then return 0;end if;
 return greatest(0,ceil(extract(epoch from coalesce(o.ready_at,o.updated_at)+interval '20 minutes'-now()))::integer);
end $$;
create function public.goodies_vendor_dispatch_waits(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.business_members where business_id=p_business and user_id=auth.uid()) then raise exception 'Not authorized' using errcode='42501';end if;
 return jsonb_build_object('server_time',now(),'waits',(select coalesce(jsonb_object_agg(o.id,private.goodies_own_driver_wait(o.id)),'{}') from public.goodies_orders o where o.business_id=p_business and o.order_type='delivery' and o.status in ('ready','courier_assigned')));
end $$;

CREATE OR REPLACE FUNCTION public.goodies_assign_own_driver(p_order_id uuid, p_driver_name text, p_driver_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid(); v_o public.goodies_orders%rowtype;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.order_type <> 'delivery' then raise exception 'Delivery order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed to dispatch this order' using errcode='42501'; end if;
  if v_o.status not in ('ready','courier_assigned') then raise exception 'Order must be ready first' using errcode='P0001'; end if;
  if exists(select 1 from public.goodies_delivery_assignments a where a.order_id = p_order_id and a.status in ('accepted','picked_up','delivered')) then
    raise exception 'A courier already accepted this delivery' using errcode='P0001'; end if;
  if coalesce(private.goodies_own_driver_wait(v_o.id),1200)>0 then
    raise exception 'You can use your own driver if no courier accepts within 20 minutes' using errcode='P0001'; end if;
  if length(trim(coalesce(p_driver_name,''))) < 2 or length(regexp_replace(coalesce(p_driver_phone,''), '\D', '', 'g')) < 7 then
    raise exception 'Enter the driver name and phone number' using errcode='P0001'; end if;
  update public.goodies_delivery_assignments set status = 'cancelled', updated_at = now() where order_id = p_order_id and status = 'offered';
  update public.goodies_orders set self_delivery = true, self_driver_name = trim(p_driver_name), self_driver_phone = trim(p_driver_phone),
    courier_id = null, status = 'picked_up', picked_up_at = now(), updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, 'Your order is on its way',
    'The store is delivering order ' || v_o.order_code || ' with its own driver, ' || trim(p_driver_name) || '.', v_o.id, v_o.order_code, 'picked_up', null);
end $function$;
-- New financial copy uses a reserved prefix, so future settlement messages cannot bypass review.
do $$ declare definition text;begin
 select pg_get_functiondef('private.goodies_guard_content_publication()'::regprocedure) into definition;
 if position('if v_entry->>''id''=any(v_critical) then' in definition)=0 then raise exception 'Unexpected Goodies publication guard; review migration drift';end if;
 execute replace(definition,'if v_entry->>''id''=any(v_critical) then','if v_entry->>''id''=any(v_critical) or v_entry->>''id'' like ''lbl.settlement.%'' or v_entry->>''id'' like ''lbl.notification.goodies_vendor_settlement_%'' then');
end $$;

create table private.goodies_settlement_reminders(business_id uuid not null references public.businesses(id),due_at timestamptz not null,kind text not null check(kind in ('commission_due','commission_due_soon')),created_at timestamptz not null default now(),primary key(business_id,due_at,kind));
alter table private.goodies_settlement_reminders enable row level security;
revoke all on private.goodies_settlement_reminders from public,anon,authenticated;
create function private.goodies_send_settlement_reminders()
returns integer language plpgsql security definer set search_path='' as $$
declare account record;due_at timestamptz;due numeric;kind text;sent integer:=0;
begin
 if not exists(select 1 from private.goodies_settlement_config where enabled) then return 0;end if;
 for account in select business_id from private.goodies_vendor_accounts loop
  select min(i.hold_until+interval '7 days'),sum(greatest(i.commission_due-i.cash_paid,0)) into due_at,due from private.goodies_settlement_items(account.business_id) i where i.commission_due>i.cash_paid;
  if coalesce(due,0)>0 and due_at<=now()+interval '24 hours' then
   kind:=case when due_at<=now() then 'commission_due' else 'commission_due_soon' end;
   insert into private.goodies_settlement_reminders(business_id,due_at,kind) values(account.business_id,due_at,kind) on conflict do nothing;
   if found then
    insert into private.goodies_settlement_events(business_id,action,details) values(account.business_id,kind,jsonb_build_object('due_at',due_at));sent:=sent+1;
   end if;
  end if;
 end loop;
 return sent;
end $$;
revoke all on function private.goodies_send_settlement_reminders() from public,anon,authenticated;
do $$ begin
 if to_regnamespace('cron') is not null then perform cron.schedule('goodies-weekly-commission-reminders','15 * * * *','select private.goodies_send_settlement_reminders()');end if;
end $$;

-- Exact overload ACLs: no public defaults, anonymous access, client table writes or private helper calls.
do $$ declare r record;begin
 for r in select p.oid::regprocedure as signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and p.proname in ('goodies_settlement_assert','goodies_finance_assert','goodies_settlement_lock','goodies_settlement_items','goodies_capture_settlement_order','goodies_bank_arrival','goodies_bank_timezone','goodies_own_driver_wait','goodies_notify_settlement_event','goodies_settlement_balance')) or (n.nspname='public' and p.proname in ('goodies_vendor_settlement_summary','goodies_vendor_settlement_ledger','goodies_vendor_payout_options','goodies_register_payout_destination','goodies_request_vendor_payout','goodies_pay_cash_commission','goodies_admin_settlement_queue','goodies_admin_destination_details','goodies_admin_settlement_action','goodies_admin_set_payout_channel','goodies_vendor_set_cash_acceptance','goodies_vendor_dashboard_range','goodies_admin_set_bank_calendar','goodies_vendor_dispatch_waits')) loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 if r.nspname='public' then execute format('grant execute on function %s to authenticated',r.signature);end if;
 end loop;
end $$;
commit;
