begin;
-- Order/driver reviews are distinct from public.reviews, whose product_id points
-- to the general marketplace products table, not goodies_products.
create table public.goodies_order_reviews (
  order_id uuid not null references public.goodies_orders(id) on delete cascade,
  target text not null check(target in ('store','driver')),
  customer_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  courier_id uuid,
  rating integer not null check(rating between 1 and 5),
  comment text not null default '' check(char_length(comment)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(order_id,target)
);
create index goodies_order_reviews_business_created on public.goodies_order_reviews(business_id,created_at desc,order_id);
alter table public.goodies_order_reviews enable row level security;
revoke all on public.goodies_order_reviews from anon,authenticated;
grant select on public.goodies_order_reviews to authenticated;
grant all on public.goodies_order_reviews to service_role;
create or replace function private.goodies_review_admin_read() returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 perform public.goodies_admin_assert();return true;
 exception when insufficient_privilege then return false;
end $$;
revoke all on function private.goodies_review_admin_read() from public,anon;
grant execute on function private.goodies_review_admin_read() to authenticated;
create policy goodies_reviews_participant_read on public.goodies_order_reviews for select to authenticated
using(customer_id=(select auth.uid()) or courier_id=(select auth.uid())
 or private.goodies_merchant_can_operate(business_id)
 or (select private.goodies_review_admin_read()));

create or replace function public.goodies_submit_order_review(p_order_id uuid,p_target text,p_rating integer,p_comment text default '')
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.goodies_orders%rowtype;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_target is null or p_target not in ('store','driver') or p_rating is null or p_rating not between 1 and 5
   or char_length(coalesce(p_comment,''))>1000 then raise exception 'Invalid review' using errcode='22023';end if;
 select * into v_order from public.goodies_orders where id=p_order_id for share;
 if not found or v_order.customer_id<>v_uid then raise exception 'Not allowed' using errcode='42501';end if;
 if v_order.status<>'completed' then raise exception 'Complete the order before reviewing' using errcode='22023';end if;
 if p_target='driver' and (v_order.order_type='pickup' or (v_order.courier_id is null and not v_order.self_delivery)) then
   raise exception 'No driver to review' using errcode='22023';end if;
 insert into public.goodies_order_reviews(order_id,target,customer_id,business_id,courier_id,rating,comment)
 values(v_order.id,p_target,v_uid,v_order.business_id,case when p_target='driver' then v_order.courier_id end,p_rating,trim(coalesce(p_comment,'')))
 on conflict(order_id,target) do update set rating=excluded.rating,comment=excluded.comment,updated_at=now();
end $$;
revoke all on function public.goodies_submit_order_review(uuid,text,integer,text) from public,anon;
grant execute on function public.goodies_submit_order_review(uuid,text,integer,text) to authenticated;

create or replace function public.goodies_store_reviews(p_store_id text,p_offset integer default 0,p_limit integer default 20)
returns table(order_id uuid,rating integer,comment text,created_at timestamptz,is_mine boolean)
language sql stable security definer set search_path='' as $$
 select r.order_id,r.rating,r.comment,r.created_at,r.customer_id=auth.uid()
 from public.goodies_order_reviews r join public.goodies_store_schedules s on s.business_id=r.business_id
 where auth.uid() is not null and s.store_id=p_store_id and s.is_live and r.target='store'
 order by r.created_at desc,r.order_id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,20),1),100)
$$;
revoke all on function public.goodies_store_reviews(text,integer,integer) from public,anon;
grant execute on function public.goodies_store_reviews(text,integer,integer) to authenticated;

create or replace function public.goodies_store_review_summaries(p_business_ids uuid[])
returns table(business_id uuid,rating numeric,review_count bigint)
language sql stable security definer set search_path='' as $$
 select r.business_id,avg(r.rating),count(*) from public.goodies_order_reviews r
 where auth.uid() is not null and r.target='store' and r.business_id=any(p_business_ids)
 and exists(select 1 from public.goodies_store_schedules s where s.business_id=r.business_id and s.is_live)
 group by r.business_id
$$;
revoke all on function public.goodies_store_review_summaries(uuid[]) from public,anon;
grant execute on function public.goodies_store_review_summaries(uuid[]) to authenticated;

