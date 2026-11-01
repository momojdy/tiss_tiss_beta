-- Complete self-service publication for permitted Goodies products.
create or replace function public.goodies_products_default_pending_review()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and (
    coalesce(new.restriction, 'none') = 'alcohol'
    or concat_ws(' ', new.name, new.description) ~*
      '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)'
  ) then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode = 'P0001';
  end if;
  new.review_status := 'approved';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.is_available := coalesce(new.stock, 0) > 0;
  return new;
end $$;

create or replace function public.goodies_products_enforce_update_moderation()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_is_admin boolean := false;
declare v_content_changed boolean := false;
begin
  if auth.uid() is null then return new; end if;
  if coalesce(new.restriction, 'none') = 'alcohol'
     or concat_ws(' ', new.name, new.description) ~*
       '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)' then
    raise exception 'Alcohol products are prohibited on Wantiss' using errcode = 'P0001';
  end if;
  begin
    perform public.goodies_admin_assert();
    v_is_admin := true;
  exception when insufficient_privilege then
    v_is_admin := false;
  end;
  if not v_is_admin and (
    new.review_status is distinct from old.review_status
    or new.review_note is distinct from old.review_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
  ) then
    raise exception 'Only Wantiss administrators can change product review metadata' using errcode = '42501';
  end if;
  v_content_changed :=
    new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.price is distinct from old.price
    or new.emoji is distinct from old.emoji
    or new.aisle is distinct from old.aisle
    or new.restriction is distinct from old.restriction
    or new.photo_url is distinct from old.photo_url;
  if v_content_changed then
    new.review_status := 'approved';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.is_available := coalesce(new.stock, 0) > 0;
  elsif new.is_available and coalesce(new.stock, 0) <= 0 then
    raise exception 'An out-of-stock product cannot be made available' using errcode = '42501';
  end if;
  return new;
end $$;

update public.goodies_products
set review_status = 'approved',
    review_note = null,
    reviewed_by = null,
    reviewed_at = null,
    is_available = (stock > 0),
    updated_at = now()
where review_status = 'pending'
  and coalesce(restriction, 'none') <> 'alcohol'
  and not (concat_ws(' ', name, description) ~*
    '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)');
