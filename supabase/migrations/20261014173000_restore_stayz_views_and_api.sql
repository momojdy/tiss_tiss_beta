-- Restore Stayz data views and RPCs expected by src/screens/Stayz/stayzSupabaseApi.ts.
-- Booking payments are only accepted from the in-app wallet until a real card/mobile payment
-- provider confirms the charge; this migration deliberately does not fake external payments.

create or replace view public.stayz_listings_view
with (security_invoker = true)
as
select
  l.id,
  l.business_id,
  l.name as title,
  l.description,
  case
    when l.photos is null or l.photos = '[]'::jsonb then jsonb_build_array(
      case lower(coalesce(l.type,''))
        when 'resort' then 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85'
        when 'hotel' then 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85'
        when 'apartment' then 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85'
        when 'guesthouse' then 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=85'
        when 'villa' then 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85'
        else 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85'
      end
    )
    else l.photos
  end as photos,
  coalesce(l.published, false) as published,
  0::numeric as rating,
  0::integer as review_count,
  0::integer as stays,
  null::text as promo,
  coalesce(l.overnight_price, 0)::numeric as price,
  jsonb_build_object(
    'ptype', l.type,
    'address', l.location,
    'city', split_part(coalesce(l.location, ''), ',', 1),
    'country', case when position(',' in coalesce(l.location, '')) > 0
      then trim(substr(l.location, position(',' in l.location) + 1)) else 'Haiti' end,
    'lat', case
      when lower(coalesce(l.location,'')) like '%port-au-prince%' then 18.5944
      when lower(coalesce(l.location,'')) like '%cap-haïtien%' or lower(coalesce(l.location,'')) like '%cap-haitien%' then 19.7592
      when lower(coalesce(l.location,'')) like '%kenscoff%' then 18.448
      when lower(coalesce(l.location,'')) like '%arcadins%' then 18.95
      else 19.0 end,
    'lng', case
      when lower(coalesce(l.location,'')) like '%port-au-prince%' then -72.3074
      when lower(coalesce(l.location,'')) like '%cap-haïtien%' or lower(coalesce(l.location,'')) like '%cap-haitien%' then -72.1981
      when lower(coalesce(l.location,'')) like '%kenscoff%' then -72.28
      when lower(coalesce(l.location,'')) like '%arcadins%' then -72.72
      else -72.8 end,
    'photoCats', '[]'::jsonb,
    'modes', to_jsonb(array_remove(array[
      case when coalesce(l.hourly_price,0) > 0 then 'Hourly' end,
      case when coalesce(l.day_price,0) > 0 then 'Day use' end,
      case when coalesce(l.overnight_price,0) > 0 then 'Overnight' end,
      case when coalesce(l.extended_price,0) > 0 then 'Extended' end
    ], null)),
    'guests', 2, 'bedrooms', 1, 'baths', 1,
    'amenities', coalesce(l.amenities, '[]'::jsonb),
    'rooms', '[]'::jsonb,
    'hourly', case when coalesce(l.hourly_price,0) > 0
      then jsonb_build_array(jsonb_build_object('hours', 3, 'price', l.hourly_price)) else '[]'::jsonb end,
    'hrFrom', '08:00', 'hrUntil', '22:00',
    'dayUse', case when coalesce(l.day_price,0) > 0
      then jsonb_build_array(jsonb_build_object('from', '09:00', 'until', '17:00', 'price', l.day_price)) else '[]'::jsonb end,
    'price', coalesce(l.overnight_price, 0),
    'weekend', null, 'weekly', null, 'monthly', null,
    'minNights', 1, 'maxNights', null, 'breakfast', null, 'deposit', null,
    'cxAllowed', true, 'cxFree', 48, 'cxLate', 0, 'cxNote', null,
    'extOn', coalesce(l.extended_price, 0) > 0, 'extPrice', l.extended_price,
    'checkin', '15:00', 'checkout', '11:00',
    'rules', coalesce(l.rules, '{}'::jsonb), 'instant', false
  ) as attributes
from public.stayz_listings l
where l.published = true;

create or replace view public.stayz_reviews_view
with (security_invoker = true)
as
select r.id, r.reservation_id, r.listing_id, r.user_id, r.rating,
       r.text as body, r.created_at, 'Guest'::text as author
from public.stayz_reviews r;

grant select on public.stayz_listings to anon, authenticated;
grant select on public.stayz_reviews to anon, authenticated;
grant select on public.stayz_listings_view to anon, authenticated;
grant select on public.stayz_reviews_view to anon, authenticated;

