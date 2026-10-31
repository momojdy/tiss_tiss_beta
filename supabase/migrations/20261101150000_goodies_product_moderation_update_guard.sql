-- Goodies product moderation hardening.
-- Vendor content edits return products to review; stock-only updates remain vendor-managed.
-- Catalogue visibility, store publication, and checkout all require an approved product.

create or replace function public.goodies_products_enforce_update_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_is_admin boolean := false;
begin
  -- Trusted backend operations without an end-user JWT remain available to workers.
  if auth.uid() is null then
    return new;
  end if;

  -- Admin review actions use the existing staff authorization gate.
  begin
    perform public.goodies_admin_assert();
    v_is_admin := true;
  exception
    when insufficient_privilege then
      v_is_admin := false;
  end;

  if v_is_admin then
    return new;
  end if;

  -- Vendors must never be able to write moderation decisions or review metadata.
  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Only Wantiss administrators can change product review status'
      using errcode = '42501';
  end if;

  -- Changes to customer-facing or restricted-product information require a fresh review.
  -- Inventory and display ordering remain editable without restarting moderation.
  if new.name is distinct from old.name
     or new.description is distinct from old.description
     or new.price is distinct from old.price
     or new.emoji is distinct from old.emoji
     or new.aisle is distinct from old.aisle
     or new.restriction is distinct from old.restriction
     or new.photo_url is distinct from old.photo_url then
    new.review_status := 'pending';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.is_available := false;
  elsif new.is_available
        and (new.review_status <> 'approved'
             or new.stock <= 0
             or new.restriction = 'alcohol') then
    raise exception 'Only approved, in-stock, permitted products can be made available'
      using errcode = '42501';
  end if;

  return new;
end
$function$;

revoke all on function public.goodies_products_enforce_update_moderation()
  from public, anon, authenticated;

drop trigger if exists goodies_products_enforce_update_moderation
  on public.goodies_products;
create trigger goodies_products_enforce_update_moderation
before update on public.goodies_products
for each row
execute function public.goodies_products_enforce_update_moderation();

-- Enforce approval in the database API, not only in the consumer's catalogue query.
drop policy if exists "Public can read products of live stores"
  on public.goodies_products;
create policy "Public can read products of live stores"
on public.goodies_products
for select to anon, authenticated
using (
  review_status = 'approved'
  and is_available = true
  and restriction <> 'alcohol'
  and exists (
    select 1
    from public.goodies_store_schedules gs
    where gs.business_id = goodies_products.business_id
      and gs.is_live = true
  )
);

-- Patch the current server-side checkout function conservatively. Fail closed if
-- the expected implementation has drifted rather than silently applying a partial fix.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  v_definition := pg_get_functiondef(
    'public.place_goodies_order(text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text,text)'::regprocedure
  );

  v_old := 'gp.business_id = v_store.business_id and gp.is_available;';
  if position(v_old in v_definition) = 0 then
    raise exception 'Could not locate Goodies product checkout lookup; migration stopped';
  end if;
  v_new := 'gp.business_id = v_store.business_id and gp.is_available and gp.review_status = ''approved'' and gp.restriction <> ''alcohol'' for update;';
  v_definition := replace(v_definition, v_old, v_new);

  v_old := 'where gp.id = v_agg.pid and gp.business_id = v_store.business_id and gp.is_available and gp.stock >= v_agg.qty;';
  if position(v_old in v_definition) = 0 then
    raise exception 'Could not locate Goodies atomic stock reservation; migration stopped';
  end if;
  v_new := 'where gp.id = v_agg.pid and gp.business_id = v_store.business_id and gp.is_available and gp.review_status = ''approved'' and gp.restriction <> ''alcohol'' and gp.stock >= v_agg.qty;';
  v_definition := replace(v_definition, v_old, v_new);

  execute v_definition;
end
$migration$;

-- A store cannot be published unless it has at least one approved, in-stock,
-- available product that is permitted for sale.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  v_definition := pg_get_functiondef(
    'public.goodies_set_store_live(uuid,boolean)'::regprocedure
  );

  v_old := 'p.business_id = p_business and p.is_available and p.stock > 0)';
  if position(v_old in v_definition) = 0 then
    raise exception 'Could not locate Goodies store publication product check; migration stopped';
  end if;
  v_new := 'p.business_id = p_business and p.is_available and p.stock > 0 and p.review_status = ''approved'' and p.restriction <> ''alcohol'')';
  v_definition := replace(v_definition, v_old, v_new);

  execute v_definition;
end
$migration$;
