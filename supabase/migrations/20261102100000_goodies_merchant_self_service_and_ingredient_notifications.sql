-- Goodies merchant self-service, cover photo, and ingredient review notifications.
alter table public.goodies_store_schedules add column if not exists cover_url text;

create or replace function public.goodies_save_store_cover(p_business uuid, p_cover_url text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = auth.uid() and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_cover_url is not null and (length(p_cover_url) > 2048 or p_cover_url !~ '^https://') then raise exception 'Invalid store cover photo URL'; end if;
  update public.goodies_store_schedules set cover_url = p_cover_url, updated_at = now() where business_id = p_business;
  if not found then raise exception 'Save your store setup before adding a cover photo'; end if;
  return true;
end $$;
revoke all on function public.goodies_save_store_cover(uuid,text) from public, anon;
grant execute on function public.goodies_save_store_cover(uuid,text) to authenticated;

-- Keep the existing prohibited-product protections, but do not place ordinary
-- permitted products into a moderation queue on insert or edit.
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
  return new;
end $$;

create or replace function public.goodies_products_enforce_update_moderation()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
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
end $$;

drop trigger if exists goodies_products_enforce_update_moderation on public.goodies_products;
create trigger goodies_products_enforce_update_moderation before update on public.goodies_products
for each row execute function public.goodies_products_enforce_update_moderation();

-- Notify Goodies reviewers and the requesting merchant from the same database
-- transaction as the ingredient request/review decision.
create or replace function public.goodies_ingredient_request_notifications()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_business_name text;
declare v_title text;
declare v_body text;
declare v_type text;
begin
  select b.name into v_business_name from public.businesses b where b.id = new.business_id;
  if tg_op = 'INSERT' then
    v_title := 'New Goodies ingredient request';
    v_body := coalesce(v_business_name, 'A merchant') || ' requested ' || new.name || ' for ' || new.builder || '.';
    insert into public.notifications (user_id, title, body, feature_name, notification_type, destination, metadata, read)
    select s.user_id, v_title, v_body, 'goodies', 'goodies_ingredient_request', 'goodiesIngredientRequests',
      jsonb_build_object('request_id', new.id, 'business_id', new.business_id, 'ingredient', new.name), false
    from public.wantiss_admin_staff s
    where s.status = 'active'
      and exists (select 1 from public.wantiss_admin_permission_grants g where g.staff_user_id = s.user_id and g.permission_key = 'goodies.requests' and g.access_level in ('view','edit') and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()));
  elsif new.status is distinct from old.status then
    v_title := case new.status when 'approved' then 'Ingredient request approved' when 'denied' then 'Ingredient request declined' when 'needs_info' then 'More information needed' else 'Ingredient request updated' end;
    v_body := case new.status when 'approved' then 'Your ingredient ' || new.name || ' was approved and added to the builder library.' when 'denied' then 'Your ingredient ' || new.name || ' was declined. ' || coalesce(new.review_note, '') when 'needs_info' then 'More information is needed for ' || new.name || '. ' || coalesce(new.review_note, '') else 'Your ingredient request was updated.' end;
    insert into public.notifications (user_id, title, body, feature_name, notification_type, destination, metadata, read)
    values (new.requested_by, v_title, v_body, 'goodies', 'goodies_ingredient_' || new.status, 'goodiesRequests',
      jsonb_build_object('request_id', new.id, 'business_id', new.business_id, 'ingredient', new.name, 'status', new.status, 'review_note', new.review_note), false);
  end if;
  return new;
end $$;
drop trigger if exists goodies_ingredient_request_notifications on public.goodies_ingredient_requests;
create trigger goodies_ingredient_request_notifications after insert or update of status on public.goodies_ingredient_requests
for each row execute function public.goodies_ingredient_request_notifications();
revoke all on function public.goodies_ingredient_request_notifications() from public, anon, authenticated;
