-- Approved Goodies configuration operation, not a schema migration.
-- Run only through the privileged deployment connection after local acceptance.
-- Existing orders are not backfilled or credited. The audit records the cutoff.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
do $activation$
declare
  content public.wantiss_cms_content%rowtype;
  settlement private.goodies_settlement_config%rowtype;
  funding private.goodies_shared_bill_config%rowtype;
  before_flags jsonb;
  opening_review jsonb;
  cutoff timestamptz;
begin
  if current_user not in ('postgres','supabase_admin') then
    raise exception 'Privileged deployment connection required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('goodies.configuration.activation',0));
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en',0));
  select * into strict settlement from private.goodies_settlement_config where singleton for update;
  select * into strict funding from private.goodies_shared_bill_config where singleton for update;
  select * into content from public.wantiss_cms_content
    where content_key='goodies.content' and locale='en' and status='published'
    order by version desc limit 1 for update;
  if not found then raise exception 'Published Goodies configuration required';end if;
  if coalesce(content.payload#>>'{fees,pay,Wallet}','false') not in ('true','1') then
    raise exception 'Wallet checkout must already be enabled';
  end if;
  if not exists(select 1 from storage.buckets where id='goodies-delivery-proofs'
    and not public and file_size_limit=10485760
    and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[])
    then raise exception 'Compatible private evidence bucket required';end if;
  if not exists(select 1 from private.goodies_payout_channels where method='wal' and enabled)
    or exists(select 1 from private.goodies_payout_channels where method<>'wal' and enabled)
    then raise exception 'Only Wantiss Wallet payouts may be enabled';end if;
  if settlement.starts_at is null then
    if exists(select 1 from private.goodies_order_settlements)
      or exists(select 1 from private.goodies_vendor_payouts)
      or exists(select 1 from private.goodies_commission_payments)
      or exists(select 1 from public.goodies_orders where
        payment_method='cash' or status='completed') then
      raise exception 'Historical settlement liabilities require reconciliation before activation';
    end if;
  end if;
  before_flags:=jsonb_build_object('shared_bill_wallet_enabled',funding.wallet_enabled,
    'settlement_enabled',settlement.enabled,'settlement_starts_at',settlement.starts_at,
    'private_delivery_proofs_enabled',coalesce(content.payload#>>'{fees,privateDeliveryProofs}'='true',false));
  if funding.wallet_enabled and settlement.enabled and settlement.starts_at is not null
    and coalesce(content.payload#>>'{fees,privateDeliveryProofs}'='true',false) then return;end if;
  cutoff:=coalesce(settlement.starts_at,transaction_timestamp());
  select jsonb_build_object('excluded_order_count',count(*),
    'excluded_gross_usd',coalesce(sum(total),0),'excluded_vendor_net_usd',coalesce(sum(vendor_net_amount),0),
    'historical_credit_created',false,'review_required',count(*)>0)
    into opening_review from public.goodies_orders where created_at<cutoff;
  update private.goodies_settlement_config set enabled=true,starts_at=cutoff where singleton;
  update private.goodies_shared_bill_config set wallet_enabled=true where singleton;
  update public.wantiss_cms_content set
    payload=jsonb_set(payload,'{fees}',coalesce(payload->'fees','{}'::jsonb)||jsonb_build_object('privateDeliveryProofs',true),true),
    updated_at=now()
    where id=content.id and payload#>>'{fees,privateDeliveryProofs}' is distinct from 'true';
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
    values(null,'goodies_wallet_and_private_proofs_activated','goodies_config','wallet-and-private-proofs',
      'Owner-approved backend activation; external payout integrations deferred; no historical financial credits',
      before_flags,jsonb_build_object('shared_bill_wallet_enabled',true,'settlement_enabled',true,
        'settlement_starts_at',cutoff,'private_delivery_proofs_enabled',true,
        'opening_review',opening_review,'payout_channels',jsonb_build_object('wal',true,'bank',false,'gcash',false,'moncash',false,'natcash',false),
        'operation','supabase/operations/goodies-activate-wallet-and-private-proofs.sql'));
end $activation$;
commit;
