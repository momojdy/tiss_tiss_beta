-- Stop new funding/withdrawals/uploads while preserving cutoff, recovery, proof reads and all ledgers.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
do $pause$
declare content_id uuid;before_flags jsonb;
begin
  if current_user not in ('postgres','supabase_admin') then
    raise exception 'Privileged deployment connection required' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('goodies.configuration.activation',0));
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en',0));
  select id into content_id from public.wantiss_cms_content where content_key='goodies.content' and locale='en' and status='published' order by version desc limit 1 for update;
  if content_id is null then raise exception 'Published Goodies configuration required';end if;
  before_flags:=jsonb_build_object('shared_bill_wallet_enabled',public.help_pay_wallet_enabled(),
    'settlement_enabled',(select enabled from private.goodies_settlement_config where singleton),
    'settlement_starts_at',(select starts_at from private.goodies_settlement_config where singleton),
    'private_delivery_proofs_enabled',public.goodies_private_delivery_proof_uploads_enabled());
  update private.goodies_shared_bill_config set wallet_enabled=false where singleton;
  update private.goodies_settlement_config set enabled=false where singleton;
  update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees}',coalesce(payload->'fees','{}'::jsonb)||jsonb_build_object('privateDeliveryProofs',false),true),updated_at=now() where id=content_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
    values(null,'goodies_wallet_and_private_proofs_paused','goodies_config','wallet-and-private-proofs',
      'Deployment recovery pause; existing cancellation, refund, proof reads and all financial records preserved',
      before_flags,before_flags||jsonb_build_object('shared_bill_wallet_enabled',false,'settlement_enabled',false,'private_delivery_proofs_enabled',false));
end $pause$;
commit;
