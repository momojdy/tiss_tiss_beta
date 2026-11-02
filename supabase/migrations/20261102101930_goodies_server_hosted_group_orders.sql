create table public.goodies_group_orders (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  store_id text not null references public.goodies_store_schedules(store_id) on delete restrict,
  host_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'open' check (status in ('open','locked','checked_out','closed','expired')),
  max_members integer not null default 20 check (max_members between 2 and 50),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.goodies_group_order_members (
  group_id uuid not null references public.goodies_group_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('host','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);
create table public.goodies_group_order_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.goodies_group_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  line_key text not null,
  product_id uuid not null references public.goodies_products(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  options jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,user_id,line_key)
);
create index goodies_group_orders_host_created_idx on public.goodies_group_orders(host_user_id,created_at desc);
create index goodies_group_members_user_idx on public.goodies_group_order_members(user_id,joined_at desc);
create index goodies_group_items_group_idx on public.goodies_group_order_items(group_id,created_at);
alter table public.goodies_group_orders enable row level security;
alter table public.goodies_group_order_members enable row level security;
alter table public.goodies_group_order_items enable row level security;
grant select on public.goodies_group_orders, public.goodies_group_order_members, public.goodies_group_order_items to authenticated;
create policy "group members can read their group" on public.goodies_group_orders for select to authenticated
using (exists(select 1 from public.goodies_group_order_members m where m.group_id=goodies_group_orders.id and m.user_id=(select auth.uid())));
create policy "group members can read membership" on public.goodies_group_order_members for select to authenticated
using (exists(select 1 from public.goodies_group_order_members mine where mine.group_id=goodies_group_order_members.group_id and mine.user_id=(select auth.uid())));
create policy "group members can read contributed items" on public.goodies_group_order_items for select to authenticated
using (exists(select 1 from public.goodies_group_order_members m where m.group_id=goodies_group_order_items.group_id and m.user_id=(select auth.uid())));
create or replace function public.goodies_group_create(p_store_id text)
returns table(group_id uuid,invite_code text) language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_store public.goodies_store_schedules%rowtype; v_id uuid; v_code text; v_try integer:=0;
begin
 if v_uid is null then raise exception 'Sign in to start a group order' using errcode='28000'; end if;
 if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
 select * into v_store from public.goodies_store_schedules s where s.store_id=p_store_id and s.is_live=true;
 if not found then raise exception 'This store is not accepting orders' using errcode='P0001'; end if;
 loop
  v_code:=upper(substr(encode(gen_random_bytes(8),'hex'),1,10));
  begin
   insert into public.goodies_group_orders(invite_code,store_id,host_user_id) values(v_code,p_store_id,v_uid) returning id into v_id;
   exit;
  exception when unique_violation then v_try:=v_try+1; if v_try>=5 then raise exception 'Could not create a unique group code'; end if;
  end;
 end loop;
 insert into public.goodies_group_order_members(group_id,user_id,role) values(v_id,v_uid,'host');
 return query select v_id,v_code;
end; $$;
create or replace function public.goodies_group_join(p_invite_code text)
returns table(group_id uuid,invite_code text,store_id text,status text) language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_group public.goodies_group_orders%rowtype; v_count integer;
begin
 if v_uid is null then raise exception 'Sign in to join a group order' using errcode='28000'; end if;
 if not private.goodies_customer_can_access() then raise exception 'Your access to Goodies is restricted' using errcode='42501'; end if;
 select * into v_group from public.goodies_group_orders g where g.invite_code=upper(trim(coalesce(p_invite_code,''))) for update;
 if not found then raise exception 'That group code is invalid' using errcode='P0001'; end if;
 if v_group.status<>'open' or v_group.expires_at<=now() then raise exception 'This group order is no longer open' using errcode='P0001'; end if;
 select count(*) into v_count from public.goodies_group_order_members m where m.group_id=v_group.id;
 if not exists(select 1 from public.goodies_group_order_members m where m.group_id=v_group.id and m.user_id=v_uid) then
  if v_count>=v_group.max_members then raise exception 'This group order is full' using errcode='P0001'; end if;
  insert into public.goodies_group_order_members(group_id,user_id,role) values(v_group.id,v_uid,'member');
 end if;
 return query select v_group.id,v_group.invite_code,v_group.store_id,v_group.status;
end; $$;
create or replace function public.goodies_group_add_item(p_group_id uuid,p_product_id uuid,p_line_key text,p_quantity integer,p_options jsonb default '{}'::jsonb,p_note text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_group public.goodies_group_orders%rowtype; v_product public.goodies_products%rowtype; v_id uuid;
begin
 if v_uid is null then raise exception 'Sign in to add items' using errcode='28000'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>99 then raise exception 'Choose a quantity from 1 to 99' using errcode='22023'; end if;
 if p_line_key is null or length(p_line_key)<1 or length(p_line_key)>200 then raise exception 'Invalid item option key' using errcode='22023'; end if;
 if p_options is null or jsonb_typeof(p_options)<>'object' then raise exception 'Invalid item options' using errcode='22023'; end if;
 select * into v_group from public.goodies_group_orders g where g.id=p_group_id for update;
 if not found or v_group.status<>'open' or v_group.expires_at<=now() then raise exception 'This group order is no longer open' using errcode='P0001'; end if;
 if not exists(select 1 from public.goodies_group_order_members m where m.group_id=p_group_id and m.user_id=v_uid) then raise exception 'Join this group before adding items' using errcode='42501'; end if;
 select * into v_product from public.goodies_products p where p.id=p_product_id
 and p.business_id=(select s.business_id from public.goodies_store_schedules s where s.store_id=v_group.store_id)
 and p.is_available=true and p.review_status='approved' and p.stock>=p_quantity and coalesce(p.restriction,'')<>'alcohol'
 and not (concat_ws(' ',p.name,p.description) ~* '(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|beer|bi[èe]re|wine|champagne|cocktail)');
 if not found then raise exception 'This item is unavailable or does not have enough stock' using errcode='P0001'; end if;
 insert into public.goodies_group_order_items(group_id,user_id,line_key,product_id,quantity,options,note)
 values(p_group_id,v_uid,p_line_key,p_product_id,p_quantity,p_options,left(nullif(trim(p_note),''),500))
 on conflict(group_id,user_id,line_key) do update set quantity=excluded.quantity,options=excluded.options,note=excluded.note,updated_at=now()
 returning id into v_id;
 update public.goodies_group_orders set updated_at=now() where id=p_group_id;
 return v_id;
end; $$;
create or replace function public.goodies_group_remove_item(p_item_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in to remove items' using errcode='28000'; end if;
 delete from public.goodies_group_order_items i where i.id=p_item_id
 and (i.user_id=v_uid or exists(select 1 from public.goodies_group_order_members m where m.group_id=i.group_id and m.user_id=v_uid and m.role='host'))
 and exists(select 1 from public.goodies_group_orders g where g.id=i.group_id and g.status='open' and g.expires_at>now());
 return found;
end; $$;
create or replace function public.goodies_group_close(p_group_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in to close a group order' using errcode='28000'; end if;
 update public.goodies_group_orders set status='closed',updated_at=now() where id=p_group_id and host_user_id=v_uid and status='open';
 return found;
end; $$;
revoke all on function public.goodies_group_create(text) from public,anon;
revoke all on function public.goodies_group_join(text) from public,anon;
revoke all on function public.goodies_group_add_item(uuid,uuid,text,integer,jsonb,text) from public,anon;
revoke all on function public.goodies_group_remove_item(uuid) from public,anon;
revoke all on function public.goodies_group_close(uuid) from public,anon;
grant execute on function public.goodies_group_create(text) to authenticated;
grant execute on function public.goodies_group_join(text) to authenticated;
grant execute on function public.goodies_group_add_item(uuid,uuid,text,integer,jsonb,text) to authenticated;
grant execute on function public.goodies_group_remove_item(uuid) to authenticated;
grant execute on function public.goodies_group_close(uuid) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='goodies_group_orders') then alter publication supabase_realtime add table public.goodies_group_orders; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='goodies_group_order_members') then alter publication supabase_realtime add table public.goodies_group_order_members; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='goodies_group_order_items') then alter publication supabase_realtime add table public.goodies_group_order_items; end if;
end $$;
