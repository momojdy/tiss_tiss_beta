import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';

async function harness() {
 const h=await sharedBillHarness();
 await h.root();
 await h.db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-shared-profile-access-20261117.sql',import.meta.url)));
 const migrations=new URL('../../migrations/',import.meta.url);
 for await(const file of Deno.readDir(migrations)) if(file.name.endsWith('_goodies_courier_mutation_integrity.sql')) await h.db.exec(await Deno.readTextFile(new URL(file.name,migrations)));
 await h.db.query('insert into public.goodies_courier_roster(courier_id,is_approved,added_by) values($1,true,$2)',[u.bob,u.admin]);
 await h.as(u.bob);await h.db.query('select public.goodies_set_courier_availability(true,false)');
 await h.as(u.host);
 const id=(await h.db.query<{id:string}>("select * from public.place_goodies_order_with_payment_once('synthetic-courier-integrity','wallet','shared-bill-test','delivery',null,'{\"l\":\"Home\",\"t\":\"Synthetic test address\"}'::jsonb,'50937000000',$1::jsonb,10,2,1,0,0,13,null,null)",[JSON.stringify(h.snapshot().p_items)])).rows[0].id;
 await h.as(u.vendor);await h.db.query('select public.accept_goodies_order($1)',[id]);await h.db.query("select public.set_goodies_order_status($1,'preparing')",[id]);await h.db.query("select public.set_goodies_order_status($1,'ready')",[id]);await h.db.query('select public.goodies_assign_courier($1,$2)',[id,u.bob]);
 await h.as(u.bob);await h.db.query('select public.goodies_courier_respond_assignment($1,true)',[id]);
 return {...h,id};
}

Deno.test('courier metadata normalization accepts unknown accuracy and cannot roll back a valid location',async()=>{
 const h=await harness();try{
  for(const accuracy of [-1,20000,null]){
   await h.db.query('select public.goodies_courier_update_location($1,18.5,-72.3,$2,0,0)',[h.id,accuracy]);
   await h.root();const row=(await h.db.query<{assignment_accuracy:number|null;presence_accuracy:number|null}>('select a.accuracy_m assignment_accuracy,p.accuracy_m presence_accuracy from public.goodies_delivery_assignments a join public.goodies_courier_presence p on p.courier_id=a.courier_id where a.order_id=$1',[h.id])).rows[0];
   check(row.assignment_accuracy===row.presence_accuracy,'Assignment and courier presence disagree about GPS accuracy');await h.as(u.bob);
  }
  await h.denied("select public.goodies_courier_update_location($1,'NaN'::float8,0,null,null,null)",[h.id]);
 }finally{await h.db.close();}
});

Deno.test('a cancelled order remains cancelled and refunded after late courier responses',async()=>{
 const h=await harness();try{
  await h.as(u.admin);await h.db.query("select public.goodies_admin_cancel_order($1,'Synthetic cancellation acceptance')",[h.id]);
  await h.as(u.bob);await h.denied("select public.goodies_courier_update_delivery_status($1,'picked_up')",[h.id]);await h.denied('select public.goodies_courier_update_location($1,18.5,-72.3,5,0,0)',[h.id]);
  await h.root();const row=(await h.db.query<{status:string;payment_status:string}>('select status,payment_status from public.goodies_orders where id=$1',[h.id])).rows[0];check(row.status==='cancelled'&&row.payment_status==='refunded','Late courier request resurrected the cancelled order or changed its refund');
 }finally{await h.db.close();}
});

Deno.test('courier removal cannot abandon a physically picked-up delivery',async()=>{
 const h=await harness();try{
  await h.db.query("select public.goodies_courier_update_delivery_status($1,'picked_up')",[h.id]);await h.as(u.admin);
  await h.denied('select public.goodies_admin_remove_courier($1)',[u.bob]);
  await h.root();check((await h.db.query<{is_approved:boolean}>('select is_approved from public.goodies_courier_roster where courier_id=$1',[u.bob])).rows[0].is_approved,'Rejected removal partially revoked access');
  await h.as(u.bob);await h.db.query("select public.goodies_courier_update_delivery_status($1,'delivered')",[h.id]);await h.as(u.admin);await h.db.query('select public.goodies_admin_remove_courier($1)',[u.bob]);
 }finally{await h.db.close();}
});

Deno.test('revoked couriers cannot keep tracking or completing an existing assignment',async()=>{
 const h=await harness();try{
  await h.db.query("select public.goodies_courier_update_delivery_status($1,'picked_up')",[h.id]);await h.root();await h.db.query('update public.goodies_courier_roster set is_approved=false where courier_id=$1',[u.bob]);
  await h.as(u.bob);await h.denied('select public.goodies_courier_update_location($1,18.5,-72.3,5,0,0)',[h.id]);await h.denied("select public.goodies_courier_update_delivery_status($1,'delivered')",[h.id]);
 }finally{await h.db.close();}
});

