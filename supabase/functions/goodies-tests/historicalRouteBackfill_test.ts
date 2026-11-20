import {sharedBillHarness, sbUsers as u, sbId, sbCheck as check} from './sharedBillHarness.ts';

// Uses an ephemeral PGlite database with synthetic identities and payments.
// Never connects to the hosted Wantiss production project.
Deno.test('historical road-route repair uses only a unique consumed matching quote and keeps totals unchanged', async () => {
  const h=await sharedBillHarness(),{db}=h;
  const quoteId=sbId(91), duplicateQuoteId=sbId(92);
  const route={type:'MultiLineString',coordinates:[[[-72.3,18.5],[-72.295,18.507]],[[-72.295,18.507],[-72.28,18.52]]]};
  let orderId='';
  const patch=await Deno.readTextFile(new URL('../../migrations/20261120194000_goodies_backfill_verified_delivery_routes.sql',import.meta.url));
  try {
    await h.root();
    await db.exec("update public.goodies_store_schedules set delivery_pricing_mode='distance' where store_id='shared-bill-test'");
    await db.query(
      `insert into public.goodies_delivery_quotes
      (id,customer_id,store_id,address_payload,distance_m,fee,expires_at,
       origin_latitude,origin_longitude,destination_latitude,destination_longitude,route_geometry)
      values ($1,$2,'shared-bill-test',$3::jsonb,1872,2,now()+interval '5 minutes',
       18.5,-72.3,18.52,-72.28,$4::jsonb)`,
      [quoteId,u.host,JSON.stringify({l:'Home',t:'Synthetic destination'}),JSON.stringify(route)]
    );
    await h.as(u.host);
    const checkout=await db.query<{id:string}>(
      `select * from public.place_goodies_order_with_payment_once(
       'synthetic-backfill-wallet','wallet','shared-bill-test','delivery',null,
       $1::jsonb,'50937000000',$2::jsonb,10,2,1,0,0,13,null,null)`,
      [JSON.stringify({l:'Home',t:'Synthetic destination',delivery_quote_id:quoteId}),JSON.stringify(h.snapshot().p_items)]
    );
    orderId=checkout.rows[0].id;
    await h.root();
    const before=(await db.query<{total:string;payment_status:string;delivery_route:any}>(
      'select total,payment_status,delivery_route from public.goodies_orders where id=$1',[orderId]
    )).rows[0];
    check(before.payment_status==='paid','Synthetic checkout was not paid');
    check(before.delivery_route?.type==='MultiLineString','Checkout quote did not preserve real segments');
    await db.query('update public.goodies_orders set delivery_route=null where id=$1',[orderId]);
    await db.exec(patch);
    const repaired=(await db.query<{total:string;payment_status:string;delivery_route:any}>(
      'select total,payment_status,delivery_route from public.goodies_orders where id=$1',[orderId]
    )).rows[0];
    check(JSON.stringify(repaired.delivery_route)===JSON.stringify(route),'Missing route was not restored from the consumed quote');
    check(repaired.total===before.total&&repaired.payment_status===before.payment_status,'Backfill modified financial state');

    // An otherwise-identical second consumed quote makes provenance ambiguous:
    // no geometry is permitted to be guessed for the order.
    await db.query('update public.goodies_orders set delivery_route=null where id=$1',[orderId]);
    await db.query(
      `insert into public.goodies_delivery_quotes
      (id,customer_id,store_id,address_payload,distance_m,fee,created_at,expires_at,consumed_at,
       origin_latitude,origin_longitude,destination_latitude,destination_longitude,route_geometry)
      select $1,customer_id,store_id,address_payload,distance_m,fee,
       created_at,expires_at,now(),origin_latitude,origin_longitude,
       destination_latitude,destination_longitude,route_geometry
      from public.goodies_delivery_quotes where id=$2`,[duplicateQuoteId,quoteId]
    );
    await db.exec(patch);
    const ambiguous=(await db.query<{delivery_route:any}>(
      'select delivery_route from public.goodies_orders where id=$1',[orderId]
    )).rows[0];
    check(ambiguous.delivery_route===null,'Ambiguous quote history must not fabricate or select a route');

    await db.exec(patch);
    check((await db.query<{count:number}>(
      'select count(*)::integer as count from public.goodies_orders where id=$1 and delivery_route is null',[orderId]
    )).rows[0].count===1,'Repeat migration must remain harmless');
  } finally { await db.close(); }
});
