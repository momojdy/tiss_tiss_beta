alter table public.qr_identity_records
  add column if not exists wallet_id uuid references public.wallets(id) on delete cascade;

update public.qr_identity_records q
set wallet_id = w.id
from public.wallets w
where q.qr_type = 'wallet_receive' and q.wallet_id is null and q.owner_user_id = w.user_id;

drop index if exists public.qr_identity_one_active_user_type;
create unique index if not exists qr_identity_one_active_buyer_type
  on public.qr_identity_records(owner_user_id, qr_type)
  where status = 'active' and owner_user_id is not null and qr_type = 'buyer_identity';
create unique index if not exists qr_identity_one_active_wallet
  on public.qr_identity_records(wallet_id)
  where status = 'active' and qr_type = 'wallet_receive' and wallet_id is not null;

alter table public.qr_identity_records drop constraint if exists qr_identity_owner_shape;
alter table public.qr_identity_records add constraint qr_identity_owner_shape check (
  (qr_type = 'buyer_identity' and owner_user_id is not null and business_id is null and wallet_id is null)
  or (qr_type = 'wallet_receive' and owner_user_id is not null and business_id is null and wallet_id is not null)
  or (qr_type = 'vendor_shop' and business_id is not null and owner_user_id is null and wallet_id is null)
);

