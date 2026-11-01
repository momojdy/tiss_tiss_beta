-- Depleting the final unit must not fail the checkout transaction.
-- Automatically hide an approved product when its stock reaches zero; vendors can re-enable it after restocking.
create or replace function public.goodies_products_enforce_update_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_is_admin boolean := false;
begin
  if auth.uid() is null then
    return new;
  end if;

  if coalesce(new.restriction, 'none') = 'alcohol'
     or concat_ws(' ', new.name, new.description) ~*
        '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\mbeer|bi[èe]re|\mwine|champagne|cocktail)' then
    raise exception 'Alcohol products are prohibited on Wantiss'
      using errcode = 'P0001';
  end if;

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

  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Only Wantiss administrators can change product review status'
      using errcode = '42501';
  end if;

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
  elsif new.is_available and new.stock <= 0 then
    new.is_available := false;
  elsif new.is_available and new.review_status <> 'approved' then
    raise exception 'Only approved, in-stock, permitted products can be made available'
      using errcode = '42501';
  end if;

  return new;
end
$function$;
