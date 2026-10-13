create extension if not exists pgcrypto;

alter table promotions add column if not exists percent numeric(5,2) check (percent is null or (percent > 0 and percent <= 100));

create table if not exists guest_wallets (
  user_id uuid primary key references auth.users on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0)
);
alter table guest_wallets enable row level security;
create policy "own wallet" on guest_wallets for select using (user_id = auth.uid());

create table if not exists stayz_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references feature_orders on delete set null,
  listing_id uuid not null references listings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  mode text not null check (mode in ('hourly','dayuse','overnight','extended')),
  during tstzrange not null,
  room_id text,
  room_name text,
  guests int not null check (guests > 0),
  status text not null default 'Requested' check (status in ('Requested','Accepted','Upcoming','Checked in','Completed','Cancelled','No-show')),
  total numeric(14,2) not null,
  breakfast boolean not null default false,
  breakfast_amount numeric(14,2) not null default 0,
  cleaning numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  deposit numeric(14,2) not null default 0,
  payment_label text not null,
  door_code text not null default lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'),
  special text,
  refund jsonb,
  extension jsonb,
  change jsonb,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists stayz_res_listing on stayz_reservations(listing_id, status);
create index if not exists stayz_res_user on stayz_reservations(user_id, created_at desc);
alter table stayz_reservations enable row level security;
create policy "own reservations" on stayz_reservations for select using (user_id = auth.uid());
create policy "business reads reservations" on stayz_reservations for select using (exists (select 1 from listings l where l.id = listing_id and is_member(l.business_id)));

create table if not exists stayz_reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references stayz_reservations on delete cascade,
  listing_id uuid not null references listings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);
alter table stayz_reviews enable row level security;
create policy "reviews readable" on stayz_reviews for select using (true);

create table if not exists stayz_saved (
  user_id uuid not null references auth.users on delete cascade,
  listing_id uuid not null references listings on delete cascade,
  primary key (user_id, listing_id)
);
alter table stayz_saved enable row level security;
create policy "own saved read" on stayz_saved for select using (user_id = auth.uid());
create policy "own saved insert" on stayz_saved for insert with check (user_id = auth.uid());
create policy "own saved delete" on stayz_saved for delete using (user_id = auth.uid());

create table if not exists stayz_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('card')),
  brand text not null check (brand in ('Visa','Mastercard','Discover','JCB','UnionPay')),
  label text not null,
  detail text not null,
  provider_token text not null,
  created_at timestamptz not null default now()
);
alter table stayz_payment_methods enable row level security;
create policy "own methods read" on stayz_payment_methods for select using (user_id = auth.uid());
create policy "own methods delete" on stayz_payment_methods for delete using (user_id = auth.uid());

create table if not exists stayz_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  last_body text not null default '',
  updated_at timestamptz not null default now(),
  guest_unread boolean not null default false,
  unique (listing_id, user_id)
);
create table if not exists stayz_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references stayz_threads on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table stayz_threads enable row level security;
alter table stayz_thread_messages enable row level security;
create policy "own threads" on stayz_threads for select using (user_id = auth.uid());
create policy "own thread messages" on stayz_thread_messages for select using (exists (select 1 from stayz_threads t where t.id = thread_id and t.user_id = auth.uid()));

create table if not exists stayz_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  reservation_id uuid references stayz_reservations on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table stayz_notices enable row level security;
create policy "own notices" on stayz_notices for select using (user_id = auth.uid());

create or replace view stayz_listings_view as
select
  l.id, l.business_id, l.title, l.description, l.photos, l.attributes, l.price,
  coalesce((select b.verification = 'verified' from businesses b where b.id = l.business_id), false) as verified,
  (select count(*) from stayz_reservations s where s.listing_id = l.id and s.status = 'Completed') as stays,
  coalesce((select avg(rating) from stayz_reviews r where r.listing_id = l.id), 0) as rating,
  (select count(*) from stayz_reviews r where r.listing_id = l.id) as review_count,
  (select jsonb_build_object('id', p.id, 'title', p.title, 'percent', p.percent, 'fundedBy', p.funded_by)
     from promotions p
    where p.feature = 'stayz' and p.status = 'active' and p.percent is not null and (p.business_id = l.business_id or p.funded_by = 'platform')
    order by p.percent desc limit 1) as promo