create or replace function public.issue_wallet_receive_qr(p_wallet_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid(); v_owner uuid; v_token text; v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select w.user_id into v_owner from public.wallets w where w.id = p_wallet_id for update;
  if v_owner is null or v_owner <> v_user then raise exception 'Wallet access denied'; end if;
  update public.qr_identity_records set status = 'revoked', revoked_at = now(), updated_at = now()
    where wallet_id = p_wallet_id and qr_type = 'wallet_receive' and status = 'active';
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.qr_identity_records(qr_type, owner_user_id, wallet_id, token_hash)
    values ('wallet_receive', v_user, p_wallet_id, encode(extensions.digest(v_token, 'sha256'), 'hex'))
    returning id into v_id;
  return jsonb_build_object('id',v_id,'qr_type','wallet_receive','wallet_id',p_wallet_id,'token',v_token,'status','active','created_at',now());
end;
$function$;

create or replace function public.issue_qr_identity(p_qr_type text, p_business_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid(); v_token text; v_id uuid; v_business_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_qr_type not in ('buyer_identity','vendor_shop') then raise exception 'Use issue_wallet_receive_qr for wallet QR codes'; end if;
  if p_qr_type = 'vendor_shop' then
    if p_business_id is null or not exists (select 1 from public.business_members bm where bm.business_id = p_business_id and bm.user_id = v_user) then raise exception 'Business access required'; end if;
    v_business_id := p_business_id;
  else
    if p_business_id is not null then raise exception 'Buyer QR must not include a business'; end if;
    if not exists (select 1 from public.profiles p where p.id = v_user) then raise exception 'Buyer profile not found'; end if;
  end if;
  update public.qr_identity_records set status='revoked', revoked_at=now(), updated_at=now()
    where qr_type=p_qr_type and status='active'
      and ((p_qr_type='vendor_shop' and business_id=v_business_id) or (p_qr_type='buyer_identity' and owner_user_id=v_user));
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.qr_identity_records(qr_type,owner_user_id,business_id,token_hash)
    values(p_qr_type,case when p_qr_type='vendor_shop' then null else v_user end,v_business_id,encode(extensions.digest(v_token,'sha256'),'hex'))
    returning id into v_id;
  return jsonb_build_object('id',v_id,'qr_type',p_qr_type,'token',v_token,'status','active','created_at',now());
end;
$function$;

create or replace function public.resolve_qr_identity(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_q public.qr_identity_records%rowtype; v_result jsonb;
begin
  if p_token is null or length(p_token)<32 or length(p_token)>256 then return jsonb_build_object('valid',false); end if;
  select * into v_q from public.qr_identity_records
    where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='active' limit 1;
  if not found then return jsonb_build_object('valid',false); end if;
  if v_q.qr_type='vendor_shop' then
    select jsonb_build_object('valid',true,'qr_type',v_q.qr_type,'destination','vendor-shop','vendor_id',b.vendor_id,'shop_name',b.name)
      into v_result from public.businesses b where b.id=v_q.business_id and b.is_live=true and b.verification<>'restricted';
    if v_result is null then return jsonb_build_object('valid',false); end if;
  elsif v_q.qr_type='wallet_receive' then
    select jsonb_build_object('valid',true,'qr_type',v_q.qr_type,'destination','wallet-receive','wallet_id',w.id,
      'wantiss_number',p.wantiss_number,'display_name',coalesce(nullif(btrim(p.full_name),''),'Wantiss buyer'))
      into v_result from public.wallets w join public.profiles p on p.id=w.user_id where w.id=v_q.wallet_id and w.user_id=v_q.owner_user_id;
    if v_result is null then return jsonb_build_object('valid',false); end if;
  else
    select jsonb_build_object('valid',true,'qr_type',v_q.qr_type,'destination','buyer-profile','wantiss_number',p.wantiss_number,
      'display_name',coalesce(nullif(btrim(p.full_name),''),'Wantiss buyer'))
      into v_result from public.profiles p where p.id=v_q.owner_user_id;
  end if;
  update public.qr_identity_records set last_used_at=now() where id=v_q.id;
  return coalesce(v_result,jsonb_build_object('valid',false));
end;
$function$;

create unique index if not exists wallet_transactions_transfer_idempotency
  on public.wallet_transactions(reference_id)
  where activity_type='wallet_transfer' and direction='debit' and reference_id is not null;

create or replace function public.transfer_wallet_by_qr(p_recipient_token text,p_amount numeric,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_sender uuid := auth.uid(); v_q public.qr_identity_records%rowtype;
  v_sender_wallet public.wallets%rowtype; v_recipient_wallet public.wallets%rowtype;
  v_sender_tx uuid; v_recipient_tx uuid;
begin
  if v_sender is null then raise exception 'Authentication required'; end if;
  if p_request_id is null then raise exception 'Request ID is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  if exists(select 1 from public.wallet_transactions where reference_id=p_request_id::text and activity_type='wallet_transfer' and direction='debit') then
    return jsonb_build_object('ok',true,'duplicate',true,'request_id',p_request_id);
  end if;
  if p_amount is null or p_amount<=0 or p_amount>100000000 or round(p_amount,2)<>p_amount then raise exception 'Invalid transfer amount'; end if;
  if p_recipient_token is null or length(p_recipient_token)<32 or length(p_recipient_token)>256 then raise exception 'Invalid recipient QR'; end if;
  select * into v_q from public.qr_identity_records where token_hash=encode(extensions.digest(p_recipient_token,'sha256'),'hex')
    and status='active' and qr_type='wallet_receive' for share;
  if not found then raise exception 'Recipient wallet QR is invalid or revoked'; end if;
  select * into v_sender_wallet from public.wallets where user_id=v_sender;
  if not found then raise exception 'Sender wallet not found'; end if;
  select * into v_recipient_wallet from public.wallets where id=v_q.wallet_id;
  if not found or v_recipient_wallet.user_id<>v_q.owner_user_id then raise exception 'Recipient wallet no longer exists'; end if;
  if v_sender_wallet.id=v_recipient_wallet.id then raise exception 'You cannot transfer to your own wallet'; end if;
  perform 1 from public.wallets where id in (v_sender_wallet.id,v_recipient_wallet.id) order by id for update;
  select * into v_sender_wallet from public.wallets where id=v_sender_wallet.id;
  select * into v_recipient_wallet from public.wallets where id=v_recipient_wallet.id;
  if v_sender_wallet.balance<p_amount then raise exception 'Insufficient wallet balance'; end if;
  update public.wallets set balance=balance-p_amount,updated_at=now() where id=v_sender_wallet.id and balance>=p_amount;
  if not found then raise exception 'Insufficient wallet balance'; end if;
  update public.wallets set balance=balance+p_amount,updated_at=now() where id=v_recipient_wallet.id;
  insert into public.wallet_transactions(user_id,amount,wallet_amount,wallet_currency,status,description,feature_name,counterparty_user_id,activity_type,direction,reference_id,metadata)
    values(v_sender,p_amount,p_amount,'USD','completed','Wallet transfer sent','wallet',v_recipient_wallet.user_id,'wallet_transfer','debit',p_request_id::text,jsonb_build_object('recipient_wallet_id',v_recipient_wallet.id)) returning id into v_sender_tx;
  insert into public.wallet_transactions(user_id,amount,wallet_amount,wallet_currency,status,description,feature_name,counterparty_user_id,activity_type,direction,reference_id,metadata)
    values(v_recipient_wallet.user_id,p_amount,p_amount,'USD','completed','Wallet transfer received','wallet',v_sender,'wallet_transfer','credit',p_request_id::text,jsonb_build_object('sender_wallet_id',v_sender_wallet.id)) returning id into v_recipient_tx;
  return jsonb_build_object('ok',true,'duplicate',false,'request_id',p_request_id,'sender_transaction_id',v_sender_tx,'recipient_transaction_id',v_recipient_tx);
end;
$function$;

revoke all on function public.issue_wallet_receive_qr(uuid) from public,anon;
grant execute on function public.issue_wallet_receive_qr(uuid) to authenticated;
revoke all on function public.issue_qr_identity(text,uuid) from public,anon;
grant execute on function public.issue_qr_identity(text,uuid) to authenticated;
revoke all on function public.resolve_qr_identity(text) from public;
grant execute on function public.resolve_qr_identity(text) to anon,authenticated;
revoke all on function public.transfer_wallet_by_qr(text,numeric,uuid) from public,anon;
grant execute on function public.transfer_wallet_by_qr(text,numeric,uuid) to authenticated;
