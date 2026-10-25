create table if not exists public.goodies_builder_configs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  builder_id text not null check (length(trim(builder_id)) between 1 and 120),
  config jsonb not null check (jsonb_typeof(config)='object'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,builder_id)
);
create index if not exists goodies_builder_configs_business_enabled_idx on public.goodies_builder_configs(business_id,enabled);
alter table public.goodies_builder_configs enable row level security;
drop policy if exists "Business members manage Goodies builders" on public.goodies_builder_configs;
create policy "Business members manage Goodies builders" on public.goodies_builder_configs
  for all to authenticated
  using (exists(select 1 from public.business_members bm where bm.business_id=goodies_builder_configs.business_id and bm.user_id=(select auth.uid())))
  with check (exists(select 1 from public.business_members bm where bm.business_id=goodies_builder_configs.business_id and bm.user_id=(select auth.uid())));
drop policy if exists "Live Goodies builders are readable" on public.goodies_builder_configs;
create policy "Live Goodies builders are readable" on public.goodies_builder_configs
  for select to authenticated
  using (
    (enabled and exists(select 1 from public.goodies_store_schedules gs where gs.business_id=goodies_builder_configs.business_id and gs.is_live=true))
    or exists(select 1 from public.business_members bm where bm.business_id=goodies_builder_configs.business_id and bm.user_id=(select auth.uid()))
  );


create or replace function public.validate_goodies_builder_line(p_business_id uuid,p_store_id text,p_line jsonb)
returns numeric language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_byo jsonb:=p_line->'byo'; v_builder jsonb; v_size jsonb; v_group jsonb; v_item jsonb;
  v_sel jsonb; v_selected jsonb; v_choice record; v_group_id text; v_builder_id text; v_selected_id text;
  v_price numeric; v_line_price numeric; v_q numeric; v_group_count integer; v_live_count integer;
  v_min integer; v_max integer; v_item_limit integer; v_same_count integer;
