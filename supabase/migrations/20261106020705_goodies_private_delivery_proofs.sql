-- Additive private storage for future delivery evidence. Does not move or delete
-- existing public photos. See docs/goodies/RELEASE.md for coordinated rollout.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('goodies-delivery-proofs','goodies-delivery-proofs',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create or replace function private.goodies_can_access_delivery_proof(p_path text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $proof_access$
declare v_uid uuid := (select auth.uid()); v_order public.goodies_orders%rowtype; v_manager boolean;
begin
  if v_uid is null or p_path is null or p_write is null
     or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$' then return false; end if;
  select * into v_order from public.goodies_orders o
    where o.business_id::text=split_part(p_path,'/',1) and o.id::text=split_part(p_path,'/',2) and o.self_delivery;
  if not found then return false; end if;
  select exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id
    and bm.user_id=v_uid and bm.role in ('owner','admin')) into v_manager;
  if p_write then return v_manager and v_order.status='picked_up' and v_order.vendor_delivered_at is null; end if;
  if v_manager or (v_order.customer_id=v_uid and v_order.delivery_proof_url=p_path) then return true; end if;
  begin
    perform public.goodies_admin_assert();
    return v_order.delivery_proof_url=p_path;
  exception when insufficient_privilege then return false;
  end;
end $proof_access$;
revoke all on function private.goodies_can_access_delivery_proof(text,boolean) from public,anon;
grant execute on function private.goodies_can_access_delivery_proof(text,boolean) to authenticated;
create policy "Goodies delivery proof upload" on storage.objects for insert to authenticated
  with check(bucket_id='goodies-delivery-proofs' and private.goodies_can_access_delivery_proof(name,true));
create policy "Goodies delivery proof read" on storage.objects for select to authenticated
  using(bucket_id='goodies-delivery-proofs' and private.goodies_can_access_delivery_proof(name,false));

CREATE OR REPLACE FUNCTION public.goodies_self_delivery_mark_delivered(p_order_id uuid, p_proof_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid := auth.uid(); v_o public.goodies_orders%rowtype; v_path text; v_bucket text;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or not v_o.self_delivery then raise exception 'Order not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.business_members bm where bm.business_id = v_o.business_id and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode='42501'; end if;
  if v_o.status <> 'picked_up' or v_o.vendor_delivered_at is not null then raise exception 'This order cannot be marked delivered now' using errcode='P0001'; end if;
  v_path := trim(coalesce(p_proof_url, ''));
  v_bucket := 'goodies-delivery-proofs';
  -- Backward compatibility for existing official legacy clients. New clients
  -- store private object paths; arbitrary third-party URLs are never accepted.
  if left(v_path, length('https://ycbirmgppwavorwudlrv.supabase.co/storage/v1/object/public/listing-photos/'))
      = 'https://ycbirmgppwavorwudlrv.supabase.co/storage/v1/object/public/listing-photos/' then
    v_bucket := 'listing-photos';
    v_path := substring(v_path from length('https://ycbirmgppwavorwudlrv.supabase.co/storage/v1/object/public/listing-photos/') + 1);
    if v_path not like v_o.business_id::text || '/delivery-proofs/' || v_o.id::text || '-%'
       or v_path !~ '\.(jpg|jpeg|png|webp)$' then
      raise exception 'Upload a valid delivery photo for this order first' using errcode='22023';
    end if;
  elsif not private.goodies_can_access_delivery_proof(v_path, true)
      or split_part(v_path, '/', 2) <> v_o.id::text then
    raise exception 'Upload a valid delivery photo for this order first' using errcode='22023';
  end if;
  if not exists(select 1 from storage.objects ob where ob.bucket_id=v_bucket and ob.name=v_path) then
    raise exception 'Delivery photo upload has not been confirmed' using errcode='22023';
  end if;
  update public.goodies_orders set delivery_proof_url = trim(p_proof_url), vendor_delivered_at = now(),
    receipt_deadline_at = now() + interval '24 hours', updated_at = now() where id = p_order_id;
  perform public.goodies_order_notify(v_o.customer_id, 'Did you receive your order?',
    'The store says order ' || v_o.order_code || ' was delivered. Please confirm, or report a problem within 24 hours.', v_o.id, v_o.order_code, 'picked_up', null);
end $function$;

revoke all on function public.goodies_self_delivery_mark_delivered(uuid,text) from public,anon;
grant execute on function public.goodies_self_delivery_mark_delivered(uuid,text) to authenticated;
commit;