drop policy if exists stayz_listings_public_read_anon on public.stayz_listings;
create policy stayz_listings_public_read_anon on public.stayz_listings
  for select to anon using (published = true);
drop policy if exists stayz_reviews_public_read_anon on public.stayz_reviews;
create policy stayz_reviews_public_read_anon on public.stayz_reviews
  for select to anon using (true);

create or replace function public.stayz_unavailable_listings(p_mode text, p_start date, p_end date)
returns uuid[] language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 return (
   select coalesce(array_agg(distinct r.listing_id), '{}'::uuid[])
   from public.stayz_reservations r
   where r.status in ('confirmed','pending','change_requested','extension_requested')
     and r.start_at < (p_end + interval '1 day')
     and r.end_at > p_start::timestamptz
     and (p_mode is null or r.mode = case p_mode when 'dayuse' then 'day_use' else p_mode end)
 );
end $$;

create or replace function public.stayz_unavailable_dates(p_listing uuid)
returns text[] language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 return (
   select coalesce(array_agg(distinct d::date::text order by d::date::text), '{}'::text[])
   from public.stayz_reservations r
   cross join lateral generate_series(date_trunc('day', r.start_at), date_trunc('day', r.end_at - interval '1 second'), interval '1 day') d
   where r.listing_id=p_listing and r.status in ('confirmed','pending','change_requested','extension_requested')
 );
end $$;

create or replace function public.stayz_busy_hours(p_listing uuid, p_date date)
returns text[] language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 return (
   select coalesce(array_agg(to_char(t, 'HH24:MI') order by t), '{}'::text[])
   from (
     select generate_series(date_trunc('hour', r.start_at), date_trunc('hour', r.end_at - interval '1 minute'), interval '1 hour') as t
     from public.stayz_reservations r
     where r.listing_id=p_listing and r.start_at::date=p_date
       and r.status in ('confirmed','pending','change_requested','extension_requested')
   ) q
 );
end $$;

create or replace function public.stayz_wallet_balance()
returns numeric language sql stable security invoker set search_path=public as $$
 select coalesce((select w.balance from public.wallets w where w.user_id = auth.uid()), 0)::numeric
$$;

create or replace function public.stayz_notices()
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', n.id, 'title', n.title, 'body', n.body, 'read', n.read, 'createdAt', n.created_at
 ) order by n.created_at desc), '[]'::jsonb)
 from public.stayz_notices n where n.user_id = auth.uid()
$$;

create or replace function public.stayz_mark_notices_read()
returns void language sql security invoker set search_path=public as $$
 update public.stayz_notices set read = true where user_id = auth.uid()
$$;

create table if not exists public.stayz_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.stayz_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
alter table public.stayz_thread_messages enable row level security;

drop policy if exists stayz_threads_own_select on public.stayz_threads;
create policy stayz_threads_own_select on public.stayz_threads for select to authenticated using (user_id = auth.uid());
drop policy if exists stayz_threads_own_insert on public.stayz_threads;
create policy stayz_threads_own_insert on public.stayz_threads for insert to authenticated with check (user_id = auth.uid());
drop policy if exists stayz_threads_own_update on public.stayz_threads;
create policy stayz_threads_own_update on public.stayz_threads for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists stayz_thread_messages_own_select on public.stayz_thread_messages;
create policy stayz_thread_messages_own_select on public.stayz_thread_messages for select to authenticated
using (exists (select 1 from public.stayz_threads t where t.id = thread_id and t.user_id = auth.uid()));
drop policy if exists stayz_thread_messages_own_insert on public.stayz_thread_messages;
create policy stayz_thread_messages_own_insert on public.stayz_thread_messages for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.stayz_threads t where t.id = thread_id and t.user_id = auth.uid()));

grant select, insert on public.stayz_thread_messages to authenticated;
grant select, insert, update on public.stayz_threads to authenticated;
grant select, update on public.stayz_notices to authenticated;
grant select, insert on public.stayz_reviews to authenticated;