from listings l
where l.feature = 'stayz' and l.status = 'published';

create or replace view stayz_reviews_view as
select r.id, r.listing_id, r.rating, r.body, r.created_at, coalesce(p.full_name, 'Guest') as author
from stayz_reviews r left join profiles p on p.id = r.user_id;

create or replace function stayz_local_date(t timestamptz) returns date language sql immutable as
$$ select (t at time zone 'America/Port-au-Prince')::date $$;

create or replace function stayz_rooms_total(a jsonb) returns int language sql immutable as
$$ select greatest(1, coalesce((select sum(coalesce((r->>'qty')::int, 1)) from jsonb_array_elements(coalesce(a->'rooms', '[]'::jsonb)) r), 1)) $$;

create or replace function stayz_room_qty(a jsonb, p_room text) returns int language sql immutable as
$$ select coalesce((select (r->>'qty')::int from jsonb_array_elements(coalesce(a->'rooms', '[]'::jsonb)) r where coalesce(r->>'id', '') = p_room limit 1), stayz_rooms_total(a)) $$;

create or replace function stayz_is_blocked(a jsonb, p_during tstzrange) returns boolean language sql immutable as
$$ select exists (
  select 1 from jsonb_array_elements_text(coalesce(a->'blocked', '[]'::jsonb)) d
  where d::date >= stayz_local_date(lower(p_during)) and d::date <= stayz_local_date(upper(p_during) - interval '1 minute')
) $$;

create or replace function stayz_unavailable_listings(p_mode text, p_start date, p_end date) returns uuid[] language sql stable security definer set search_path = public as
$$
  select coalesce(array_agg(l.id), '{}')
  from listings l
  where l.feature = 'stayz' and l.status = 'published' and (
    stayz_is_blocked(l.attributes, tstzrange((p_start::timestamp at time zone 'America/Port-au-Prince'), (p_end::timestamp at time zone 'America/Port-au-Prince')))
    or (p_mode in ('overnight', 'extended') and (
      select count(*) from stayz_reservations s
      where s.listing_id = l.id and s.status not in ('Cancelled', 'No-show', 'Completed') and s.mode in ('overnight', 'extended')
        and s.during && tstzrange((p_start::timestamp at time zone 'America/Port-au-Prince'), (p_end::timestamp at time zone 'America/Port-au-Prince'))
    ) >= stayz_rooms_total(l.attributes))
  )
$$;

create or replace function stayz_unavailable_dates(p_listing uuid) returns date[] language sql stable security definer set search_path = public as
$$
  with l as (select attributes a from listings where id = p_listing and feature = 'stayz'),
  days as (
    select d::date as day
    from generate_series(current_date, current_date + 365, interval '1 day') d
  ),
  taken as (
    select days.day, (select count(*) from stayz_reservations s
      where s.listing_id = p_listing and s.status not in ('Cancelled', 'No-show', 'Completed') and s.mode in ('overnight', 'extended')
        and stayz_local_date(lower(s.during)) <= days.day and stayz_local_date(upper(s.during)) > days.day) as n
    from days
  )
  select coalesce(array_agg(distinct x.day), '{}') from (
    select t.day from taken t, l where t.n >= stayz_rooms_total(l.a)
    union
    select d::date from l, jsonb_array_elements_text(coalesce(l.a->'blocked', '[]'::jsonb)) d
  ) x
$$;

