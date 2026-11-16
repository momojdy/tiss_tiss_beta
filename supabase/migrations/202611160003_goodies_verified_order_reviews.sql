-- Goodies reviews: verified completed orders, unique per target, and moderated publication.
-- This migration does not insert review data or alter existing orders.
create table if not exists public.goodies_order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.goodies_orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  courier_id uuid references auth.users(id) on delete set null,
  review_target text not null check (review_target in ('store','courier')),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment)<=1000),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id,review_target),
  constraint goodies_review_courier_target check (review_target='store' or courier_id is not null)
);
create index if not exists goodies_order_reviews_store_index
  on public.goodies_order_reviews(business_id,review_status,created_at desc)
  where review_target='store';
create index if not exists goodies_order_reviews_courier_index
  on public.goodies_order_reviews(courier_id,review_status,created_at desc)
  where review_target='courier';

alter table public.goodies_order_reviews enable row level security;
revoke all on table public.goodies_order_reviews from public,anon,authenticated;
grant select on table public.goodies_order_reviews to authenticated;

create policy "Goodies customers read their submitted reviews"
on public.goodies_order_reviews for select to authenticated
using (customer_id=(select auth.uid()));

create policy "Goodies merchants read feedback for their business"
on public.goodies_order_reviews for select to authenticated
using (exists (
  select 1 from public.business_members m
   where m.business_id=goodies_order_reviews.business_id
     and m.user_id=(select auth.uid())
));

create or replace function public.goodies_submit_order_review(
  p_order_id uuid, p_review_target text, p_rating integer, p_comment text default ''
)
returns uuid language plpgsql security definer
set search_path to 'public','auth','pg_temp'
as $body$
declare
  v_uid uuid:=auth.uid(); v_order public.goodies_orders%rowtype;
  v_existing public.goodies_order_reviews%rowtype; v_review_id uuid;
  v_comment text:=trim(coalesce(p_comment,''));
begin
  if v_uid is null then raise exception 'Sign in to review a Goodies order' using errcode='28000'; end if;
  if p_review_target not in ('store','courier') or p_rating is null or p_rating not between 1 and 5
     or length(v_comment)>1000 then
    raise exception 'Choose a target, 1 to 5 stars, and a comment under 1000 characters' using errcode='22023';
  end if;
  select * into v_order from public.goodies_orders
   where id=p_order_id and customer_id=v_uid for share;
  if not found or v_order.status<>'completed' then
    raise exception 'Only a completed order that belongs to you can be reviewed' using errcode='42501';
  end if;
  if p_review_target='courier' and (v_order.order_type='pickup' or v_order.courier_id is null) then
    raise exception 'This order does not have a Wantiss courier to review' using errcode='22023';
  end if;
  select * into v_existing from public.goodies_order_reviews
   where order_id=p_order_id and review_target=p_review_target for update;
  if found then
    if v_existing.customer_id=v_uid and v_existing.rating=p_rating
       and v_existing.comment=v_comment then return v_existing.id; end if;
    raise exception 'This order has already been reviewed' using errcode='23505';
  end if;
  insert into public.goodies_order_reviews
    (order_id,customer_id,business_id,courier_id,review_target,rating,comment)
  values
    (v_order.id,v_uid,v_order.business_id,
     case when p_review_target='courier' then v_order.courier_id else null end,
     p_review_target,p_rating,v_comment)
  returning id into v_review_id;
  return v_review_id;
end;
$body$;

-- Public storefront receives only approved ratings and anonymous review text, never reviewer identity.
create or replace function public.goodies_public_store_review_stats(p_store_ids text[])
returns table(store_id text,rating numeric,review_count bigint)
language plpgsql security definer set search_path to 'public','pg_temp'
as $body$
begin
  if p_store_ids is null or coalesce(cardinality(p_store_ids),0)>100 then
    raise exception 'Choose up to 100 stores' using errcode='22023';
  end if;
  return query
  select gs.store_id,
         coalesce(round(avg(r.rating)::numeric,1),0) as rating,
         count(r.id) as review_count
    from public.goodies_store_schedules gs
    left join public.goodies_order_reviews r
      on r.business_id=gs.business_id and r.review_target='store'
     and r.review_status='approved'
   where gs.is_live and gs.store_id=any(p_store_ids)
   group by gs.store_id;
end;
$body$;

create or replace function public.goodies_public_store_reviews(p_store_id text)
returns table(rating integer,comment text,created_at timestamptz,author_label text)
language plpgsql security definer set search_path to 'public','pg_temp'
as $body$
begin
  return query
  select r.rating,r.comment,r.created_at,'Verified customer'::text
    from public.goodies_order_reviews r
    join public.goodies_store_schedules gs on gs.business_id=r.business_id
   where gs.store_id=p_store_id and gs.is_live and r.review_target='store'
     and r.review_status='approved'
   order by r.created_at desc limit 50;
end;
$body$;

create or replace function public.goodies_admin_list_reviews()
returns table(id uuid,order_id uuid,store_name text,review_target text,
              rating integer,comment text,review_status text,
              review_note text,created_at timestamptz)
language plpgsql security definer set search_path to 'public','auth','pg_temp'
as $body$
begin
  perform public.goodies_admin_assert();
  return query
  select r.id,r.order_id,coalesce(gs.store_name,'Store'),r.review_target,
         r.rating,r.comment,r.review_status,r.review_note,r.created_at
    from public.goodies_order_reviews r
    left join public.goodies_store_schedules gs on gs.business_id=r.business_id
   order by (r.review_status='pending') desc,r.created_at desc limit 300;
end;
$body$;

create or replace function public.goodies_admin_review_order_review(
  p_review_id uuid,p_status text,p_note text default null
)
returns void language plpgsql security definer
set search_path to 'public','auth','pg_temp'
as $body$
begin
  perform public.goodies_admin_assert();
  if p_status not in ('approved','rejected') then
    raise exception 'Invalid review decision' using errcode='22023';
  end if;
  if p_status='rejected' and nullif(trim(coalesce(p_note,'')),'') is null then
    raise exception 'Explain why the review was rejected' using errcode='22023';
  end if;
  update public.goodies_order_reviews
     set review_status=p_status,
         review_note=left(nullif(trim(coalesce(p_note,'')),''),500),
         reviewed_by=auth.uid(),reviewed_at=now()
   where id=p_review_id and review_status='pending';
  if not found then raise exception 'Review is missing or already moderated' using errcode='P0002'; end if;
end;
$body$;

revoke all on function public.goodies_submit_order_review(uuid,text,integer,text) from public,anon;
grant execute on function public.goodies_submit_order_review(uuid,text,integer,text) to authenticated;
revoke all on function public.goodies_public_store_review_stats(text[]) from public;
grant execute on function public.goodies_public_store_review_stats(text[]) to anon,authenticated;
revoke all on function public.goodies_public_store_reviews(text) from public;
grant execute on function public.goodies_public_store_reviews(text) to anon,authenticated;
revoke all on function public.goodies_admin_list_reviews() from public,anon;
grant execute on function public.goodies_admin_list_reviews() to authenticated;
revoke all on function public.goodies_admin_review_order_review(uuid,text,text) from public,anon;
grant execute on function public.goodies_admin_review_order_review(uuid,text,text) to authenticated;
