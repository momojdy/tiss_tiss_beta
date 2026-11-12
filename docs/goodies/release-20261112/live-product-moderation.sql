CREATE OR REPLACE FUNCTION public.goodies_products_enforce_update_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_is_admin boolean := false;
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
  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    if not v_is_admin then raise exception 'Only Wantiss administrators can change product review metadata' using errcode = '42501'; end if;
  end if;
  new.review_status := 'approved';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $function$;