-- Keep preferences in the existing Wantiss settings record and merge only
-- Goodies keys. Existing settings/preferences remain untouched.
create or replace function public.goodies_set_notification_preference(p_kind text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_kind is null or p_kind not in ('orders','promos') or p_enabled is null then raise exception 'Invalid preference' using errcode='22023';end if;
 insert into public.user_settings(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 update public.user_settings set notification_preferences=coalesce(notification_preferences,'{}'::jsonb)||jsonb_build_object('goodies_'||p_kind,p_enabled),updated_at=now() where user_id=auth.uid();
end $$;
revoke all on function public.goodies_set_notification_preference(text,boolean) from public,anon;
grant execute on function public.goodies_set_notification_preference(text,boolean) to authenticated;

create or replace function private.goodies_notification_preference_filter()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_key text;
begin
 if lower(coalesce(new.feature_name,''))<>'goodies' then return new;end if;
 if new.notification_type in ('goodies_order','goodies_customer_order') then v_key:='goodies_orders';
 elsif new.notification_type in ('goodies_promo','goodies_promotion') then v_key:='goodies_promos';
 else return new;end if;
 if exists(select 1 from public.user_settings s where s.user_id=new.user_id and coalesce(s.notification_preferences->v_key,s.notification_preferences->(case when v_key='goodies_orders' then 'orders' else 'promotions' end))='false'::jsonb) then return null;end if;
 return new;
end $$;
revoke all on function private.goodies_notification_preference_filter() from public,anon,authenticated;
create trigger goodies_notification_preference_filter before insert on public.notifications
for each row execute function private.goodies_notification_preference_filter();

create or replace function public.update_my_business_info(p_business uuid,p_fields jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $function$
declare v_uid uuid:=auth.uid();v_start integer;v_existing_logo text;v_base text;v_prefix text;v_logo text;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not exists(select 1 from public.business_members bm where bm.business_id=p_business and bm.user_id=v_uid and bm.role in ('owner','admin')) then raise exception 'Not allowed' using errcode='42501';end if;
 if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise exception 'Invalid fields' using errcode='22023';end if;
 if p_fields ? 'name' and char_length(trim(coalesce(p_fields->>'name',''))) not between 2 and 160 then raise exception 'Business name must be between 2 and 160 characters' using errcode='22023';end if;
 if p_fields ? 'hours' and jsonb_typeof(p_fields->'hours')<>'object' then raise exception 'Invalid hours' using errcode='22023';end if;
 if p_fields ? 'delivery_modes' and jsonb_typeof(p_fields->'delivery_modes')<>'array' then raise exception 'Invalid delivery modes' using errcode='22023';end if;
 if p_fields ? 'scheduled_order_start_minutes' then
  v_start:=(p_fields->>'scheduled_order_start_minutes')::integer;
  if v_start is null or v_start<0 or v_start>1440 then raise exception 'Invalid scheduled order lead time' using errcode='22023';end if;
 end if;
 select logo_url into v_existing_logo from public.businesses where id=p_business for update;
 if not found then raise exception 'Business not found' using errcode='P0002';end if;
 if p_fields ? 'logo_url' then
  v_logo:=nullif(trim(p_fields->>'logo_url'),'');
  if v_logo is not null and v_logo is distinct from v_existing_logo then
   v_base:=regexp_replace(coalesce(auth.jwt()->>'iss',''),'/auth/v1/?$','');
   v_prefix:=v_base||'/storage/v1/object/public/listing-photos/'||p_business::text||'/logo/';
   if v_base='' or left(v_logo,length(v_prefix))<>v_prefix or not (lower(v_logo) like any(array['%.jpg','%.jpeg','%.png','%.webp'])) then
    raise exception 'Business logos must be uploaded to this business listing-photo folder' using errcode='42501';
   end if;
  end if;
 end if;
 if p_fields ? 'goodies_store_id' and nullif(p_fields->>'goodies_store_id','') is not null and not exists(select 1 from public.goodies_store_schedules gs where gs.business_id=p_business and gs.store_id=p_fields->>'goodies_store_id') then
  raise exception 'Choose a storefront belonging to this business' using errcode='42501';
 end if;
 update public.businesses b set
  goodies_store_id=case when p_fields ? 'goodies_store_id' then nullif(p_fields->>'goodies_store_id','') else b.goodies_store_id end,
  name=case when p_fields ? 'name' then trim(p_fields->>'name') else b.name end,
  description=case when p_fields ? 'description' then left(nullif(p_fields->>'description',''),1000) else b.description end,
  phone=case when p_fields ? 'phone' then left(nullif(p_fields->>'phone',''),32) else b.phone end,
  phone_country=case when p_fields ? 'phone_country' then left(nullif(p_fields->>'phone_country',''),4) else b.phone_country end,
  email=case when p_fields ? 'email' then left(nullif(p_fields->>'email',''),254) else b.email end,
  website=case when p_fields ? 'website' then left(nullif(p_fields->>'website',''),300) else b.website end,
  address=case when p_fields ? 'address' then left(nullif(p_fields->>'address',''),300) else b.address end,
  city=case when p_fields ? 'city' then left(nullif(p_fields->>'city',''),120) else b.city end,
  country=case when p_fields ? 'country' then left(nullif(p_fields->>'country',''),120) else b.country end,
  delivery_modes=case when p_fields ? 'delivery_modes' then array(select left(x,20) from jsonb_array_elements_text(p_fields->'delivery_modes') x) else b.delivery_modes end,
  hours=case when p_fields ? 'hours' then p_fields->'hours' else b.hours end,
  logo_url=case when p_fields ? 'logo_url' then v_logo else b.logo_url end,
  accept_scheduled_orders=case when p_fields ? 'accept_scheduled_orders' then coalesce((p_fields->>'accept_scheduled_orders')::boolean,false) else b.accept_scheduled_orders end,
  scheduled_order_start_minutes=case when p_fields ? 'scheduled_order_start_minutes' then v_start else b.scheduled_order_start_minutes end
 where b.id=p_business;
 perform public.goodies_sync_store_from_business(p_business);
end $function$;
revoke all on function public.update_my_business_info(uuid,jsonb) from public,anon;
grant execute on function public.update_my_business_info(uuid,jsonb) to authenticated;

commit;
