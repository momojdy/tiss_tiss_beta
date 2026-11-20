import {sharedBillHarness,sbUsers as u,sbCheck as check,sbId} from './sharedBillHarness.ts';

const forward=['20261118032703_goodies_courier_mutation_integrity.sql','20261118033204_goodies_vendor_builder_and_request_contracts.sql','20261118033410_goodies_catalog_realtime.sql','20261118033451_goodies_scoped_staff_permissions.sql','20261120061607_goodies_restricted_store_admission.sql','20261120214000_goodies_group_store_and_product_admission.sql'];
Deno.test('business and merchant restrictions pause new sales without losing existing orders or payer refunds',async t=>{
 const h=await sharedBillHarness(),{db}=h;
 const checkout=(key:string)=>db.query<{id:string}>("select * from public.place_goodies_order_with_payment_once($1,'wallet','shared-bill-test','pickup',null,null,'50937000000',$2::jsonb,10,0,1,0,0,11,null,null)",[key,JSON.stringify(h.snapshot().p_items)]);
 const deny=async(sql:string,args:unknown[]=[])=>{let code='';try{await db.query(sql,args);}catch(e){code=(e as {code:string}).code;}check(code==='42501','Expected a permission denial, received '+(code||'success'));};
 const visible=async()=>{await h.as(u.host);return (await db.query('select store_id from public.goodies_store_schedules')).rows.length;};
 try{
  await h.root();for(const file of forward)await db.exec(await Deno.readTextFile(new URL('../../migrations/'+file,import.meta.url)));
  // Ephemeral PGlite does not bundle pgcrypto's gen_random_bytes.
  // A deterministic value is sufficient for this single synthetic invite;
  // never install this stub in production or a shared database.
  await db.exec("create schema if not exists extensions; create function extensions.gen_random_bytes(n integer) returns bytea language sql as 'select decode(repeat(''ab'',n),''hex'')';");
  await db.query('update public.businesses set hours=$1::jsonb where id=$2',[JSON.stringify(Object.fromEntries(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>[day,{open:'00:00',close:'00:00',closed:false}]))),u.business]);
  await h.as(u.host);const prior=(await checkout('restriction-existing-order')).rows[0].id;
  const ownGroup=(await db.query<{group_id:string;invite_code:string}>("select * from public.goodies_group_order_create('shared-bill-test')")).rows[0];
  await db.query("select * from public.goodies_group_order_upsert_item($1,$2,'approved-line',1,'{}'::jsonb,null)",[ownGroup.group_id,u.product]);
  // A guessed UUID for a pending/unreviewed product must not disclose its name,
  // price or image through the SECURITY DEFINER group item receipt.
  await h.root();await db.query("insert into public.goodies_products(id,business_id,name,price,stock,is_available,review_status) values($1,$2,'Unreviewed synthetic secret',8,3,true,'pending')",[sbId(91),u.business]);
  await h.as(u.host);let productCode='';
  try{await db.query("select * from public.goodies_group_order_upsert_item($1,$2,'pending-line',1,'{}'::jsonb,null)",[ownGroup.group_id,sbId(91)]);}catch(e){productCode=(e as {code?:string}).code||'';}
  check(productCode==='P0001','Group item RPC exposed an unreviewed product');
  await h.enable();const shared=await h.create();await h.contribute(shared,u.alice,100,'restriction-partial-friend');
  const finalPayment=await h.create('share',h.snapshot(),'restriction-final-payment');
  await h.root();await db.query("update public.businesses set verification='restricted' where id=$1",[u.business]);await db.query('update public.goodies_store_schedules set is_live=false where business_id=$1',[u.business]);
  await t.step('restricted vendors cannot republish through the RPC or direct table update',async()=>{
   await h.as(u.vendor);await deny('select public.goodies_set_store_live($1,true)',[u.business]);await deny('update public.goodies_store_schedules set is_live=true where business_id=$1',[u.business]);
  });
  await t.step('stale live records are hidden from other customers and service-side routing',async()=>{
   await h.root();await db.query("update public.businesses set verification='verified' where id=$1",[u.business]);await db.query('update public.goodies_store_schedules set is_live=true where business_id=$1',[u.business]);await db.query("update public.businesses set verification='restricted' where id=$1",[u.business]);
   check((await db.query<{is_live:boolean}>('select is_live from public.goodies_store_schedules where business_id=$1',[u.business])).rows[0].is_live,'The stale live-state case was not created');
   check(await visible()===0,'Restricted store remains public');await h.as(u.vendor);check((await db.query('select store_id from public.goodies_store_schedules')).rows.length===1,'Owner lost store recovery/configuration reads');
   await h.as(null,'service_role');check((await db.query("select * from public.goodies_delivery_eligible_stores(array['shared-bill-test'])")).rows.length===0,'Routing still offers a restricted store');
   await h.as(u.host);await deny("select * from public.goodies_delivery_eligible_stores(array['shared-bill-test'])");
   await deny("select * from public.goodies_group_order_create('shared-bill-test')");
   await deny("select * from public.goodies_group_order_upsert_item($1,$2,'new-line',1,'{}'::jsonb,null)",[ownGroup.group_id,u.product]);
   await deny("select public.goodies_group_order_invite_friends($1,'{}'::uuid[])",[ownGroup.group_id]);
   await h.as(u.alice);await deny("select * from public.goodies_group_order_join($1)",[ownGroup.invite_code]);
  });
  await t.step('a final Shared Bill payment after restriction refunds every payer without creating an order',async()=>{
   await h.root();const orders=(await db.query<{n:number}>('select count(*)::integer n from public.goodies_orders')).rows[0].n;
   const result=await h.contribute(finalPayment,u.bob,440,'restriction-final-friend');check(!result.ok&&result.refunded&&result.status==='cancelled','Restricted Shared Bill checkout did not refund safely');
   await h.root();check((await db.query<{n:number}>('select count(*)::integer n from public.goodies_orders')).rows[0].n===orders,'Restricted finalization created an order');check(Number((await db.query<{balance:string}>('select balance from public.wallets where user_id=$1',[u.bob])).rows[0].balance)===100,'The final payer was not restored');
  });
  await t.step('checkout is denied without another debit, order or stock reservation',async()=>{
   const balances=await h.balances();await h.root();const before=Number((await db.query<{stock:number}>('select stock from public.goodies_products where id=$1',[u.product])).rows[0].stock);
   await h.as(u.host);let code='';try{await checkout('restriction-new-checkout');}catch(e){code=(e as {code:string}).code;}check(code==='42501','Restricted checkout was admitted');
   check(JSON.stringify(await h.balances())===JSON.stringify(balances),'Denied checkout changed balances');await h.root();check(Number((await db.query<{stock:number}>('select stock from public.goodies_products where id=$1',[u.product])).rows[0].stock)===before,'Denied checkout consumed stock');
  });
  await t.step('previous orders and funded requests retain cancellation and exactly-once refunds',async()=>{
   await h.as(u.vendor);await db.query('select public.accept_goodies_order($1)',[prior]);await db.query("select public.cancel_goodies_order_by_store($1,'other','Synthetic restriction recovery cancellation')",[prior]);
   await h.as(u.host);await db.query('select public.help_pay_cancel_request($1)',[shared]);await db.query('select public.help_pay_cancel_request($1)',[shared]);
   await h.root();check(Number((await db.query<{balance:string}>('select balance from public.wallets where user_id=$1',[u.host])).rows[0].balance)===100,'Existing payer funds were not restored once');
  });
  await t.step('lifting the business restriction restores explicit publication and checkout',async()=>{
   await h.root();await db.query("update public.businesses set verification='verified' where id=$1",[u.business]);await h.as(u.vendor);await db.query('select public.goodies_set_store_live($1,true)',[u.business]);check(await visible()===1,'Unrestricted store did not recover');await h.as(u.host);check(!!(await checkout('restriction-lifted-checkout')).rows[0]?.id,'Unrestricted checkout failed');
  });
  await t.step('another restricted owner cannot be bypassed by an unrestricted business admin',async()=>{
   await h.root();await db.query("insert into public.business_members(business_id,user_id,role) values($1,$2,'admin')",[u.business,u.bob]);
   await db.query("insert into public.wantiss_admin_account_restrictions(id,target_user_id,scope,kind,status,reason,starts_at,ends_at,created_by) values($1,$2,'GoodiesMerchant','Suspension','active','Synthetic admission review',now()-interval '1 minute',now()+interval '1 hour',$3)",[sbId(90),u.vendor,u.admin]);
   await h.as(u.bob);await deny('select public.goodies_set_store_live($1,true)',[u.business]);check(await visible()===0,'Account-restricted store remains public');
   await h.root();await db.query("update public.wantiss_admin_account_restrictions set status='lifted' where id=$1",[sbId(90)]);check(await visible()===1,'Lifted restriction did not restore eligibility');
  });
 }finally{await db.close();}
});
