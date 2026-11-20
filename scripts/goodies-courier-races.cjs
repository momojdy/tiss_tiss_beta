const assert=require('node:assert/strict');

module.exports=async({sql,race,raceAfterLock})=>{
 const vendor='80000000-0000-4000-8000-000000000001',customer='80000000-0000-4000-8000-000000000002',business='80000000-0000-4000-8000-000000000003';
 const courier='c0000000-0000-4000-8000-000000000001',admin='c0000000-0000-4000-8000-000000000002',replacement='c0000000-0000-4000-8000-000000000003';
 const as=(actor,statement)=>sql(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);${statement};commit;`).split('\n').at(-1);
 sql(`insert into auth.users(id,email_confirmed_at) values('${courier}',now()),('${admin}',now()),('${replacement}',now());insert into public.profiles(id,full_name,role) values('${courier}','Synthetic courier','customer'),('${admin}','Synthetic courier operator','super_admin'),('${replacement}','Synthetic replacement courier','customer');insert into public.wantiss_admin_staff(user_id,display_name,role,status) values('${admin}','Synthetic courier operator','super_admin','active');insert into public.goodies_courier_roster(courier_id,is_approved,added_by) values('${courier}',true,'${admin}'),('${replacement}',true,'${admin}');insert into public.wallets(user_id,balance) values('${customer}',500) on conflict(user_id) do update set balance=500;update public.goodies_store_schedules set delivery_fee=2,delivery_pricing_mode='fixed',delivery_modes=array['delivery','pickup'] where store_id='race-store';`);
 const product=sql(`insert into public.goodies_products(business_id,name,price,stock,is_available,review_status) values('${business}','Synthetic courier race product',10,50,true,'approved') returning id`).split('\n')[0];
 sql(`create function public.synthetic_courier_lock(p_order uuid) returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is distinct from '${admin}'::uuid then raise exception 'Synthetic barrier denied' using errcode='42501';end if;perform 1 from public.goodies_orders where id=p_order for update;end$$;revoke all on function public.synthetic_courier_lock(uuid) from public,anon;grant execute on function public.synthetic_courier_lock(uuid) to authenticated;`);
 sql(`update public.goodies_products set review_status='approved',is_available=true where id='${product}'`);
 let seq=0;
 const prepare=(accept=true)=>{
  sql(`update public.goodies_courier_roster set is_approved=true where courier_id in ('${courier}','${replacement}')`);
  as(courier,'select public.goodies_set_courier_availability(true,false)');as(replacement,'select public.goodies_set_courier_availability(true,false)');
  const id=as(customer,`select id from public.place_goodies_order_with_payment_once('native-courier-${++seq}','wallet','race-store','delivery',null,'{"l":"Home","t":"Synthetic delivery destination"}'::jsonb,'50937000000','[{"id":"${product}","q":1,"p":10}]'::jsonb,10,2,1,0,0,13,null,null)`);assert.match(id,/^[0-9a-f-]{36}$/);
  as(vendor,`select public.accept_goodies_order('${id}');select public.set_goodies_order_status('${id}','preparing');select public.set_goodies_order_status('${id}','ready');select public.goodies_assign_courier('${id}','${courier}')`);
  if(accept)as(courier,`select public.goodies_courier_respond_assignment('${id}',true)`);
  return id;
 };
 const noDeadlock=values=>assert.ok(values.every(v=>!/deadlock detected/i.test(v.stderr)),JSON.stringify(values));
 const lockedOrder=id=>`select public.synthetic_courier_lock('${id}');select pg_sleep(0.8)`;
 const cancel=id=>`select public.goodies_admin_cancel_order('${id}','Synthetic courier concurrency cancellation')`;
 const initialBalance=Number(sql(`select balance from public.wallets where user_id='${customer}'`));
 const offered=prepare(false);
 let values=await raceAfterLock(`${lockedOrder(offered)};${cancel(offered)}`,`select public.goodies_courier_respond_assignment('${offered}',true)`,'courier_offer_cancel',[admin,courier]);
 noDeadlock(values);assert.equal(values[0].code,0,JSON.stringify(values));assert.notEqual(values[1].code,0);assert.equal(sql(`select status||'/'||payment_status from public.goodies_orders where id='${offered}'`),'cancelled/refunded');assert.equal(Number(sql(`select balance from public.wallets where user_id='${customer}'`)),initialBalance);
 console.log('PASS: offer acceptance racing cancellation never deadlocks, resurrects the order or loses its refund.');

 const gps=prepare();values=await raceAfterLock(`${lockedOrder(gps)};${cancel(gps)}`,`select public.goodies_courier_update_location('${gps}',18.5,-72.3,5,0,0)`,'courier_gps_cancel',[admin,courier]);
 noDeadlock(values);assert.equal(values[0].code,0,JSON.stringify(values));assert.notEqual(values[1].code,0);assert.equal(sql(`select status from public.goodies_orders where id='${gps}'`),'cancelled');assert.equal(Number(sql(`select balance from public.wallets where user_id='${customer}'`)),initialBalance);
 console.log('PASS: a GPS update racing cancellation waits for the order and cannot persist a stale authorized sample.');

 const pickup=prepare();values=await race(`select public.goodies_courier_update_delivery_status('${pickup}','picked_up')`,`select public.goodies_courier_update_delivery_status('${pickup}','picked_up')`,'courier_pickup_retry',[courier,courier]);
 noDeadlock(values);assert.equal(values.filter(v=>v.code===0).length,1,JSON.stringify(values));assert.equal(sql(`select status from public.goodies_orders where id='${pickup}'`),'picked_up');
 console.log('PASS: concurrent pickup requests advance the order and assignment once.');
 values=await race(`select public.goodies_courier_update_delivery_status('${pickup}','delivered')`,`select public.goodies_courier_update_delivery_status('${pickup}','delivered')`,'courier_delivery_retry',[courier,courier]);
 noDeadlock(values);assert.equal(values.filter(v=>v.code===0).length,1,JSON.stringify(values));assert.equal(sql(`select status from public.goodies_orders where id='${pickup}'`),'completed');assert.equal(Number(sql(`select stock from public.goodies_products where id='${product}'`)),49);
 console.log('PASS: concurrent delivery requests complete one order and preserve one stock reservation.');

 const removal=prepare();values=await raceAfterLock(`select public.goodies_courier_update_delivery_status('${removal}','picked_up')`,`select public.goodies_admin_remove_courier('${courier}')`,'courier_remove_pickup',[courier,admin]);
 noDeadlock(values);assert.equal(values[0].code,0,JSON.stringify(values));assert.notEqual(values[1].code,0);assert.match(values[1].stderr,/Resolve the courier delivery/);assert.equal(sql(`select is_approved::text from public.goodies_courier_roster where courier_id='${courier}'`),'true');as(courier,`select public.goodies_courier_update_delivery_status('${removal}','delivered')`);
 console.log('PASS: removal racing pickup requires operational resolution and preserves the physical handoff.');

 const reassign=prepare(false);values=await raceAfterLock(`${lockedOrder(reassign)};select public.goodies_assign_courier('${reassign}','${replacement}')`,`select public.goodies_courier_respond_assignment('${reassign}',true)`,'courier_reassign_accept',[admin,courier]);
 noDeadlock(values);assert.equal(values[0].code,0,JSON.stringify(values));assert.notEqual(values[1].code,0);assert.equal(sql(`select courier_id||'/'||status from public.goodies_delivery_assignments where order_id='${reassign}'`),replacement+'/offered');as(admin,cancel(reassign));
 console.log('PASS: reassignment racing old-courier acceptance authorizes only the replacement courier.');
 assert.equal(Number(sql("select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in ('goodies_products','goodies_store_schedules','goodies_builder_configs','goodies_order_reviews')")),4);
 console.log('PASS: all four RLS-protected catalog relations are present in the real PostgreSQL publication.');
 console.log('All six courier PostgreSQL races passed with synthetic orders and Wallets only.');
};
