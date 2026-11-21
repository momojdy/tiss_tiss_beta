const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
module.exports=async function({actors,anonymous,pg,scenario,report,storageProof}){
 const a=actors,q=value=>"'"+String(value).replaceAll("'","''")+"'",json=value=>q(JSON.stringify(value))+'::jsonb';
 const call=async(actor,name,args={})=>{const response=await actor.sdk.rpc(name,args);assert.equal(response.error,null,name+': '+response.error?.message);return response.data;};
 const denied=async(actor,name,args={},codes=['42501','28000','P0001','P0002','22023'])=>{const response=await actor.sdk.rpc(name,args);assert.ok(response.error,name+' unexpectedly succeeded');assert.ok(codes.includes(response.error.code),name+' failed for an unexpected reason: '+JSON.stringify(response.error));};
 const rows=async(actor,table,columns='*',key,value)=>{let query=actor.sdk.from(table).select(columns);if(key)query=query.eq(key,value);const response=await query;assert.equal(response.error,null,table+': '+response.error?.message);return response.data;};
 const business=randomUUID(),otherBusiness=randomUUID(),store='local-api-'+business;
 const hours=Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>[day,{open:'00:00',close:'00:00',closed:false}]));
 for(const actor of Object.values(a))pg(`insert into public.profiles(id,full_name) values(${q(actor.id)},'Synthetic API account');insert into public.wallets(user_id,balance) values(${q(actor.id)},100);`);
 pg(`insert into public.wantiss_admin_staff(user_id,display_name,role,status) values(${q(a.superAdmin.id)},'Synthetic API administrator','super_admin','active'),(${q(a.restrictedStaff.id)},'Synthetic restricted staff','staff','active');
 insert into public.businesses(id,name,verification) values(${q(business)},'Synthetic API merchant','verified'),(${q(otherBusiness)},'Other synthetic API merchant','verified');
 insert into public.business_members(business_id,user_id,role) values(${q(business)},${q(a.vendor.id)},'owner'),(${q(otherBusiness)},${q(a.otherVendor.id)},'owner'),(${q(business)},${q(a.vendorStaff.id)},'staff'),(${q(otherBusiness)},${q(a.otherVendorStaff.id)},'staff');
 insert into public.goodies_store_schedules(business_id,store_id,category,is_live,min_order,delivery_fee,delivery_modes,hours,accept_cash_on_delivery,store_latitude,store_longitude) values(${q(business)},${q(store)},'groceries',true,0,2,array['pickup','delivery'],${json(hours)},true,18.5,-72.3);
 insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by) values('goodies.content','en',1,'published',${json({v:5,fees:{svc:1,tips:'0',pay:{Wallet:true,Card:true,Cash:true}},deals:[]})},${q(a.superAdmin.id)},${q(a.superAdmin.id)});
 insert into public.exchange_rates(from_currency,to_currency,wantiss_rate,market_rate,is_active,expires_at) values('USD','HTG',100,100,true,now()+interval '1 day');
 insert into public.goodies_courier_roster(courier_id,is_approved,added_by) values(${q(a.courier.id)},true,${q(a.superAdmin.id)}),(${q(a.otherCourier.id)},true,${q(a.superAdmin.id)});
 update private.goodies_settlement_config set enabled=true,starts_at=now()-interval '1 hour';`);
 const balance=actor=>Number(pg(`select balance from public.wallets where user_id=${q(actor.id)}`));
 const productArgs={p_business:business,p_id:null,p_name:'Synthetic API rice',p_description:'Synthetic test product',p_price:10,p_emoji:'🛍️',p_stock:30,p_restriction:'none',p_photo_url:null,p_photo_urls:[]};
 let product,order,delivery;
 await scenario('A customer-signed JWT resolves the same database identity through PostgREST',async()=>{
  const response=await a.customer.sdk.rpc('goodies_push_registration_status');
  assert.equal(response.error,null,response.error?.message);assert.ok(response.data);
 });
 await scenario('Customer and unrelated vendor cannot save products in another merchant account',async()=>{
  await denied(a.customer,'goodies_vendor_save_product',productArgs,['42501']);await denied(a.otherVendor,'goodies_vendor_save_product',productArgs,['42501']);
  await denied(a.vendorStaff,'goodies_vendor_save_product',productArgs,['42501']);
 });
 await scenario('The owning vendor saves a real pending product that remains hidden from anonymous shoppers',async()=>{
  product=await call(a.vendor,'goodies_vendor_save_product',productArgs);assert.match(product,/^[a-f0-9-]{36}$/);
  const own=await rows(a.vendor,'goodies_products','id,review_status,is_available','id',product);assert.equal(own[0].review_status,'pending');assert.equal(own[0].is_available,false);
  const publicRows=await anonymous.from('goodies_products').select('id').eq('id',product);assert.equal(publicRows.error,null);assert.equal(publicRows.data.length,0);
 });
 await scenario('Product rejection requires a reason and restricted staff cannot moderate',async()=>{
  await denied(a.superAdmin,'goodies_admin_review_product',{p_product_id:product,p_status:'rejected',p_note:''},['22023','P0001']);
  await denied(a.restrictedStaff,'goodies_admin_review_product',{p_product_id:product,p_status:'approved',p_note:null},['42501']);
 });
 await scenario('Super-admin approval makes the same vendor product available in the public catalogue',async()=>{
  await call(a.superAdmin,'goodies_admin_review_product',{p_product_id:product,p_status:'approved',p_note:null});
  await call(a.vendor,'goodies_vendor_set_product_availability',{p_business:business,p_id:product,p_available:true});
  const response=await anonymous.from('goodies_products').select('id').eq('id',product);assert.equal(response.error,null);assert.equal(response.data[0].id,product);
 });
 const checkout=(key,overrides={})=>({p_idempotency_key:key,p_payment_method:'wallet',p_store_id:store,p_order_type:'pickup',p_scheduled_for:null,p_address:null,p_contact_phone:'50937000000',p_items:[{id:product,k:product,p:10,q:1,options:{size:null,drink:false,discount_pct:0}}],p_subtotal:10,p_delivery_fee:0,p_service_fee:1,p_discount:0,p_tip:0,p_total:11,p_notes:null,p_promo_code:null,...overrides});
 await scenario('Server pricing rejects a tampered product price without changing balance or stock',async()=>{
  const before=balance(a.customer),stock=pg(`select stock from public.goodies_products where id=${q(product)}`);
  await denied(a.customer,'place_goodies_order_with_payment_once',checkout('local-api-tamper-'+product,{p_items:[{id:product,p:0.01,q:1,options:{size:null,drink:false,discount_pct:0}}]}),['P0001','22023']);
  for(const [name,change] of Object.entries({subtotalCent:{p_subtotal:9.99,p_total:10.99},totalCent:{p_total:10.99},fractionalCent:{p_subtotal:10.001,p_total:11.001},feeCent:{p_service_fee:0.99,p_total:10.99}})){
   const response=await a.customer.sdk.rpc('place_goodies_order_with_payment_once',checkout('local-api-tamper-'+name+'-'+product,change));
   assert.ok(response.error,'Authoritative pricing accepted '+name+': '+JSON.stringify(response.data));
   assert.ok(['P0001','22023'].includes(response.error.code),JSON.stringify(response.error));
  }
  assert.equal(balance(a.customer),before);assert.equal(pg(`select stock from public.goodies_products where id=${q(product)}`),stock);
 });
 await scenario('Concurrent SDK checkout retries create one paid order, one debit and one stock reservation',async()=>{
  const payload=checkout('local-api-once-'+product),before=balance(a.customer);
  const responses=await Promise.all([call(a.customer,'place_goodies_order_with_payment_once',payload),call(a.customer,'place_goodies_order_with_payment_once',payload)]);
  order=responses[0][0].id;assert.equal(responses[1][0].id,order);assert.equal(balance(a.customer),before-11);
  assert.equal(Number(pg(`select stock from public.goodies_products where id=${q(product)}`)),29);
  assert.equal(Number(pg(`select count(*) from public.wallet_transactions where activity_type='goodies_order_payment'`)),1);
 });
 await scenario('Cross-customer and cross-vendor reads and order acceptance are denied',async()=>{
  assert.equal((await rows(a.otherCustomer,'goodies_orders','id','id',order)).length,0);
  assert.equal((await rows(a.otherVendor,'goodies_orders','id','id',order)).length,0);
  assert.equal((await rows(a.otherVendorStaff,'goodies_orders','id','id',order)).length,0);
  assert.equal((await rows(a.vendorStaff,'goodies_orders','id','id',order))[0].id,order);
  await denied(a.otherVendor,'accept_goodies_order',{p_order_id:order},['42501','P0002']);
  await denied(a.otherCustomer,'set_goodies_order_status',{p_order_id:order,p_status:'cancelled'},['42501','P0002','P0001']);
  assert.equal(pg(`select status from public.goodies_orders where id=${q(order)}`),'placed');
 });
 await scenario('The vendor fulfills pickup through valid transitions and the customer and admin see the same completion',async()=>{
  await call(a.vendor,'accept_goodies_order',{p_order_id:order});
  await denied(a.vendor,'set_goodies_order_status',{p_order_id:order,p_status:'completed'},['P0001','22023']);
  for(const status of ['preparing','ready','completed'])await call(a.vendor,'set_goodies_order_status',{p_order_id:order,p_status:status});
  assert.equal((await rows(a.customer,'goodies_orders','id,status,payment_status','id',order))[0].status,'completed');
  assert.ok(JSON.stringify(await call(a.superAdmin,'goodies_admin_orders_page',{p_offset:0,p_limit:100})).includes(order));
  await denied(a.restrictedStaff,'goodies_admin_orders_page',{p_offset:0,p_limit:100},['42501']);
 });
 await scenario('Customer cancellation refunds Wallet and restores stock exactly once across retries',async()=>{
  const before=balance(a.customer),stock=Number(pg(`select stock from public.goodies_products where id=${q(product)}`));
  const placed=await call(a.customer,'place_goodies_order_with_payment_once',checkout('local-api-cancel-'+product));const id=placed[0].id;
  await call(a.customer,'set_goodies_order_status',{p_order_id:id,p_status:'cancelled'});
  await denied(a.customer,'set_goodies_order_status',{p_order_id:id,p_status:'cancelled'},['P0001','22023']);
  assert.equal(balance(a.customer),before);assert.equal(Number(pg(`select stock from public.goodies_products where id=${q(product)}`)),stock);
  assert.equal(pg(`select status||':'||payment_status from public.goodies_orders where id=${q(id)}`),'cancelled:refunded');
 });
 await scenario('Card checkout reserves stock once across concurrent retries and blocks acceptance before payment',async()=>{
  const args=checkout('local-api-card-'+product);delete args.p_payment_method;
  const beforeBalance=balance(a.customer),beforeStock=Number(pg('select stock from public.goodies_products where id='+q(product)));
  const results=await Promise.all([call(a.customer,'place_goodies_card_order_once',args),call(a.customer,'place_goodies_card_order_once',args)]);
  const id=results[0][0].id;assert.equal(results[1][0].id,id);
  assert.equal(Number(pg('select stock from public.goodies_products where id='+q(product))),beforeStock-1);
  assert.equal((await rows(a.otherCustomer,'goodies_orders','id','id',id)).length,0);
  await denied(a.vendor,'accept_goodies_order',{p_order_id:id},['P0001','22023']);
  await call(a.customer,'set_goodies_order_status',{p_order_id:id,p_status:'cancelled'});
  assert.equal(Number(pg('select stock from public.goodies_products where id='+q(product))),beforeStock);
  assert.equal(balance(a.customer),beforeBalance);
 });
 await scenario('A customer cannot directly rewrite the order total or payment status',async()=>{
  const response=await a.customer.sdk.from('goodies_orders').update({total:0,payment_status:'refunded'}).eq('id',order);
  assert.equal(response.error?.code,'42501');assert.equal(pg(`select total||':'||payment_status from public.goodies_orders where id=${q(order)}`),'11.00:paid');
 });
 const deliveryCheckout=key=>{
  const id=randomUUID(),address={l:'Home',t:'Synthetic local address',lat:18.51,lon:-72.31};
  pg(`update public.goodies_store_schedules set delivery_pricing_mode='distance' where store_id=${q(store)};
  insert into public.goodies_delivery_quotes(id,customer_id,store_id,address_payload,distance_m,fee,expires_at,origin_latitude,origin_longitude,destination_latitude,destination_longitude,route_geometry)
  values(${q(id)},${q(a.customer.id)},${q(store)},${json(address)},1000,2,now()+interval '10 minutes',18.5,-72.3,18.51,-72.31,${json({type:'LineString',coordinates:[[-72.3,18.5],[-72.31,18.51]]})});`);
  return checkout(key,{p_order_type:'delivery',p_address:{...address,delivery_quote_id:id},p_delivery_fee:2,p_total:13});
 };
 await scenario('A delivery quote belongs to its customer and cannot be reused by another account',async()=>{
  const payload=deliveryCheckout('local-api-delivery-'+product),before=balance(a.otherCustomer);
  await denied(a.otherCustomer,'place_goodies_order_with_payment_once',payload,['P0001','22023']);assert.equal(balance(a.otherCustomer),before);
  delivery=(await call(a.customer,'place_goodies_order_with_payment_once',payload))[0].id;
  assert.equal(pg(`select delivery_latitude||':'||delivery_longitude from public.goodies_orders where id=${q(delivery)}`),'18.51:-72.31');
 });
 await scenario('Vendor readiness creates an authorized courier offer; another courier cannot accept it',async()=>{
  await call(a.courier,'goodies_set_courier_availability',{p_is_available:true,p_accepts_cash_on_delivery:false});
  await call(a.vendor,'accept_goodies_order',{p_order_id:delivery});
  for(const status of ['preparing','ready'])await call(a.vendor,'set_goodies_order_status',{p_order_id:delivery,p_status:status});
  await call(a.vendor,'goodies_assign_courier',{p_order_id:delivery,p_courier_id:a.courier.id});
  await denied(a.otherCourier,'goodies_courier_respond_assignment',{p_order_id:delivery,p_accept:true},['42501','P0001','P0002']);
  await call(a.courier,'goodies_courier_respond_assignment',{p_order_id:delivery,p_accept:true});
  assert.ok(JSON.stringify(await call(a.courier,'goodies_courier_orders')).includes(delivery));
 });
 await scenario('Only the assigned courier can report GPS and only the owning customer can read it',async()=>{
  const location={p_order_id:delivery,p_latitude:18.505,p_longitude:-72.305,p_accuracy_m:5,p_heading:0,p_speed_mps:0};
  await denied(a.otherCourier,'goodies_courier_update_location',location,['42501','P0001','P0002']);
  await call(a.courier,'goodies_courier_update_location',location);
  const owned=await rows(a.customer,'goodies_delivery_assignments','latitude,longitude,location_updated_at','order_id',delivery);
  assert.equal(owned[0].latitude,18.505);assert.equal(owned[0].longitude,-72.305);assert.ok(owned[0].location_updated_at);
  assert.equal((await rows(a.otherCustomer,'goodies_delivery_assignments','latitude','order_id',delivery)).length,0);
 });
 await scenario('Courier pickup and completion synchronize customer, vendor and admin state',async()=>{
  for(const status of ['picked_up','delivered'])await call(a.courier,'goodies_courier_update_delivery_status',{p_order_id:delivery,p_status:status});
  for(const actor of [a.customer,a.vendor])assert.equal((await rows(actor,'goodies_orders','id,status','id',delivery))[0].status,'completed');
  assert.ok(JSON.stringify(await call(a.superAdmin,'goodies_admin_orders_page',{p_offset:0,p_limit:100})).includes(delivery));
  assert.equal(pg(`select status from public.goodies_delivery_assignments where order_id=${q(delivery)}`),'delivered');
  assert.ok(Number(pg(`select extract(epoch from hold_until-now()) from private.goodies_order_settlements where order_id=${q(delivery)}`))>23*3600);
 });
 let ownOrder;
 await scenario('The vendor assigns its own driver without claiming platform-courier GPS',async()=>{
  ownOrder=(await call(a.customer,'place_goodies_order_with_payment_once',deliveryCheckout('local-api-own-driver-'+product)))[0].id;
  await call(a.vendor,'accept_goodies_order',{p_order_id:ownOrder});
  for(const status of ['preparing','ready'])await call(a.vendor,'set_goodies_order_status',{p_order_id:ownOrder,p_status:status});
  await call(a.vendor,'goodies_assign_own_driver',{p_order_id:ownOrder,p_driver_name:'Synthetic driver',p_driver_phone:'50937000000'});
  assert.equal(pg(`select status from public.goodies_orders where id=${q(ownOrder)}`),'picked_up');
  assert.equal(pg(`select self_delivery from public.goodies_orders where id=${q(ownOrder)}`),'true');
 });
 await scenario('Private proof submission requires an owned existing object and a customer confirms only their own delivery',async()=>{
  await call(a.superAdmin,'goodies_admin_set_private_delivery_proofs',{p_enabled:true});
  const proof=business+'/'+ownOrder+'/synthetic-proof.'+(storageProof?'png':'jpg');
  await denied(a.vendor,'goodies_self_delivery_mark_delivered',{p_order_id:ownOrder,p_proof_url:proof},['22023']);
  if(storageProof)await storageProof.upload(proof);
  else pg(`insert into storage.objects(bucket_id,name) values('goodies-delivery-proofs',${q(proof)});`);
  await denied(a.otherVendor,'goodies_self_delivery_mark_delivered',{p_order_id:ownOrder,p_proof_url:proof},['42501','P0002']);
  await call(a.vendor,'goodies_self_delivery_mark_delivered',{p_order_id:ownOrder,p_proof_url:proof});
  await denied(a.otherCustomer,'goodies_customer_confirm_received',{p_order_id:ownOrder},['P0002','42501']);
  await call(a.customer,'goodies_customer_confirm_received',{p_order_id:ownOrder});
  assert.equal((await rows(a.customer,'goodies_orders','status,customer_confirmed_at','id',ownOrder))[0].status,'completed');
  if(storageProof)storageProof.reference=proof;
 });
 if(storageProof)await storageProof.verify();
 await scenario('Only an eligible order owner can submit a real review and admin publication reaches customer review reads',async()=>{
  const args={p_order_id:order,p_review_target:'store',p_rating:5,p_comment:'Synthetic API review'};
  await denied(a.otherCustomer,'goodies_submit_order_review',args,['42501','P0001','P0002']);
  const review=await call(a.customer,'goodies_submit_order_review',args);assert.match(review,/^[a-f0-9-]{36}$/);
  await call(a.superAdmin,'goodies_admin_review_order_review',{p_review_id:review,p_status:'approved',p_note:null});
  assert.ok(JSON.stringify(await call(a.customer,'goodies_store_reviews',{p_store_id:store,p_offset:0,p_limit:20})).includes('Synthetic API review'));
  assert.ok(JSON.stringify(await call(a.superAdmin,'goodies_admin_list_reviews',{p_offset:0,p_limit:20})).includes(review));
 });
 await scenario('Editing user metadata cannot elevate a customer into Goodies administration',async()=>{
  const response=await a.customer.sdk.auth.updateUser({data:{role:'super_admin',is_admin:true,wantiss_invite_accepted:true}});assert.equal(response.error,null);
  await a.customer.sdk.auth.refreshSession();await denied(a.customer,'goodies_admin_orders_page',{p_offset:0,p_limit:100},['42501']);
 });
 const sharedSnapshot=()=>{const snapshot=checkout('unused');delete snapshot.p_idempotency_key;delete snapshot.p_payment_method;return snapshot;};
 const sharedRequest=mode=>({p_mode:mode,p_total_cents:1100,p_checkout_key:'local-api-shared-'+randomUUID(),p_checkout_snapshot:sharedSnapshot()});
 await scenario('Shared Bill stays disabled by default and local 60/40 funding produces one original-customer order',async()=>{
  await denied(a.customer,'help_pay_create_request',sharedRequest('share'),['55000','P0001','42501']);
  pg('update private.goodies_shared_bill_config set wallet_enabled=true;');
  const ownerBalance=balance(a.customer),payerBalance=balance(a.otherCustomer),stock=Number(pg(`select stock from public.goodies_products where id=${q(product)}`));
  const request=await call(a.customer,'help_pay_create_request',sharedRequest('share'));
  assert.equal(Math.round(balance(a.customer)*100),Math.round(ownerBalance*100)-660);
  await denied(a.otherCourier,'help_pay_cancel_request',{p_request_id:request},['42501']);
  const args={p_request_id:request,p_amount_cents:440,p_idempotency_key:'local-api-contribution-'+request};
  const results=await Promise.all([call(a.otherCustomer,'help_pay_contribute_wallet',args),call(a.otherCustomer,'help_pay_contribute_wallet',args)]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[0].order_id,results[1].order_id);
  assert.equal(Math.round(balance(a.otherCustomer)*100),Math.round(payerBalance*100)-440);
  const paid=results[0].order_id;
  assert.equal(pg(`select customer_id||':'||payment_status from public.goodies_orders where id=${q(paid)}`),a.customer.id+':paid');
  assert.equal(Number(pg(`select stock from public.goodies_products where id=${q(product)}`)),stock-1);
  assert.equal((await rows(a.otherCustomer,'goodies_orders','id','id',paid)).length,0);
  await call(a.customer,'set_goodies_order_status',{p_order_id:paid,p_status:'cancelled'});
  assert.equal(balance(a.customer),ownerBalance);assert.equal(balance(a.otherCustomer),payerBalance);
  assert.equal(Number(pg(`select stock from public.goodies_products where id=${q(product)}`)),stock);
 });
 await scenario('Full-payment Shared Bill charges only the payer and cancellation refunds that payer once',async()=>{
  const ownerBalance=balance(a.customer),payerBalance=balance(a.otherCustomer),request=await call(a.customer,'help_pay_create_request',sharedRequest('full'));
  assert.equal(balance(a.customer),ownerBalance);
  const args={p_request_id:request,p_amount_cents:1100,p_idempotency_key:'local-api-full-'+request};
  const paid=await call(a.otherCustomer,'help_pay_contribute_wallet',args);assert.equal(paid.status,'fulfilled');assert.equal(balance(a.otherCustomer),payerBalance-11);
  const repeated=await call(a.otherCustomer,'help_pay_contribute_wallet',args);assert.equal(repeated.order_id,paid.order_id);assert.equal(balance(a.otherCustomer),payerBalance-11);
  await call(a.customer,'set_goodies_order_status',{p_order_id:paid.order_id,p_status:'cancelled'});
  assert.equal(balance(a.customer),ownerBalance);assert.equal(balance(a.otherCustomer),payerBalance);
 });
 await scenario('Cancelling a partially funded request restores every contribution across repeated cancellation',async()=>{
  const ownerBalance=balance(a.customer),payerBalance=balance(a.otherCustomer),request=await call(a.customer,'help_pay_create_request',sharedRequest('share'));
  const part=await call(a.otherCustomer,'help_pay_contribute_wallet',{p_request_id:request,p_amount_cents:100,p_idempotency_key:'local-api-part-'+request});assert.equal(part.status,'active');
  await call(a.customer,'help_pay_cancel_request',{p_request_id:request});await call(a.customer,'help_pay_cancel_request',{p_request_id:request});
  assert.equal(balance(a.customer),ownerBalance);assert.equal(balance(a.otherCustomer),payerBalance);
 });
 await scenario('Rejection survives availability changes and prevents new purchases',async()=>{
  await call(a.superAdmin,'goodies_admin_review_product',{p_product_id:product,p_status:'rejected',p_note:'Synthetic policy decision'});
  const availability=await a.vendor.sdk.rpc('goodies_vendor_set_product_availability',{p_business:business,p_id:product,p_available:true});
  if(availability.error)assert.ok(['P0001','22023'].includes(availability.error.code));
  const record=(await rows(a.vendor,'goodies_products','review_status,review_note,is_available','id',product))[0];
  assert.equal(record.review_status,'rejected');assert.equal(record.review_note,'Synthetic policy decision');assert.equal(record.is_available,false);
  await denied(a.customer,'place_goodies_order_with_payment_once',checkout('local-api-rejected-'+product),['P0001','22023']);
 });
 report.confirmedOrderIds={pickup:order,courier:delivery,ownDriver:ownOrder};
 report.proofScope=storageProof?'Real local Storage HTTP upload, private read/signing, object bytes and submission authorization; physical image capture and hosted access remain unverified.':'Existing-object metadata and submission authorization only; no Storage HTTP upload or physical image capture was tested.';
 report.localGateActivation='Settlement, private-proof and Shared Bill gates were enabled only in this disposable local database. Production activation is not part of this script.';
 const finalBalance=balance(a.customer);
 return async()=>{
  await scenario('Restored Auth sessions recover the same paid order without a second checkout debit',async()=>{
   const session=await a.customer.sdk.auth.getUser();assert.equal(session.error,null);assert.equal(session.data.user.id,a.customer.id);
   const recovered=await call(a.customer,'place_goodies_order_with_payment_once',checkout('local-api-once-'+product));
   assert.equal(recovered[0].id,order);assert.equal(balance(a.customer),finalBalance);
   assert.equal((await rows(a.otherCustomer,'goodies_orders','id','id',order)).length,0);
  });
 };
};
