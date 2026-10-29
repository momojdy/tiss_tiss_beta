create or replace function public.transfer_wallet_by_qr(p_recipient_token text, p_amount numeric, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
 v_sender uuid := auth.uid();
 v_q public.qr_identity_records%rowtype;
 v_sender_wallet public.wallets%rowtype;
 v_recipient_wallet public.wallets%rowtype;
 v_sender_tx uuid;
 v_recipient_tx uuid;
begin
 if v_sender is null then raise exception 'Authentication required'; end if;
 if p_request_id is null then raise exception 'Request ID is required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 if exists(select 1 from public.wallet_transactions where reference_id=p_request_id::text and activity_type='wallet_transfer' and direction='debit') then
   if exists(select 1 from public.wallet_transactions where reference_id=p_request_id::text and activity_type='wallet_transfer' and direction='debit' and user_id=v_sender) then
     return jsonb_build_object('ok',true,'duplicate',true,'request_id',p_request_id);
   end if;
   raise exception 'This request ID has already been used';
 end if;
 if p_amount is null or p_amount<=0 or p_amount>100000000 or round(p_amount,2)<>p_amount then raise exception 'Invalid wallet transfer amount'; end if;
 if p_recipient_token is null or length(p_recipient_token)<32 or length(p_recipient_token)>256 then raise exception 'Invalid recipient QR'; end if;
 select * into v_q from public.qr_identity_records
 where token_hash=encode(extensions.digest(p_recipient_token,'sha256'),'hex') and status='active' and qr_type='wallet_receive' for share;
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

revoke all on function public.transfer_wallet_by_qr(text,numeric,uuid) from public, anon;
grant execute on function public.transfer_wallet_by_qr(text,numeric,uuid) to authenticated;
