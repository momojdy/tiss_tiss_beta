-- Goodies ingredient request workflow: vendor photo, admin photo replacement, photo rules,
-- and an approved-ingredient library that vendors and admins pick from.

alter table public.goodies_ingredient_requests
  add column if not exists image_path text,
  add column if not exists admin_asset_key text,
  add column if not exists library_id text;

alter table public.goodies_ingredient_requests drop constraint if exists goodies_ingredient_requests_builder_check;
alter table public.goodies_ingredient_requests
  add constraint goodies_ingredient_requests_builder_check check (builder ~ '^[a-z0-9_-]{1,40}$');

create table if not exists public.goodies_library_ingredients (
  id text primary key,
  builder text not null check (builder ~ '^[a-z0-9_-]{1,40}$'),
  role text check (role is null or char_length(role) <= 80),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  asset_key text,
  request_id uuid references public.goodies_ingredient_requests(id) on delete set null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goodies_library_ingredients enable row level security;
drop policy if exists "Active library ingredients are readable" on public.goodies_library_ingredients;
create policy "Active library ingredients are readable" on public.goodies_library_ingredients
  for select to authenticated using (active);

create table if not exists public.goodies_ingredient_rules (
  id boolean primary key default true check (id),
  rules text not null check (char_length(rules) between 20 and 2000),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.goodies_ingredient_rules enable row level security;
insert into public.goodies_ingredient_rules (id, rules) values (true,
'Photo rules for ingredient requests:
1. Show only the ingredient, nothing else.
2. Top-down view, centered, on a plain white or transparent background.
3. Square image, at least 800 x 800 px, JPEG, PNG or WebP, under 5 MB.
4. Use your own photo. No logos, text, hands or packaging.
5. Pizza toppings: show the ingredient sliced or spread as it sits on a pizza. Burgers: show a single slice or layer.
Wantiss may replace your photo with one that fits the builder. Every ingredient needs approval before customers can see it.')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goodies-ingredient-requests', 'goodies-ingredient-requests', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Vendors upload ingredient request photos" on storage.objects;
create policy "Vendors upload ingredient request photos" on storage.objects for insert to authenticated
with check (
  bucket_id = 'goodies-ingredient-requests'
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp'])
  and exists (select 1 from public.business_members bm
    where bm.business_id::text = (storage.foldername(name))[1] and bm.user_id = (select auth.uid()) and bm.role in ('owner','admin'))
);
drop policy if exists "Vendors and reviewers read ingredient request photos" on storage.objects;
create policy "Vendors and reviewers read ingredient request photos" on storage.objects for select to authenticated
using (
  bucket_id = 'goodies-ingredient-requests'
  and (
    exists (select 1 from public.business_members bm
      where bm.business_id::text = (storage.foldername(name))[1] and bm.user_id = (select auth.uid()) and bm.role in ('owner','admin'))
    or public.wantiss_has_permission('goodies.requests', 'view')
  )
);

-- Vendor: submit (replaces the 5-argument version).
drop function if exists public.goodies_submit_ingredient_request(uuid, text, text, text, text);
create or replace function public.goodies_submit_ingredient_request(p_business uuid, p_name text, p_builder text, p_role text default null, p_note text default null, p_image_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_name text := btrim(coalesce(p_name,'')); v_builder text := lower(btrim(coalesce(p_builder,'')));
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'Enter an ingredient name (2 to 80 characters)' using errcode = 'P0001'; end if;
  if v_builder !~ '^[a-z0-9_-]{1,40}$' then raise exception 'Choose a builder' using errcode = 'P0001'; end if;
  if p_image_path is not null and p_image_path not like p_business::text || '/%' then raise exception 'Invalid photo' using errcode = 'P0001'; end if;
  if (select count(*) from public.goodies_ingredient_requests r where r.business_id = p_business and r.status in ('submitted','needs_info')) >= 20 then
    raise exception 'You have too many open requests. Wait for a review first.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.goodies_ingredient_requests r where r.business_id = p_business and r.status in ('submitted','needs_info') and lower(r.name) = lower(v_name) and r.builder = v_builder) then
    raise exception 'You already requested this ingredient' using errcode = 'P0001';
  end if;
  insert into public.goodies_ingredient_requests (business_id, requested_by, name, builder, role, note, image_path)
  values (p_business, v_uid, v_name, v_builder, nullif(left(btrim(coalesce(p_role,'')),80),''), nullif(left(btrim(coalesce(p_note,'')),500),''), nullif(btrim(coalesce(p_image_path,'')),''))
  returning id into v_id;
  return v_id;
end $$;

-- Vendor: list own requests (adds photo and library link).
drop function if exists public.goodies_list_ingredient_requests(uuid);
create or replace function public.goodies_list_ingredient_requests(p_business uuid)
returns table(id uuid, name text, builder text, role text, note text, status text, review_note text, created_at timestamptz, image_path text, library_id text)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from public.business_members bm where bm.business_id = p_business and bm.user_id = v_uid and bm.role in ('owner','admin')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query select r.id, r.name, r.builder, r.role, r.note, r.status, r.review_note, r.created_at, r.image_path, r.library_id
    from public.goodies_ingredient_requests r where r.business_id = p_business order by r.created_at desc limit 200;
end $$;

-- Vendor: approved ingredient library and photo rules.
create or replace function public.goodies_list_library_ingredients()
returns table(id text, builder text, role text, name text, asset_key text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  return query select l.id, l.builder, l.role, l.name, l.asset_key from public.goodies_library_ingredients l where l.active order by l.builder, l.name;
end $$;

create or replace function public.goodies_get_ingredient_rules()
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select rules into v from public.goodies_ingredient_rules where id;
  return coalesce(v, '');
end $$;

-- Admin: list requests with photos.
drop function if exists public.wantiss_admin_list_ingredient_requests(text);
create or replace function public.wantiss_admin_list_ingredient_requests(p_status text default null)
returns table(id uuid, business_id uuid, business_name text, name text, builder text, role text, note text, status text, review_note text, created_at timestamptz, reviewed_at timestamptz, image_path text, admin_asset_key text, library_id text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.wantiss_has_permission('goodies.requests','view') then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query select r.id, r.business_id, b.name::text, r.name, r.builder, r.role, r.note, r.status, r.review_note, r.created_at, r.reviewed_at, r.image_path, r.admin_asset_key, r.library_id
    from public.goodies_ingredient_requests r left join public.businesses b on b.id = r.business_id
    where p_status is null or r.status = p_status order by r.created_at desc limit 200;
end $$;

-- Admin: review. Approving adds the ingredient to the library (optionally with a replacement photo).
drop function if exists public.wantiss_admin_review_ingredient_request(uuid, text, text);
create or replace function public.wantiss_admin_review_ingredient_request(p_request_id uuid, p_status text, p_review_note text default null, p_admin_asset_key text default null, p_role text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.goodies_ingredient_requests%rowtype; v_slug text; v_id text; v_key text := nullif(btrim(coalesce(p_admin_asset_key,'')),''); v_role text := nullif(left(btrim(coalesce(p_role,'')),80),'');
begin
  if not public.wantiss_has_permission('goodies.requests','edit') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_status not in ('approved','denied','needs_info') then raise exception 'Invalid status' using errcode = 'P0001'; end if;
  if p_status in ('denied','needs_info') and char_length(btrim(coalesce(p_review_note,''))) < 3 then
    raise exception 'Add a short note for the vendor' using errcode = 'P0001';
  end if;
  if v_key is not null and not exists (select 1 from public.wantiss_cms_assets a where a.asset_key = v_key) then
    raise exception 'Photo not found in the asset library' using errcode = 'P0001';
  end if;
  select * into r from public.goodies_ingredient_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0001'; end if;

  if p_status = 'approved' then
    if r.library_id is null then
      v_slug := trim(both '_' from regexp_replace(lower(btrim(r.name)), '[^a-z0-9]+', '_', 'g'));
      if v_slug = '' then v_slug := substr(replace(r.id::text,'-',''),1,8); end if;
      v_id := r.builder || '.' || v_slug;
      if exists (select 1 from public.goodies_library_ingredients l where l.id = v_id) then v_id := v_id || '_' || substr(replace(r.id::text,'-',''),1,6); end if;
      insert into public.goodies_library_ingredients (id, builder, role, name, asset_key, request_id, created_by)
      values (v_id, r.builder, coalesce(v_role, r.role), r.name, v_key, r.id, auth.uid());
    else
      v_id := r.library_id;
      update public.goodies_library_ingredients set asset_key = coalesce(v_key, asset_key), role = coalesce(v_role, role), active = true, updated_at = now() where id = v_id;
    end if;
  else
    v_id := r.library_id;
    if v_id is not null then update public.goodies_library_ingredients set active = false, updated_at = now() where id = v_id; end if;
  end if;

  update public.goodies_ingredient_requests
    set status = p_status, review_note = nullif(left(btrim(coalesce(p_review_note,'')),500),''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now(),
        admin_asset_key = coalesce(v_key, admin_asset_key), library_id = v_id
    where id = p_request_id;
  return true;
end $$;

-- Admin: add or edit a library ingredient directly (no vendor request needed), or swap its photo later.
create or replace function public.wantiss_admin_save_library_ingredient(p_id text, p_builder text, p_role text, p_name text, p_asset_key text, p_active boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id text := nullif(btrim(coalesce(p_id,'')),''); v_name text := btrim(coalesce(p_name,'')); v_builder text := lower(btrim(coalesce(p_builder,''))); v_key text := nullif(btrim(coalesce(p_asset_key,'')),'');
begin
  if not public.wantiss_has_permission('goodies.requests','edit') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'Enter an ingredient name (2 to 80 characters)' using errcode = 'P0001'; end if;
  if v_builder !~ '^[a-z0-9_-]{1,40}$' then raise exception 'Choose a builder' using errcode = 'P0001'; end if;
  if v_key is not null and not exists (select 1 from public.wantiss_cms_assets a where a.asset_key = v_key) then
    raise exception 'Photo not found in the asset library' using errcode = 'P0001';
  end if;
  if v_id is null then
    v_id := v_builder || '.' || trim(both '_' from regexp_replace(lower(v_name), '[^a-z0-9]+', '_', 'g'));
    if exists (select 1 from public.goodies_library_ingredients l where l.id = v_id) then v_id := v_id || '_' || substr(md5(random()::text),1,6); end if;
  end if;
  insert into public.goodies_library_ingredients (id, builder, role, name, asset_key, active, created_by)
  values (v_id, v_builder, nullif(left(btrim(coalesce(p_role,'')),80),''), v_name, v_key, coalesce(p_active, true), auth.uid())
  on conflict (id) do update set builder = excluded.builder, role = excluded.role, name = excluded.name, asset_key = excluded.asset_key, active = excluded.active, updated_at = now();
  return v_id;
end $$;

create or replace function public.wantiss_admin_list_library_ingredients()
returns table(id text, builder text, role text, name text, asset_key text, active boolean, request_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.wantiss_has_permission('goodies.requests','view') then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query select l.id, l.builder, l.role, l.name, l.asset_key, l.active, l.request_id from public.goodies_library_ingredients l order by l.builder, l.name;
end $$;

-- Admin: edit the photo rules vendors see.
create or replace function public.wantiss_admin_set_ingredient_rules(p_rules text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.wantiss_has_permission('goodies.requests','edit') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_rules,''))) not between 20 and 2000 then raise exception 'Rules must be 20 to 2000 characters' using errcode = 'P0001'; end if;
  insert into public.goodies_ingredient_rules (id, rules, updated_by, updated_at) values (true, btrim(p_rules), auth.uid(), now())
  on conflict (id) do update set rules = excluded.rules, updated_by = excluded.updated_by, updated_at = now();
  return true;
end $$;

revoke all on function public.goodies_submit_ingredient_request(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.goodies_list_ingredient_requests(uuid) from public, anon;
revoke all on function public.goodies_list_library_ingredients() from public, anon;
revoke all on function public.goodies_get_ingredient_rules() from public, anon;
revoke all on function public.wantiss_admin_list_ingredient_requests(text) from public, anon;
revoke all on function public.wantiss_admin_review_ingredient_request(uuid, text, text, text, text) from public, anon;
revoke all on function public.wantiss_admin_save_library_ingredient(text, text, text, text, text, boolean) from public, anon;
revoke all on function public.wantiss_admin_list_library_ingredients() from public, anon;
revoke all on function public.wantiss_admin_set_ingredient_rules(text) from public, anon;
grant execute on function public.goodies_submit_ingredient_request(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.goodies_list_ingredient_requests(uuid) to authenticated;
grant execute on function public.goodies_list_library_ingredients() to authenticated;
grant execute on function public.goodies_get_ingredient_rules() to authenticated;
grant execute on function public.wantiss_admin_list_ingredient_requests(text) to authenticated;
grant execute on function public.wantiss_admin_review_ingredient_request(uuid, text, text, text, text) to authenticated;
grant execute on function public.wantiss_admin_save_library_ingredient(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.wantiss_admin_list_library_ingredients() to authenticated;
grant execute on function public.wantiss_admin_set_ingredient_rules(text) to authenticated;