create or replace function public.stayz_my_bookings()
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(x.booking order by x.start_at desc), '[]'::jsonb)
 from (
   select r.start_at, jsonb_build_object(
     'id', r.id, 'listingId', r.listing_id, 'title', l.name,
     'city', split_part(coalesce(l.location,''), ',', 1), 'photo', l.photos->>0,
     'start', r.start_at, 'end', r.end_at, 'guests', r.guests,
     'roomName', r.metadata->>'roomName', 'total', r.total, 'currency', r.currency,
     'status', case when r.status='cancelled' then 'Cancelled'
       when r.status='completed' then 'Completed' when r.status='pending' then 'Requested'
       when r.status='confirmed' and now() >= r.start_at and now() < r.end_at then 'Checked in'
       when r.status='confirmed' and now() >= r.end_at then 'Completed' else 'Upcoming' end,
     'doorCode', r.metadata->>'doorCode', 'extOn', coalesce((r.metadata->>'extOn')::boolean, false),
     'extPrice', nullif(r.metadata->>'extPrice','')::numeric,
     'extension', r.metadata->'extension', 'change', r.metadata->'change',
     'reviewed', exists(select 1 from public.stayz_reviews rv where rv.reservation_id=r.id and rv.user_id=auth.uid()),
     'breakfastAmount', coalesce((r.metadata->>'breakfastAmount')::numeric,0),
     'cleaning', r.cleaning_fee, 'discount', r.discount,
     'paymentLabel', coalesce(r.metadata->>'paymentLabel','Payment method'),
     'deposit', coalesce((r.metadata->>'deposit')::numeric,0), 'special', r.metadata->>'special',
     'cancellation', coalesce(l.cancellation,'{}'::jsonb)
   ) as booking
   from public.stayz_reservations r join public.stayz_listings l on l.id=r.listing_id
   where r.user_id=auth.uid()
 ) x
$$;

create or replace function public.stayz_booking(p_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
   'id', r.id, 'listingId', r.listing_id, 'title', l.name,
   'city', split_part(coalesce(l.location,''), ',', 1), 'photo', l.photos->>0,
   'start', r.start_at, 'end', r.end_at, 'guests', r.guests,
   'roomName', r.metadata->>'roomName', 'total', r.total, 'currency', r.currency,
   'status', case when r.status='cancelled' then 'Cancelled'
     when r.status='completed' then 'Completed' when r.status='pending' then 'Requested'
     when r.status='confirmed' and now() >= r.start_at and now() < r.end_at then 'Checked in'
     when r.status='confirmed' and now() >= r.end_at then 'Completed' else 'Upcoming' end,
   'doorCode', r.metadata->>'doorCode', 'extOn', coalesce((r.metadata->>'extOn')::boolean, false),
   'extPrice', nullif(r.metadata->>'extPrice','')::numeric,
   'extension', r.metadata->'extension', 'change', r.metadata->'change',
   'reviewed', exists(select 1 from public.stayz_reviews rv where rv.reservation_id=r.id and rv.user_id=auth.uid()),
   'breakfastAmount', coalesce((r.metadata->>'breakfastAmount')::numeric,0),
   'cleaning', r.cleaning_fee, 'discount', r.discount,
   'paymentLabel', coalesce(r.metadata->>'paymentLabel','Payment method'),
   'deposit', coalesce((r.metadata->>'deposit')::numeric,0), 'special', r.metadata->>'special',
   'cancellation', coalesce(l.cancellation,'{}'::jsonb)
 )
 from public.stayz_reservations r join public.stayz_listings l on l.id=r.listing_id
 where r.id=p_id and r.user_id=auth.uid()
$$;