begin
  if jsonb_typeof(v_byo)<>'object' or v_byo->>'sid' is distinct from p_store_id then
    raise exception 'Invalid custom builder reference' using errcode='22023';
  end if;
  v_builder_id:=v_byo->>'bid';
  if p_line->>'id' is distinct from 'byo:'||v_builder_id then raise exception 'Invalid custom item reference' using errcode='22023'; end if;
  select config into v_builder from public.goodies_builder_configs
    where business_id=p_business_id and builder_id=v_builder_id and enabled=true;
  if not found or v_builder is null or coalesce((v_builder->>'enabled')::boolean,true)=false
     or coalesce((v_builder->>'available')::boolean,true)=false then
    raise exception 'This custom builder is no longer available' using errcode='P0001';
  end if;
  v_price:=coalesce(nullif(v_builder->>'base','')::numeric,0);
  if jsonb_array_length(coalesce(v_builder->'sizes','[]'::jsonb))>0 then
    v_size:=null;
    select value into v_size from jsonb_array_elements(coalesce(v_builder->'sizes','[]'::jsonb)) as sz(value)
      where value->>'id'=v_byo->>'size' limit 1;
    if v_size is null or coalesce((v_size->>'avail')::boolean,true)=false then raise exception 'Choose an available builder size' using errcode='P0001'; end if;
    v_price:=v_price+coalesce(nullif(v_size->>'add','')::numeric,0);
  end if;
  v_sel:=coalesce(v_byo->'sel','{}'::jsonb);
  for v_group in select value from jsonb_array_elements(coalesce(v_builder->'groups','[]'::jsonb)) as gr(value) loop
    v_group_id:=v_group->>'id';
    v_selected:=coalesce(v_sel->v_group_id,'[]'::jsonb);
    if jsonb_typeof(v_selected)<>'array' then raise exception 'Invalid custom builder choices' using errcode='22023'; end if;
    v_group_count:=jsonb_array_length(v_selected);
    v_min:=coalesce(nullif(v_group->>'min','')::integer,0);
    if coalesce((v_group->>'req')::boolean,false) or v_min>0 then v_min:=greatest(1,v_min); end if;
    v_max:=greatest(1,coalesce(nullif(v_group->>'max','')::integer,1));
    if v_group_count<v_min then raise exception 'Required custom choices are missing' using errcode='P0001'; end if;
    if v_group_count>v_max then raise exception 'Too many items in custom group' using errcode='P0001'; end if;
    v_live_count:=0;
    for v_choice in select value,ordinality from jsonb_array_elements(v_selected) with ordinality as ch(value,ordinality) loop
      v_selected_id:=v_choice.value #>> '{}';
      v_item:=null;
      select value into v_item from jsonb_array_elements(coalesce(v_group->'items','[]'::jsonb)) as bi(value)
        where value->>'id'=v_selected_id limit 1;
      if v_item is null or coalesce((v_item->>'avail')::boolean,true)=false then raise exception 'A selected custom ingredient is no longer available' using errcode='P0001'; end if;
      v_live_count:=v_live_count+1;
      select count(*) into v_same_count from jsonb_array_elements(v_selected) as selected(value) where selected.value #>> '{}'=v_selected_id;
      v_item_limit:=least(coalesce(nullif(v_group->>'me','')::integer,v_max),coalesce(nullif(v_item->>'max','')::integer,coalesce(nullif(v_group->>'me','')::integer,v_max)));
      if v_same_count>v_item_limit then raise exception 'Too many of one ingredient in this custom group' using errcode='P0001'; end if;
      if not coalesce((v_item->>'free')::boolean,false)
        and not (coalesce(v_group->>'kind','one')<>'one' and v_choice.ordinality<=coalesce(nullif(v_group->>'inc','')::integer,0)) then
        v_price:=v_price+coalesce(nullif(v_item->>'price','')::numeric,0);
      end if;
    end loop;
    if v_live_count<v_min then raise exception 'Required custom choices are missing' using errcode='P0001'; end if;
  end loop;
  v_line_price:=round(v_price,2);
  begin v_q:=(p_line->>'q')::numeric; exception when others then raise exception 'Invalid custom item quantity' using errcode='22023'; end;
  if v_q is null or v_q<1 or v_q>99 or v_q<>trunc(v_q) then raise exception 'Invalid custom item quantity' using errcode='22023'; end if;
  begin v_price:=(p_line->>'p')::numeric; exception when others then raise exception 'Invalid custom item price' using errcode='22023'; end;
  if abs(v_price-v_line_price)>0.01 then raise exception 'The custom item price changed. Rebuild it and review your cart.' using errcode='P0001'; end if;
  return v_line_price;
end $$;
revoke all on function public.validate_goodies_builder_line(uuid,text,jsonb) from public,anon,authenticated;

do $$
declare v_def text; v_before text;
begin
  v_def:=pg_get_functiondef('public.place_goodies_order(text,text,timestamp with time zone,jsonb,text,jsonb,numeric,numeric,numeric,numeric,numeric,numeric,text)'::regprocedure);
  v_before:=v_def;
  v_def:=replace(v_def,'  v_agg record;','  v_agg record; v_builder_price numeric;');
  v_def:=replace(v_def,
    $old$    if v_item ? 'byo' and jsonb_typeof(v_item -> 'byo') not in ('null') then
      raise exception 'Custom builder items are not available yet' using errcode = 'P0001';
    end if;$old$,
    $new$    if jsonb_typeof(v_item -> 'byo') = 'object' then
      v_builder_price := public.validate_goodies_builder_line(v_store.business_id, p_store_id, v_item);
      v_q := (v_item ->> 'q')::numeric;
      if v_q is null or v_q < 1 or v_q > 99 or v_q <> trunc(v_q) then raise exception 'Invalid cart line quantity' using errcode='22023'; end if;
      v_sum := v_sum + v_builder_price * v_q;
      continue;
    end if;$new$);
  v_def:=replace(v_def,
    'select (e ->> ''id'')::uuid as pid, sum((e ->> ''q'')::int) as qty from jsonb_array_elements(p_items) e group by 1',
    'select (e ->> ''id'')::uuid as pid, sum((e ->> ''q'')::int) as qty from jsonb_array_elements(p_items) e where (e ->> ''id'') ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' group by 1');
  if v_def=v_before or position('validate_goodies_builder_line' in v_def)=0 or position('where (e ->> ''id'') ~*' in v_def)=0 then
    raise exception 'Could not wire builder validation into place_goodies_order';
  end if;
  execute v_def;
end $$;
