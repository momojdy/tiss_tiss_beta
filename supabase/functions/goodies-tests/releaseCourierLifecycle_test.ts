import {sharedBillHarness, sbUsers as u, sbId, sbCheck as check} from './sharedBillHarness.ts';

// Entire candidate backend, real SQL role boundaries and synthetic records.
// No hosted customer, provider, mobile GPS or push transport is used.
Deno.test('Wallet delivery connects customer, vendor, assigned courier and admin using one paid order',async t=>{
 const h=await sharedBillHarness(),{db}=h,quote=sbId(80),address={l:'Home',t:'Synthetic release delivery address'},route={type:'LineString',coordinates:[[-72.3,18.5],[-72.29,18.51],[-72.28,18.52]]};
 const cart=JSON.stringify(h.snapshot().p_items);
 const checkout="select * from public.place_goodies_order_with_payment_once('synthetic-release-delivery','wallet','shared-bill-test','delivery',null,$1::jsonb,'50937000000',$2::jsonb,10,2,1,0,0,13,null,null)";
 let orderId='',stock=0;
 try{
  await h.root();await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-shared-profile-access-20261117.sql',import.meta.url)));
  stock=Number((await db.query<{stock:number}>('select stock from public.goodies_products where id=$1',[u.product])).rows[0].stock);
  await db.exec("update public.goodies_store_schedules set delivery_pricing_mode='distance' where store_id='shared-bill-test'");
  await db.query("insert into public.goodies_delivery_quotes(id,customer_id,store_id,address_payload,distance_m,fee,expires_at,origin_latitude,origin_longitude,destination_latitude,destination_longitude,route_geometry) values($1,$2,'shared-bill-test',$3::jsonb,1000,2,now()+interval '5 minutes',18.5,-72.3,18.52,-72.28,$4::jsonb)",[quote,u.host,JSON.stringify(address),JSON.stringify(route)]);
  await db.query('insert into public.goodies_courier_roster(courier_id,is_approved,added_by) values($1,true,$2)',[u.bob,u.admin]);
  await h.as(u.bob);await db.query('select public.goodies_set_courier_availability(true,false)');
  await t.step('server-authoritative checkout and a retry reserve and debit once',async()=>{
   await h.as(u.host);const args=[JSON.stringify({...address,delivery_quote_id:quote}),cart];
   orderId=(await db.query<{id:string}>(checkout,args)).rows[0].id;
   check((await db.query<{id:string}>(checkout,args)).rows[0].id===orderId,'Retry created another order');
   await h.root();check(Number((await db.query<{balance:string}>('select balance from public.wallets where user_id=$1',[u.host])).rows[0].balance)===87,'Wallet did not debit exactly once');
   const row=(await db.query<{stock:number}>('select stock from public.goodies_products where id=$1',[u.product])).rows[0];check(Number(row.stock)===stock-1,'Stock was not reserved once');
  });
  await t.step('other customer/vendor cannot read or fulfill the order',async()=>{
   await h.as(u.alice);check((await db.query('select id from public.goodies_orders where id=$1',[orderId])).rows.length===0,'Another customer read the order');
   check((await db.query('select id from public.profiles where id=$1',[u.host])).rows.length===0,'Shared profile fixture widened another customer’s access');
   await h.denied('select public.accept_goodies_order($1)',[orderId]);await h.as(u.otherVendor);await h.denied('select public.accept_goodies_order($1)',[orderId]);
  });
  await t.step('vendor prepares the same order and assigns an approved courier',async()=>{
   await h.as(u.vendor);await db.query('select public.accept_goodies_order($1)',[orderId]);await db.query("select public.set_goodies_order_status($1,'preparing')",[orderId]);await db.query("select public.set_goodies_order_status($1,'ready')",[orderId]);
   await db.query('select public.goodies_assign_courier($1,$2)',[orderId,u.bob]);
   await h.as(u.alice);await h.denied('select public.goodies_courier_update_location($1,18.51,-72.29,5,0,0)',[orderId]);
   await h.as(u.bob);await h.denied('select public.goodies_courier_update_location($1,18.51,-72.29,5,0,0)',[orderId]);
   await db.query('select public.goodies_courier_respond_assignment($1,true)',[orderId]);
  });
  await t.step('accepted courier can share location and advance only the assigned delivery',async()=>{
   const assigned=(await db.query<{order_id:string}>('select order_id from public.goodies_courier_orders()')).rows;check(assigned.some(row=>row.order_id===orderId),'Courier cannot load the accepted order');
   await db.query('select public.goodies_courier_update_location($1,18.51,-72.29,5,0,0)',[orderId]);
   await h.as(u.host);const location=(await db.query<{latitude:number;longitude:number}>('select latitude,longitude from public.goodies_delivery_assignments where order_id=$1',[orderId])).rows[0];check(Number(location.latitude)===18.51&&Number(location.longitude)===-72.29,'Customer cannot see the actual assigned location sample');
   await h.as(u.bob);await db.query("select public.goodies_courier_update_delivery_status($1,'picked_up')",[orderId]);await db.query("select public.goodies_courier_update_delivery_status($1,'delivered')",[orderId]);
   await h.denied("select public.goodies_courier_update_delivery_status($1,'delivered')",[orderId]);
  });
  await t.step('customer, vendor and admin see completion, routing and correctly addressed notification records',async()=>{
   for(const actor of [u.host,u.vendor]){
    await h.as(actor);const row=(await db.query<{status:string;payment_status:string;courier_id:string}>('select status,payment_status,courier_id from public.goodies_orders where id=$1',[orderId])).rows[0];check(row.status==='completed'&&row.payment_status==='paid'&&row.courier_id===u.bob,'Cross-role order state differs');
   }
   await h.as(u.admin);const rows=(await db.query<{orders:{id:string;status:string}[]}>('select public.goodies_admin_orders_page(0,100) orders')).rows[0].orders;check(rows.some(row=>row.id===orderId&&row.status==='completed'),'Admin oversight missed the completed order');
   await h.root();const row=(await db.query<{delivery_route:any;address:any}>('select delivery_route,address from public.goodies_orders where id=$1',[orderId])).rows[0];check(JSON.stringify(row.delivery_route)===JSON.stringify(route),'Delivery route was lost');check(!row.address.delivery_quote_id,'Internal quote leaked in public order address');
   for(const actor of [u.host,u.vendor,u.bob])check((await db.query('select id from public.notifications where user_id=$1 and metadata->>\'order_id\'=$2',[actor,orderId])).rows.length>0,'Expected role did not receive a backend notification');
   check((await db.query("select id from public.wallet_transactions where user_id=$1 and activity_type='goodies_order_payment'",[u.host])).rows.length===1,'Delivery lifecycle duplicated the Wallet debit');
  });
 }finally{await db.close();}
});