create or replace function public.stayz_create_booking(
  p_listing uuid, p_mode text, p_start timestamptz, p_end timestamptz,
  p_guests integer, p_room text, p_breakfast boolean, p_special text, p_method text
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.stayz_listings%rowtype;
  v_wallet public.wallets%rowtype;
  v_mode text := case p_mode when 'dayuse' then 'day_use' else p_mode end;
  v_units numeric;
  v_subtotal numeric;
  v_cleaning numeric;
  v_tax numeric;
  v_total numeric;
  v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'reason','auth'); end if;
  if p_end <= p_start or coalesce(p_guests,0) < 1 then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
  if p_method is distinct from 'wallet' then
    return jsonb_build_object('ok',false,'reason','declined');
  end if;
  select * into v_listing from public.stayz_listings where id=p_listing and published=true;
  if not found then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
  if exists (
    select 1 from public.stayz_reservations r
    where r.listing_id=p_listing
      and r.status in ('confirmed','pending','change_requested','extension_requested')
      and r.start_at < p_end and r.end_at > p_start
  ) then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
  v_units := case
    when v_mode='hourly' then greatest(1,ceil(extract(epoch from (p_end-p_start))/3600))
    when v_mode='day_use' then greatest(1,ceil(extract(epoch from (p_end-p_start))/86400))
    when v_mode='extended' then greatest(1,ceil(extract(epoch from (p_end-p_start))/604800))
    else greatest(1,ceil(extract(epoch from (p_end-p_start))/86400))
  end;
  v_subtotal := round((case v_mode
    when 'hourly' then v_listing.hourly_price * v_units
    when 'day_use' then v_listing.day_price * v_units
    when 'extended' then v_listing.extended_price * v_units
    else v_listing.overnight_price * v_units end)::numeric,2);
  if v_subtotal <= 0 then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
  v_cleaning := round(v_subtotal * coalesce(v_listing.cleaning_fee_percent,0)/100,2);
  v_tax := round((v_subtotal + v_cleaning) * coalesce(v_listing.tax_percent,0)/100,2);
  v_total := v_subtotal + v_cleaning + v_tax;
  select * into v_wallet from public.wallets where user_id=v_uid for update;
  if not found or v_wallet.balance < v_total then
    return jsonb_build_object('ok',false,'reason','insufficient_balance');
  end if;
  insert into public.stayz_reservations(
    listing_id,user_id,mode,start_at,end_at,guests,subtotal,tax,cleaning_fee,discount,total,currency,status,payment_method_id,metadata
  ) values (
    p_listing,v_uid,v_mode,p_start,p_end,p_guests,v_subtotal,v_tax,v_cleaning,0,v_total,v_listing.currency,'confirmed',null,
    jsonb_build_object('roomName',p_room,'special',nullif(trim(coalesce(p_special,'')),''),'paymentLabel','Wallet','source','Stayz','extOn',v_listing.extended_price>0)
  ) returning id into v_id;
  update public.wallets set balance=balance-v_total, updated_at=now() where user_id=v_uid;
  insert into public.wallet_transactions(user_id,amount,direction,status,description,feature_name,activity_type,reference_id,metadata)
  values(v_uid,v_total,'debit','completed','Stayz booking: '||v_listing.name,'stayz','stayz_booking',v_id::text,jsonb_build_object('listing_id',p_listing,'reservation_id',v_id));
  return jsonb_build_object('ok',true,'booking',jsonb_build_object('id',v_id));
end $$;

create or replace function public.stayz_cancel_booking(p_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 update public.stayz_reservations set status='cancelled', updated_at=now()
 where id=p_id and user_id=auth.uid() and status in ('pending','confirmed');
 if not found then raise exception 'Booking cannot be cancelled'; end if;
 return public.stayz_booking(p_id);
end $$;

create or replace function public.stayz_request_change(p_id uuid, p_start timestamptz, p_end timestamptz, p_diff numeric)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 update public.stayz_reservations
 set status='change_requested',
     metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('change',jsonb_build_object('status','pending','start',p_start,'end',p_end,'diff',p_diff)),
     updated_at=now()
 where id=p_id and user_id=auth.uid() and status='confirmed' and p_end>p_start;
 if not found then raise exception 'Booking cannot be changed'; end if;
 return public.stayz_booking(p_id);
end $$;

drop function if exists public.stayz_request_extension(uuid,integer,numeric,uuid);
create or replace function public.stayz_request_extension(p_id uuid, p_units integer, p_price numeric, p_method text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 if p_units < 1 or p_price < 0 then raise exception 'Invalid extension'; end if;
 update public.stayz_reservations
 set status='extension_requested',
     metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('extension',jsonb_build_object('status','pending','units',p_units,'unit','night','price',p_price,'method',p_method)),
     updated_at=now()
 where id=p_id and user_id=auth.uid() and status in ('pending','confirmed');
 if not found then raise exception 'Booking cannot be extended'; end if;
 return public.stayz_booking(p_id);
end $$;

create or replace function public.stayz_submit_review(p_booking uuid, p_rating integer, p_body text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_listing uuid; v_review uuid;
begin
 if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
 select listing_id into v_listing from public.stayz_reservations
 where id=p_booking and user_id=auth.uid() and (status='completed' or end_at < now());
 if v_listing is null then raise exception 'Only completed stays can be reviewed'; end if;
 insert into public.stayz_reviews(reservation_id,listing_id,user_id,rating,text)
 values(p_booking,v_listing,auth.uid(),p_rating,nullif(trim(p_body),'')) returning id into v_review;
 return v_review;
end $$;

create or replace function public.stayz_threads()
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', t.id, 'title', t.title,
   'last', (select m.body from public.stayz_thread_messages m where m.thread_id=t.id order by m.created_at desc limit 1),
   'updatedAt', t.updated_at, 'unread', false
 ) order by t.updated_at desc), '[]'::jsonb)
 from public.stayz_threads t where t.user_id=auth.uid()