create or replace function stayz_busy_hours(p_listing uuid, p_date date) returns text[] language sql stable security definer set search_path = public as
$$
  select coalesce(array_agg(distinct lpad(h::text, 2, '0') || ':00'), '{}')
  from stayz_reservations s,
  lateral generate_series(
    extract(hour from lower(s.during) at time zone 'America/Port-au-Prince')::int,
    extract(hour from upper(s.during) at time zone 'America/Port-au-Prince')::int - 1
  ) h
  where s.listing_id = p_listing and s.mode in ('hourly', 'dayuse') and s.status not in ('Cancelled', 'No-show')
    and stayz_local_date(lower(s.during)) = p_date
$$;

create or replace function stayz_json(r stayz_reservations) returns jsonb language sql stable security definer set search_path = public as
$$
  select jsonb_build_object(
    'id', r.id, 'listingId', r.listing_id, 'title', l.title, 'city', coalesce(l.attributes->>'city', ''), 'photo', l.photos[1],
    'mode', r.mode, 'start', lower(r.during), 'end', upper(r.during), 'guests', r.guests, 'roomName', r.room_name,
    'status', r.status, 'total', r.total, 'breakfast', r.breakfast, 'breakfastAmount', r.breakfast_amount,
    'cleaning', r.cleaning, 'discount', r.discount, 'deposit', r.deposit, 'paymentLabel', r.payment_label, 'doorCode', r.door_code,
    'cxAllowed', coalesce((l.attributes->>'cxAllowed')::boolean, true), 'cxFree', coalesce((l.attributes->>'cxFree')::int, 48), 'cxLate', coalesce((l.attributes->>'cxLate')::int, 0),
    'extOn', coalesce((l.attributes->>'extOn')::boolean, false), 'extPrice', nullif(l.attributes->>'extPrice', '')::numeric,
    'special', r.special, 'refund', r.refund, 'extension', r.extension, 'change', r.change, 'reviewed', r.reviewed, 'createdAt', r.created_at)
  from listings l where l.id = r.listing_id
$$;

create or replace function stayz_my_bookings() returns setof jsonb language plpgsql security definer set search_path = public as
$$
begin
  update stayz_reservations set status = 'Checked in' where user_id = auth.uid() and status = 'Upcoming' and lower(during) <= now() and upper(during) > now();
  update stayz_reservations set status = 'Completed' where user_id = auth.uid() and status in ('Upcoming', 'Checked in') and upper(during) <= now();
  return query select stayz_json(r) from stayz_reservations r where r.user_id = auth.uid() order by lower(r.during) desc;
end $$;

