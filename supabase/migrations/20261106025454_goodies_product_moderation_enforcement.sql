-- Product writes use the existing catalog table and ownership RLS. Restrict
-- client writable columns; moderation metadata remains server-controlled.
begin;
grant insert(business_id,name,description,price,emoji,stock,is_available,restriction,photo_url,photo_urls)
  on public.goodies_products to authenticated;
grant update(name,description,price,emoji,stock,is_available,restriction,photo_url,photo_urls,updated_at)
  on public.goodies_products to authenticated;
drop policy if exists "Business managers can insert products" on public.goodies_products;
create policy "Business managers can insert products" on public.goodies_products for insert to authenticated
  with check(private.goodies_merchant_can_operate(business_id));
drop policy if exists "Business managers can update products" on public.goodies_products;
create policy "Business managers can update products" on public.goodies_products for update to authenticated
  using(private.goodies_merchant_can_operate(business_id)) with check(private.goodies_merchant_can_operate(business_id));
drop policy if exists "Business managers can delete products" on public.goodies_products;
create policy "Business managers can delete products" on public.goodies_products for delete to authenticated
  using(private.goodies_merchant_can_operate(business_id));

create or replace function public.goodies_products_default_pending_review()
returns trigger language plpgsql set search_path='' as $moderation$
begin
  if coalesce(new.restriction,'none')='alcohol' or concat_ws(' ',new.name,new.description) ~*
    '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)' then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode='22023';
  end if;
  new.review_status:='pending';new.review_note:=null;new.reviewed_by:=null;new.reviewed_at:=null;
  return new;
end $moderation$;

create or replace function public.goodies_products_enforce_update_moderation()
returns trigger language plpgsql security definer set search_path='' as $moderation$
declare v_admin boolean:=false;
begin
  if coalesce(new.restriction,'none')='alcohol' or concat_ws(' ',new.name,new.description) ~*
    '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)' then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode='22023';
  end if;
  if auth.uid() is null then return new;end if;
  begin perform public.goodies_admin_assert();v_admin:=true;
  exception when insufficient_privilege then v_admin:=false;end;
  -- Preserve the administrator's actual decision instead of overwriting every
  -- update with approved/null review metadata.
  if v_admin then return new;end if;
  if new.review_status is distinct from old.review_status or new.review_note is distinct from old.review_note
    or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Only Wantiss administrators can change product review metadata' using errcode='42501';
  end if;
  if new.name is distinct from old.name or new.description is distinct from old.description
    or new.photo_url is distinct from old.photo_url or new.photo_urls is distinct from old.photo_urls
    or new.restriction is distinct from old.restriction then
    new.review_status:='pending';new.review_note:=null;new.reviewed_by:=null;new.reviewed_at:=null;
  end if;
  if new.review_status<>'approved' then new.is_available:=false;end if;
  return new;
end $moderation$;
revoke all on function public.goodies_products_default_pending_review(), public.goodies_products_enforce_update_moderation() from public,anon,authenticated;
create or replace function public.goodies_admin_review_product(p_product_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path='' as $review$
declare v_before public.goodies_products%rowtype;
begin
  perform public.goodies_admin_assert();
  if p_status is null or p_status not in ('approved','rejected') then raise exception 'Invalid product review status' using errcode='22023';end if;
  if p_status='rejected' and nullif(trim(p_note),'') is null then raise exception 'A rejection reason is required' using errcode='22023';end if;
  select * into v_before from public.goodies_products where id=p_product_id for update;
  if not found then raise exception 'Product not found' using errcode='P0002';end if;
  if v_before.review_status=p_status and v_before.review_note is not distinct from left(nullif(trim(p_note),''),500) then return;end if;
  update public.goodies_products set review_status=p_status,review_note=left(nullif(trim(p_note),''),500),
    reviewed_by=auth.uid(),reviewed_at=now(),is_available=(p_status='approved'),updated_at=now() where id=p_product_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
    values(auth.uid(),'goodies_product_'||p_status,'goodies_product',p_product_id::text,coalesce(nullif(trim(p_note),''),'Product review'),
      jsonb_build_object('review_status',v_before.review_status),jsonb_build_object('review_status',p_status));
end $review$;
revoke all on function public.goodies_admin_review_product(uuid,text,text) from public,anon;
grant execute on function public.goodies_admin_review_product(uuid,text,text) to authenticated;
commit;
