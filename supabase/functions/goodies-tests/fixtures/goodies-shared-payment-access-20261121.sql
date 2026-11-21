-- Schema/permissions inspected on Wantiss, 21 November 2026; no production data.
create table public.stripe_customers(
 user_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text not null unique,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.user_payment_methods(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 stripe_customer_id text not null,stripe_payment_method_id text not null unique,
 type text not null default 'card' check(type='card'),brand text not null,
 last4 text not null check(last4~'^[0-9]{4}$'),
 expiry_month integer not null check(expiry_month between 1 and 12),expiry_year integer not null check(expiry_year>=0),
 is_default boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index user_payment_methods_one_default_per_user on public.user_payment_methods(user_id) where is_default;
create index user_payment_methods_user_id_idx on public.user_payment_methods(user_id);
alter table public.stripe_customers enable row level security;
alter table public.user_payment_methods enable row level security;
grant select on public.stripe_customers,public.user_payment_methods to authenticated;
grant insert on public.stripe_customers to authenticated;
grant all on public.stripe_customers,public.user_payment_methods,public.goodies_orders,public.goodies_card_refund_queue,public.business_members to service_role;
create policy "Users can insert their own Stripe customer" on public.stripe_customers for insert to authenticated with check((select auth.uid())=user_id);
create policy "Users can view their own Stripe customer" on public.stripe_customers for select to authenticated using(user_id=auth.uid());
create policy "Users can view their own payment methods" on public.user_payment_methods for select to authenticated using(user_id=auth.uid());
create policy user_payment_methods_own_delete on public.user_payment_methods for delete to authenticated using(user_id=auth.uid());
create function public.get_my_payment_methods()
returns table(id uuid,type text,brand text,last4 text,expiry_month integer,expiry_year integer,is_default boolean,created_at timestamptz)
language plpgsql security definer set search_path=public
as $$begin
 if auth.uid() is null then raise exception 'Not authenticated';end if;
 return query select pm.id,pm.type,pm.brand,pm.last4,pm.expiry_month,pm.expiry_year,pm.is_default,pm.created_at
 from public.user_payment_methods pm where pm.user_id=auth.uid() order by pm.is_default desc,pm.created_at desc;
end;$$;
revoke all on function public.get_my_payment_methods() from public,anon;
grant execute on function public.get_my_payment_methods() to authenticated,service_role;