create or replace function stayz_booking(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as
$$
declare r stayz_reservations;
begin
  select * into r from stayz_reservations where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Booking not found'; end if;
  return stayz_json(r);
end $$;

create or replace function stayz_wallet_balance() returns numeric language sql stable security definer set search_path = public as
$$ select coalesce((select balance from guest_wallets where user_id = auth.uid()), 0) $$;

create or replace function stayz_create_booking(
  p_listing uuid, p_mode text, p_start timestamptz, p_end timestamptz, p_guests int,
  p_room text, p_breakfast boolean, p_special text, p_method text
) returns jsonb language plpgsql security definer set search_path = public as
$$
declare
  uid uuid := auth.uid();
  l listings;
  a jsonb;
  hrs numeric;
  nights int;
  base numeric := 0;
  first_day numeric := 0;
  bf numeric := 0;
  clean numeric := 0;
  disc numeric := 0;
  tot numeric;
  pct numeric;
  rm jsonb;
  rp numeric;
  d date;
  dow int;
  nightly numeric;
  during tstzrange := tstzrange(p_start, p_end);
  inst boolean;
  label text;
  bal numeric;
  oid uuid;
  rid uuid;
  st text;
  taken int;
begin
  if uid is null then raise exception 'auth'; end if;
  select * into l from listings where id = p_listing and feature = 'stayz' and status = 'published';
  if not found then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
  a := l.attributes;
  inst := coalesce((a->>'instant')::boolean, false);

  if p_mode = 'hourly' then
    hrs := extract(epoch from (p_end - p_start)) / 3600;
    select (h->>'price')::numeric into base from jsonb_array_elements(coalesce(a->'hourly', '[]'::jsonb)) h where (h->>'hours')::numeric = hrs limit 1;
    if base is null then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
    first_day := base;
  elsif p_mode = 'dayuse' then
    select (w->>'price')::numeric into base from jsonb_array_elements(coalesce(a->'dayUse', '[]'::jsonb)) w
      where (w->>'from')::time = (p_start at time zone 'America/Port-au-Prince')::time and (w->>'until')::time = (p_end at time zone 'America/Port-au-Prince')::time limit 1;
    if base is null then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
    first_day := base;
  else
    nights := stayz_local_date(p_end) - stayz_local_date(p_start);
    if nights < 1 then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
    rp := coalesce((a->>'price')::numeric, 0);
    select r into rm from jsonb_array_elements(coalesce(a->'rooms', '[]'::jsonb)) r where coalesce(r->>'id', '') = coalesce(p_room, '') limit 1;
    if rm is not null and rm->>'price' is not null then rp := (rm->>'price')::numeric; end if;
    for i in 0..nights - 1 loop
      d := stayz_local_date(p_start) + i;
      dow := extract(dow from d);
      nightly := rp;
      if dow in (5, 6) and nullif(a->>'weekend', '') is not null then nightly := (a->>'weekend')::numeric; end if;
      if nights >= 28 and nullif(a->>'monthly', '') is not null then nightly := (a->>'monthly')::numeric;
      elsif nights >= 7 and nullif(a->>'weekly', '') is not null then nightly := (a->>'weekly')::numeric; end if;
      if i = 0 then first_day := nightly; end if;
      base := base + nightly;
    end loop;
    if p_breakfast and nullif(a->>'breakfast', '') is not null then bf := round((a->>'breakfast')::numeric * p_guests * nights, 2); end if;
  end if;

  if a->>'ptype' in ('Apartment', 'Villa') then clean := round(first_day * 0.022, 2); end if;
  select p.percent into pct from promotions p where p.feature = 'stayz' and p.status = 'active' and p.percent is not null and (p.business_id = l.business_id or p.funded_by = 'platform') order by p.percent desc limit 1;
  if pct is not null then disc := round(base * pct / 100, 2); end if;
  tot := round(base + bf + clean - disc, 2);

  if stayz_is_blocked(a, during) then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
  select count(*) into taken from stayz_reservations s
    where s.listing_id = l.id and s.status not in ('Cancelled', 'No-show', 'Completed') and s.during && during
      and (p_mode in ('hourly', 'dayuse') = (s.mode in ('hourly', 'dayuse'))) and coalesce(s.room_id, '') = coalesce(p_room, '');
  if taken >= case when p_mode in ('hourly', 'dayuse') then 1 else stayz_room_qty(a, coalesce(p_room, '')) end then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  if p_method = 'wallet' then
    select balance into bal from guest_wallets where user_id = uid for update;
    if coalesce(bal, 0) < tot then return jsonb_build_object('ok', false, 'reason', 'insufficient_balance'); end if;
    update guest_wallets set balance = balance - tot where user_id = uid;
    label := 'Wallet';
  elsif p_method in ('moncash', 'natcash') then
    label := case p_method when 'moncash' then 'MonCash' else 'NatCash' end;
  else
    select m.label || ' ' || m.detail into label from stayz_payment_methods m where m.id::text = p_method and m.user_id = uid;
    if label is null then return jsonb_build_object('ok', false, 'reason', 'declined'); end if;
  end if;

  st := case when inst then 'Upcoming' else 'Requested' end;
  insert into feature_orders(business_id, feature, listing_id, customer_id, title, amount, status, payment_status)
    values (l.business_id, 'stayz', l.id, uid, l.title, tot, case when inst then 'Upcoming' else 'Requested' end, 'paid') returning id into oid;
  insert into stayz_reservations(order_id, listing_id, user_id, mode, during, room_id, room_name, guests, status, total, breakfast, breakfast_amount, cleaning, discount, deposit, payment_label, special)
    values (oid, l.id, uid, p_mode, during, p_room, rm->>'name', p_guests, st, tot, bf > 0, bf, clean, disc, coalesce((a->>'deposit')::numeric, 0), label, nullif(trim(p_special), ''))
    returning id into rid;
  insert into stayz_notices(user_id, reservation_id, title, body)
    values (uid, rid, case when inst then 'Booking confirmed' else 'Request sent' end, l.title);
  return jsonb_build_object('ok', true, 'booking', (select stayz_json(r) from stayz_reservations r where r.id = rid));
end $$;

create or replace function stayz_cancel_booking(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as
$$
declare
  r stayz_reservations;
  a jsonb;
  hrs numeric;
  pct numeric;
  amt numeric;
begin
  select * into r from stayz_reservations where id = p_id and user_id = auth.uid() for update;
  if not found or r.status not in ('Requested', 'Accepted', 'Upcoming') or lower(r.during) <= now() then raise exception 'This booking cannot be cancelled'; end if;
  select attributes into a from listings where id = r.listing_id;
  hrs := extract(epoch from (lower(r.during) - now())) / 3600;
  pct := case when not coalesce((a->>'cxAllowed')::boolean, true) then 0 when hrs >= coalesce((a->>'cxFree')::numeric, 48) then 100 else coalesce((a->>'cxLate')::numeric, 0) end;
  amt := round(r.total * pct / 100, 2);
  update stayz_reservations set status = 'Cancelled', refund = case when amt > 0 then jsonb_build_object('amount', amt, 'status', 'processing') else null end where id = r.id returning * into r;
  update feature_orders set status = 'Cancelled', refunded = amt, updated_at = now() where id = r.order_id;
  insert into stayz_notices(user_id, reservation_id, title, body) values (r.user_id, r.id, 'Booking cancelled', case when amt > 0 then 'Your refund will arrive within 14 business days.' else 'No refund applies to this cancellation.' end);
  return stayz_json(r);
end $$;

create or replace function stayz_request_change(p_id uuid, p_start timestamptz, p_end timestamptz, p_diff numeric) returns jsonb language plpgsql security definer set search_path = public as
$$
declare r stayz_reservations;
begin
  select * into r from stayz_reservations where id = p_id and user_id = auth.uid() for update;
  if not found or r.status not in ('Accepted', 'Upcoming') or lower(r.during) <= now() then raise exception 'This booking cannot be changed'; end if;
  update stayz_reservations set change = jsonb_build_object('start', p_start, 'end', p_end, 'diff', p_diff, 'status', 'pending') where id = r.id returning * into r;
  insert into stayz_notices(user_id, reservation_id, title, body) values (r.user_id, r.id, 'Change requested', 'Waiting for the property to approve.');
  return stayz_json(r);
end $$;

create or replace function stayz_request_extension(p_id uuid, p_units int, p_price numeric, p_method text) returns jsonb language plpgsql security definer set search_path = public as
$$
declare
  r stayz_reservations;
  a jsonb;
  unit text;
  price numeric;
  bal numeric;
begin
  select * into r from stayz_reservations where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  select attributes into a from listings where id = r.listing_id;
  if not coalesce((a->>'extOn')::boolean, false) then raise exception 'Extensions are not offered'; end if;
  if r.extension is not null and r.extension->>'status' = 'pending' then raise exception 'An extension is already pending'; end if;
  if not (r.status = 'Checked in' or (r.status = 'Upcoming' and lower(r.during) - now() <= interval '2 hours') or (upper(r.during) - now() between interval '0' and interval '2 hours')) then
    raise exception 'Extensions are available during your stay';
  end if;
  unit := case when r.mode = 'hourly' then 'hour' else 'night' end;
  price := round((a->>'extPrice')::numeric * p_units, 2);
  if p_method = 'wallet' then
    select balance into bal from guest_wallets where user_id = r.user_id for update;
    if coalesce(bal, 0) < price then raise exception 'insufficient_balance'; end if;
    update guest_wallets set balance = balance - price where user_id = r.user_id;
  end if;
  update stayz_reservations set extension = jsonb_build_object('units', p_units, 'unit', unit, 'price', price, 'status', 'pending') where id = r.id returning * into r;
  insert into stayz_notices(user_id, reservation_id, title, body) values (r.user_id, r.id, 'Extension requested', 'The property will confirm if available.');
  return stayz_json(r);
end $$;

create or replace function stayz_submit_review(p_booking uuid, p_rating int, p_body text) returns void language plpgsql security definer set search_path = public as
$$
declare r stayz_reservations;
begin
  select * into r from stayz_reservations where id = p_booking and user_id = auth.uid() for update;
  if not found or r.status <> 'Completed' or r.reviewed then raise exception 'Not allowed'; end if;
  insert into stayz_reviews(reservation_id, listing_id, user_id, rating, body) values (r.id, r.listing_id, r.user_id, p_rating, nullif(trim(p_body), ''));
  update stayz_reservations set reviewed = true where id = r.id;
end $$;

create or replace function stayz_threads() returns jsonb language sql stable security definer set search_path = public as
$$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'listingId', t.listing_id, 'title', t.title, 'last', t.last_body, 'updatedAt', t.updated_at, 'unread', t.guest_unread) order by t.updated_at desc), '[]'::jsonb)
  from stayz_threads t where t.user_id = auth.uid()
