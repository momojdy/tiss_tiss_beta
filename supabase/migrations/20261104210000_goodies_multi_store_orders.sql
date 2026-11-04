-- Phase 5: one order with several store stops.
-- A parent "order group" wraps one normal Goodies order per store (a stop), placed in ONE transaction
-- (all stops are created and paid, or none). Each stop keeps today's accept / decline / prepare flow,
-- so a store that declines or does not answer only affects its own stop and its own refund.
create table if not exists public.goodies_order_groups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  order_type text not null default 'delivery',
  stop_count integer not null check (stop_count between 1 and 8),
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  service_fee numeric not null default 0,
  tip numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null,
  created_at timestamptz not null default now()
);
alter table public.goodies_order_groups enable row level security;
drop policy if exists "customers read own order groups" on public.goodies_order_groups;
create policy "customers read own order groups" on public.goodies_order_groups for select using ((select auth.uid()) = customer_id);
grant select on public.goodies_order_groups to authenticated;

alter table public.goodies_orders
  add column if not exists parent_id uuid references public.goodies_order_groups(id) on delete set null,
  add column if not exists stop_index integer;
create index if not exists goodies_orders_parent_idx on public.goodies_orders(parent_id) where parent_id is not null;

-- Let the wrapper place secondary stops without charging the service fee again and keep the
-- "first order free delivery" decision identical for every stop. Both flags are transaction-local
-- settings that only the wrapper below sets.
do $patch$
declare v_def text; v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'place_goodies_order';
  v_new := replace(v_def,
    'select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid) into v_first_order;',
    'if nullif(current_setting(''app.goodies_group_first_order'', true), '''') is not null then v_first_order := current_setting(''app.goodies_group_first_order'', true)::boolean; else select not exists(select 1 from public.goodies_orders o where o.customer_id=v_uid) into v_first_order; end if;');
  if v_new = v_def then raise exception 'place_goodies_order first-order patch did not apply'; end if;
  v_def := v_new;
  v_new := replace(v_def,
    'if abs(p_service_fee-v_expected_service_fee)>0.005 then',
    'if current_setting(''app.goodies_group_waive_service_fee'', true) = ''on'' then v_expected_service_fee := 0; end if; if abs(p_service_fee-v_expected_service_fee)>0.005 then');
  if v_new = v_def then raise exception 'place_goodies_order service-fee patch did not apply'; end if;
  execute v_new;
end $patch$;

create or replace function public.goodies_place_multi_order(
  p_idempotency_key text, p_payment_method text, p_order_type text, p_scheduled_for timestamptz,
  p_address jsonb, p_contact_phone text, p_stops jsonb, p_service_fee numeric, p_tip numeric, p_notes text)
returns table(group_id uuid, order_id uuid, order_code text, status text, stop_index integer, store_id text)
language plpgsql security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid(); v_content jsonb; v_max int := 3; v_n int; v_i int := 0; v_stop jsonb;
  v_group uuid; v_first boolean; v_seen text[] := '{}'; v_sid text; v_sub numeric; v_fee numeric;
  v_svc numeric; v_tip numeric; v_total numeric; v_addr jsonb; v_created record;
  v_sum_sub numeric := 0; v_sum_fee numeric := 0; v_sum_total numeric := 0;
begin
  if v_uid is null then raise exception 'Sign in to place an order' using errcode='28000'; end if;
  if p_payment_method not in ('wallet','cash') then raise exception 'Multi-store orders can be paid with your Wantiss Wallet or cash' using errcode='22023'; end if;
  if p_stops is null or jsonb_typeof(p_stops) <> 'array' then raise exception 'No stores in this order' using errcode='22023'; end if;
  v_n := jsonb_array_length(p_stops);
  select c.payload into v_content from public.wantiss_cms_content c
   where c.content_key = 'goodies.content' and c.status = 'published' and c.locale = 'en' order by c.version desc limit 1;
  begin v_max := greatest(1, least(8, coalesce(nullif(v_content->'fees'->>'maxStops','')::int, 3))); exception when others then v_max := 3; end;
  if v_n < 1 then raise exception 'No stores in this order' using errcode='22023'; end if;
  if v_n > v_max then raise exception 'You can order from up to % stores at once', v_max using errcode='P0001'; end if;
  if v_n > 1 and p_order_type <> 'delivery' then raise exception 'Ordering from several stores is available for delivery only' using errcode='22023'; end if;

  select not exists(select 1 from public.goodies_orders o where o.customer_id = v_uid) into v_first;
  perform set_config('app.goodies_group_first_order', v_first::text, true);

  insert into public.goodies_order_groups(customer_id, order_type, stop_count, payment_method)
    values (v_uid, p_order_type, v_n, p_payment_method) returning id into v_group;

  for v_stop in select * from jsonb_array_elements(p_stops) loop
    v_i := v_i + 1;
    v_sid := nullif(trim(v_stop->>'store_id'), '');
    if v_sid is null or v_sid = any(v_seen) then raise exception 'Each store can appear once in an order' using errcode='22023'; end if;
    v_seen := v_seen || v_sid;
    v_sub := coalesce(nullif(v_stop->>'subtotal','')::numeric, 0);
    v_fee := coalesce(nullif(v_stop->>'delivery_fee','')::numeric, 0);
    v_svc := case when v_i = 1 then coalesce(p_service_fee, 0) else 0 end;
    v_tip := case when v_i = 1 then coalesce(p_tip, 0) else 0 end;
    v_total := v_sub + v_fee + v_svc + v_tip;
    perform set_config('app.goodies_group_waive_service_fee', case when v_i = 1 then 'off' else 'on' end, true);
    v_addr := case when p_order_type = 'delivery' then (coalesce(p_address, '{}'::jsonb) || jsonb_build_object('delivery_quote_id', v_stop->>'delivery_quote_id')) else null end;
    select o.* into v_created from public.place_goodies_order_with_payment_once(
      p_idempotency_key || '-s' || v_i, p_payment_method, v_sid, p_order_type, p_scheduled_for, v_addr, p_contact_phone,
      v_stop->'items', v_sub, v_fee, v_svc, 0, v_tip, v_total, p_notes, null) o limit 1;
    update public.goodies_orders as go set parent_id = v_group, stop_index = v_i where go.id = v_created.id and go.customer_id = v_uid;
    v_sum_sub := v_sum_sub + v_sub; v_sum_fee := v_sum_fee + v_fee; v_sum_total := v_sum_total + v_total;
    group_id := v_group; order_id := v_created.id; order_code := v_created.order_code; status := v_created.status; stop_index := v_i; store_id := v_sid;
    return next;
  end loop;
  update public.goodies_order_groups as g set subtotal = v_sum_sub, delivery_fee = v_sum_fee, service_fee = coalesce(p_service_fee, 0),
    tip = coalesce(p_tip, 0), total = v_sum_total where g.id = v_group;
  perform set_config('app.goodies_group_waive_service_fee', 'off', true);
  perform set_config('app.goodies_group_first_order', '', true);
end $$;

revoke all on function public.goodies_place_multi_order(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,text) from public, anon;
grant execute on function public.goodies_place_multi_order(text,text,text,timestamptz,jsonb,text,jsonb,numeric,numeric,text) to authenticated;

-- tiss-admin: how many stores one order may include.
create or replace function public.goodies_admin_update_max_stops(p_max_stops integer)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.wantiss_cms_content%rowtype;
begin
  perform public.goodies_admin_assert();
  if p_max_stops is null or p_max_stops < 1 or p_max_stops > 8 then raise exception 'Choose a number from 1 to 8' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en', 0));
  select * into v_row from public.wantiss_cms_content
   where content_key = 'goodies.content' and locale = 'en' and status = 'published' order by version desc limit 1 for update;
  if not found then raise exception 'Published Goodies CMS content not found' using errcode='P0002'; end if;
  update public.wantiss_cms_content
     set payload = jsonb_set(v_row.payload, '{fees}', coalesce(v_row.payload->'fees', '{}'::jsonb) || jsonb_build_object('maxStops', p_max_stops), true), updated_at = now()
   where id = v_row.id;
end $$;
revoke all on function public.goodies_admin_update_max_stops(integer) from public, anon;
grant execute on function public.goodies_admin_update_max_stops(integer) to authenticated;