Deno.test('stale assignment ownership or order state cannot authorize courier mutations',async()=>{
 const h=await harness();try{
  await h.root();await h.db.query('update public.goodies_orders set courier_id=$2 where id=$1',[h.id,u.alice]);
  await h.as(u.bob);await h.denied('select public.goodies_courier_update_location($1,18.5,-72.3,5,0,0)',[h.id]);await h.denied("select public.goodies_courier_update_delivery_status($1,'picked_up')",[h.id]);
  await h.root();await h.db.query("update public.goodies_orders set courier_id=$2,status='ready' where id=$1",[h.id,u.bob]);
  await h.as(u.bob);await h.denied('select public.goodies_courier_update_location($1,18.5,-72.3,5,0,0)',[h.id]);await h.denied("select public.goodies_courier_update_delivery_status($1,'picked_up')",[h.id]);
 }finally{await h.db.close();}
});

Deno.test('real courier pickup details are scoped to the current approved active assignment',async()=>{
 const h=await harness();try{
  await h.root();await h.db.query("update public.goodies_store_schedules set store_name='Synthetic pickup',address='Synthetic pickup address',city='Test city',country='HT',store_latitude=18.5,store_longitude=-72.3 where business_id=$1",[u.business]);
  await h.db.query('update public.goodies_orders set store_latitude=18.6,store_longitude=-72.4,delivery_latitude=18.7,delivery_longitude=-72.5 where id=$1',[h.id]);
  await h.as(u.bob);const details=(await h.db.query<{x:any}>('select public.goodies_courier_delivery_details($1) x',[h.id])).rows[0].x;
  check(details.store_name==='Synthetic pickup'&&details.store_address==='Synthetic pickup address, Test city, HT','Real pickup name/address missing');
  check(details.store_latitude===18.6&&details.store_longitude===-72.4&&details.delivery_latitude===18.7&&details.delivery_longitude===-72.5,'Order coordinate snapshot was lost');
  check(Object.keys(details).length===6,'Pickup projection included unnecessary private order fields');
  await h.root();await h.db.query('update public.goodies_orders set store_latitude=null where id=$1',[h.id]);
  await h.as(u.bob);const fallback=(await h.db.query<{x:any}>('select public.goodies_courier_delivery_details($1) x',[h.id])).rows[0].x;
  check(fallback.store_latitude===18.5&&fallback.store_longitude===-72.3,'Partial snapshot invented a hybrid pickup point');
  await h.root();await h.db.query('update public.goodies_store_schedules set store_longitude=null where business_id=$1',[u.business]);
  await h.as(u.bob);const unavailable=(await h.db.query<{x:any}>('select public.goodies_courier_delivery_details($1) x',[h.id])).rows[0].x;
  check(unavailable.store_latitude===null&&unavailable.store_longitude===null,'Incomplete pickup coordinates were presented as a map point');
  for(const actor of [u.host,u.vendor,u.alice,u.otherVendor]){await h.as(actor);await h.denied('select public.goodies_courier_delivery_details($1)',[h.id]);}
  await h.root();await h.db.query("update public.goodies_delivery_assignments set status='offered',offered_at=now()-interval '5 minutes' where order_id=$1",[h.id]);
  await h.as(u.bob);await h.denied('select public.goodies_courier_delivery_details($1)',[h.id]);
  await h.root();await h.db.query("update public.goodies_delivery_assignments set offered_at=now() where order_id=$1",[h.id]);
  await h.as(u.bob);check(!!(await h.db.query('select public.goodies_courier_delivery_details($1)',[h.id])).rows[0],'Current unexpired offer cannot show pickup details');
  await h.root();await h.db.query('update public.goodies_orders set courier_id=$2 where id=$1',[h.id,u.alice]);await h.as(u.bob);await h.denied('select public.goodies_courier_delivery_details($1)',[h.id]);
  await h.root();await h.db.query('update public.goodies_orders set courier_id=$2 where id=$1',[h.id,u.bob]);await h.db.query('update public.goodies_courier_roster set is_approved=false where courier_id=$1',[u.bob]);await h.as(u.bob);await h.denied('select public.goodies_courier_delivery_details($1)',[h.id]);
  await h.as(null,'anon');await h.denied('select public.goodies_courier_delivery_details($1)',[h.id]);
 }finally{await h.db.close();}
});
