-- Repair genuine legacy delivery orders whose road geometry was not persisted.
-- Never reconstruct a line from store/customer coordinates: copy only a real,
-- consumed Geoapify quote for the exact customer, store, endpoints, and fee.
-- Ambiguous matches are deliberately skipped; financial columns are untouched.
begin;
with candidate_quotes as (
  select o.id as order_id, q.route_geometry,
    count(*) over (partition by o.id) as match_count
  from public.goodies_orders o
  join public.goodies_delivery_quotes q
    on q.customer_id=o.customer_id and q.store_id=o.store_id
    and abs(q.origin_latitude - o.store_latitude) < 0.000001
    and abs(q.origin_longitude - o.store_longitude) < 0.000001
    and abs(q.destination_latitude - o.delivery_latitude) < 0.000001
    and abs(q.destination_longitude - o.delivery_longitude) < 0.000001
    and q.fee=o.delivery_fee
    and q.consumed_at is not null
    and q.created_at <= o.created_at
    and q.created_at > o.created_at - interval '2 minutes'
    and q.route_geometry->>'type' in ('LineString','MultiLineString')
    and case when jsonb_typeof(q.route_geometry->'coordinates')='array'
      then jsonb_array_length(q.route_geometry->'coordinates') > 0 else false end
  where o.order_type='delivery' and o.delivery_route is null
    and o.status in ('scheduled','placed','accepted','preparing','ready','courier_assigned','picked_up')
), unique_quotes as (
  select order_id,route_geometry
  from candidate_quotes
  where match_count=1
)
update public.goodies_orders as o
   set delivery_route=u.route_geometry
  from unique_quotes u
 where o.id=u.order_id and o.delivery_route is null;
commit;
