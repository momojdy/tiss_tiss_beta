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
  select jsonb_build_object('valid',true,'qr_type',v_q.qr_type,'destination','wallet-receive',
   'wantiss_number',p.wantiss_number,'display_name',coalesce(nullif(btrim(p.full_name),''),'Wantiss buyer'))
  into v_result from public.wallets w join public.profiles p on p.id=w.user_id
  where w.id=v_q.wallet_id and w.user_id=v_q.owner_user_id;
  if v_result is null then return jsonb_build_object('valid',false); end if;
 else
  select jsonb_build_object('valid',true,'qr_type',v_q.qr_type,'destination','buyer-profile',
   'wantiss_number',p.wantiss_number,'display_name',coalesce(nullif(btrim(p.full_name),''),'Wantiss buyer'))
  into v_result from public.profiles p where p.id=v_q.owner_user_id;
 end if;
 update public.qr_identity_records set last_used_at=now() where id=v_q.id;
 return coalesce(v_result,jsonb_build_object('valid',false));
end;
$function$;

revoke all on function public.resolve_qr_identity(text) from public;
grant execute on function public.resolve_qr_identity(text) to anon, authenticated;