$$;

create or replace function public.stayz_start_thread(p_listing uuid, p_title text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 select id into v_id from public.stayz_threads where user_id=auth.uid() and listing_id=p_listing limit 1;
 if v_id is not null then return v_id; end if;
 insert into public.stayz_threads(user_id,listing_id,title)
 values(auth.uid(),p_listing,coalesce(nullif(trim(p_title),''),'Property message')) returning id into v_id;
 return v_id;
end $$;

create or replace function public.stayz_messages(p_thread uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', m.id, 'body', m.body, 'createdAt', m.created_at, 'mine', m.user_id=auth.uid()
 ) order by m.created_at), '[]'::jsonb)
 from public.stayz_thread_messages m
 join public.stayz_threads t on t.id=m.thread_id
 where m.thread_id=p_thread and t.user_id=auth.uid()
$$;

create or replace function public.stayz_send_message(p_thread uuid, p_body text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v public.stayz_thread_messages%rowtype;
begin
 if auth.uid() is null then raise exception 'auth'; end if;
 if length(trim(coalesce(p_body,'')))=0 then raise exception 'Message cannot be empty'; end if;
 insert into public.stayz_thread_messages(thread_id,user_id,body)
 select t.id,auth.uid(),trim(p_body) from public.stayz_threads t where t.id=p_thread and t.user_id=auth.uid()
 returning * into v;
 if v.id is null then raise exception 'Thread not found'; end if;
 update public.stayz_threads set updated_at=now() where id=p_thread and user_id=auth.uid();
 return jsonb_build_object('id',v.id,'body',v.body,'createdAt',v.created_at,'mine',true);
end $$;

drop policy if exists user_payment_methods_own_delete on public.user_payment_methods;
create policy user_payment_methods_own_delete on public.user_payment_methods for delete to authenticated using (user_id=auth.uid());

revoke all on function public.stayz_unavailable_listings(text,date,date) from public;
revoke all on function public.stayz_unavailable_dates(uuid) from public;
revoke all on function public.stayz_busy_hours(uuid,date) from public;
revoke all on function public.stayz_wallet_balance() from public;
revoke all on function public.stayz_notices() from public;
revoke all on function public.stayz_mark_notices_read() from public;
revoke all on function public.stayz_my_bookings() from public;
revoke all on function public.stayz_booking(uuid) from public;
revoke all on function public.stayz_cancel_booking(uuid) from public;
revoke all on function public.stayz_request_change(uuid,timestamptz,timestamptz,numeric) from public;
revoke all on function public.stayz_request_extension(uuid,integer,numeric,text) from public;
revoke all on function public.stayz_create_booking(uuid,text,timestamptz,timestamptz,integer,text,boolean,text,text) from public;
revoke all on function public.stayz_submit_review(uuid,integer,text) from public;
revoke all on function public.stayz_threads() from public;
revoke all on function public.stayz_start_thread(uuid,text) from public;
revoke all on function public.stayz_messages(uuid) from public;
revoke all on function public.stayz_send_message(uuid,text) from public;

grant execute on function public.stayz_unavailable_listings(text,date,date) to authenticated;
grant execute on function public.stayz_unavailable_dates(uuid) to authenticated;
grant execute on function public.stayz_busy_hours(uuid,date) to authenticated;
grant execute on function public.stayz_wallet_balance() to authenticated;
grant execute on function public.stayz_notices() to authenticated;
grant execute on function public.stayz_mark_notices_read() to authenticated;
grant execute on function public.stayz_my_bookings() to authenticated;
grant execute on function public.stayz_booking(uuid) to authenticated;
grant execute on function public.stayz_cancel_booking(uuid) to authenticated;
grant execute on function public.stayz_request_change(uuid,timestamptz,timestamptz,numeric) to authenticated;
grant execute on function public.stayz_request_extension(uuid,integer,numeric,text) to authenticated;
grant execute on function public.stayz_create_booking(uuid,text,timestamptz,timestamptz,integer,text,boolean,text,text) to authenticated;
grant execute on function public.stayz_submit_review(uuid,integer,text) to authenticated;
grant execute on function public.stayz_threads() to authenticated;
grant execute on function public.stayz_start_thread(uuid,text) to authenticated;
grant execute on function public.stayz_messages(uuid) to authenticated;
grant execute on function public.stayz_send_message(uuid,text) to authenticated;

notify pgrst, 'reload schema';