$$;

create or replace function stayz_start_thread(p_listing uuid, p_title text) returns uuid language plpgsql security definer set search_path = public as
$$
declare tid uuid;
begin
  insert into stayz_threads(listing_id, user_id, title) values (p_listing, auth.uid(), p_title)
  on conflict (listing_id, user_id) do update set title = excluded.title returning id into tid;
  return tid;
end $$;

create or replace function stayz_messages(p_thread uuid) returns jsonb language sql stable security definer set search_path = public as
$$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender_id = auth.uid(), 'body', m.body, 'createdAt', m.created_at) order by m.created_at), '[]'::jsonb)
  from stayz_thread_messages m join stayz_threads t on t.id = m.thread_id where m.thread_id = p_thread and t.user_id = auth.uid()
$$;

create or replace function stayz_send_message(p_thread uuid, p_body text) returns jsonb language plpgsql security definer set search_path = public as
$$
declare m stayz_thread_messages;
begin
  if not exists (select 1 from stayz_threads where id = p_thread and user_id = auth.uid()) then raise exception 'Not allowed'; end if;
  insert into stayz_thread_messages(thread_id, sender_id, body) values (p_thread, auth.uid(), trim(p_body)) returning * into m;
  update stayz_threads set last_body = m.body, updated_at = m.created_at where id = p_thread;
  return jsonb_build_object('id', m.id, 'mine', true, 'body', m.body, 'createdAt', m.created_at);
end $$;

create or replace function stayz_notices() returns jsonb language sql stable security definer set search_path = public as
$$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'createdAt', n.created_at, 'read', n.read, 'bookingId', n.reservation_id) order by n.created_at desc), '[]'::jsonb)
  from stayz_notices n where n.user_id = auth.uid()
$$;

create or replace function stayz_mark_notices_read() returns void language sql security definer set search_path = public as
$$ update stayz_notices set read = true where user_id = auth.uid() and not read $$;

grant execute on function stayz_unavailable_listings, stayz_unavailable_dates, stayz_busy_hours, stayz_my_bookings, stayz_booking, stayz_wallet_balance, stayz_create_booking, stayz_cancel_booking, stayz_request_change, stayz_request_extension, stayz_submit_review, stayz_threads, stayz_start_thread, stayz_messages, stayz_send_message, stayz_notices, stayz_mark_notices_read to authenticated;
grant select on stayz_listings_view, stayz_reviews_view to anon, authenticated;
