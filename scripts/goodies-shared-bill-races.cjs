/* Runs only inside the existing runner's validated, fresh synthetic cluster. */
const assert=require('node:assert/strict');
module.exports=async({sql,race})=>{
 const id=n=>'b0000000-0000-4000-8000-'+String(n).padStart(12,'0'),host=id(1),alice=id(2),bob=id(3),product=id(20),business='80000000-0000-4000-8000-000000000003',vendor='80000000-0000-4000-8000-000000000001';
 sql(`insert into auth.users(id,email_confirmed_at) values('${host}',now()),('${alice}',now()),('${bob}',now());insert into public.profiles(id,full_name) values('${host}','Synthetic host'),('${alice}','Synthetic Alice'),('${bob}','Synthetic Bob');insert into public.wallets(user_id,balance) values('${host}',100),('${alice}',100),('${bob}',100);insert into public.goodies_products(id,business_id,name,price,stock,is_available,review_status) values('${product}','${business}','Synthetic Shared Bill race product',10,100,true,'approved');update public.goodies_products set review_status='approved',is_available=true where id='${product}';update private.goodies_shared_bill_config set wallet_enabled=true;`);
 const snapshot=JSON.stringify({p_store_id:'race-store',p_order_type:'pickup',p_scheduled_for:null,p_address:null,p_contact_phone:'50937000000',p_items:[{id:product,p:10,q:1,options:{size:null,drink:false,discount_pct:0}}],p_subtotal:10,p_delivery_fee:0,p_service_fee:1,p_discount:0,p_tip:0,p_total:11,p_notes:null,p_promo_code:null}).replaceAll("'","''");
 const as=(user,query)=>sql(`begin;set local role authenticated;do $$begin perform set_config('request.jwt.claim.sub','${user}',true);end$$;${query};commit;`);
 const create=key=>`select public.help_pay_create_for_account('share',1100,'${key}','${snapshot}','${host}')`;
 const pay=(request,amount,key,user)=>`select public.help_pay_contribute_for_account('${request}',${amount},'${key}','${user}')`;
 const request=key=>as(host,create(key));
 const balances=()=>sql(`select jsonb_object_agg(user_id,balance) from public.wallets where user_id in ('${host}','${alice}','${bob}')`);
 const requestDebits=request=>Number(sql(`select coalesce(sum(wallet_amount),0)*100 from public.wallet_transactions where reference_id='${request}' and direction='debit' and activity_type in ('help_pay_upfront','help_pay_contribution')`));
 let result=await race(create('native-shared-create-once'),create('native-shared-create-once'),'shared_create',[host,host]);
 assert.equal(result.filter(r=>r.code===0).length,2,JSON.stringify(result));
 const first=sql(`select id from public.help_pay_requests where checkout_key='native-shared-create-once'`);assert.match(first,/^[0-9a-f-]{36}$/);assert.equal(requestDebits(first),660);
 assert.equal(Number(sql(`select stock from public.goodies_products where id='${product}'`)),100);
 console.log('PASS: concurrent Shared Bill creation reserves the host 60% once and does not consume stock.');

 result=await race(pay(first,100,'native-shared-same-contribution',alice),pay(first,100,'native-shared-same-contribution',alice),'shared_retry',[alice,alice]);
 assert.equal(result.filter(r=>r.code===0).length,2,JSON.stringify(result));assert.equal(requestDebits(first),760);
 assert.equal(Number(sql(`select count(*) from public.help_pay_contributions where request_id='${first}' and contributor_id='${alice}'`)),1);
 console.log('PASS: concurrent contribution retries debit one payer once.');

 result=await race(pay(first,340,'native-shared-last-alice',alice),pay(first,340,'native-shared-last-bob',bob),'shared_last',[alice,bob]);
 assert.equal(result.filter(r=>r.code===0).length,1,JSON.stringify(result));assert.equal(requestDebits(first),1100);
 assert.equal(Number(sql(`select count(*) from public.goodies_orders o join public.help_pay_requests r on r.order_id=o.id where r.id='${first}' and o.customer_id='${host}' and o.payment_status='paid'`)),1);
 assert.equal(Number(sql(`select stock from public.goodies_products where id='${product}'`)),99);
 console.log('PASS: competing final payers create one paid customer order and reserve stock once.');

 const distinct=request('native-shared-distinct-payers');result=await race(pay(distinct,200,'native-shared-part-alice',alice),pay(distinct,240,'native-shared-part-bob',bob),'shared_parts',[alice,bob]);
 assert.equal(result.filter(r=>r.code===0).length,2,JSON.stringify(result));assert.equal(requestDebits(distinct),1100);assert.equal(sql(`select status from public.help_pay_requests where id='${distinct}'`),'fulfilled');
 console.log('PASS: simultaneous distinct contributions settle exactly the remaining 40%.');

 const before=balances(),cancelled=request('native-shared-cancel-race');
 result=await race(`select public.help_pay_cancel_request('${cancelled}')`,pay(cancelled,100,'native-shared-cancel-payment',alice),'shared_cancel',[host,alice]);
 assert.equal(result[0].code,0,JSON.stringify(result));assert.equal(sql(`select status from public.help_pay_requests where id='${cancelled}'`),'cancelled');assert.equal(balances(),before);
 console.log('PASS: cancellation racing a payment restores every payer without an orphan debit.');

 const repeatBefore=balances(),repeat=request('native-shared-refund-retry');as(alice,pay(repeat,100,'native-shared-before-cancel',alice));
 result=await race(`select public.help_pay_cancel_request('${repeat}')`,`select public.help_pay_cancel_request('${repeat}')`,'shared_refund',[host,host]);assert.equal(result.filter(r=>r.code===0).length,2,JSON.stringify(result));assert.equal(balances(),repeatBefore);
 assert.equal(Number(sql(`select count(*) from public.wallet_transactions where activity_type='help_pay_refund' and metadata->>'request_id'='${repeat}'`)),2);
 console.log('PASS: overlapping cancellation retries credit each original payer exactly once.');

 const orderId=sql(`select order_id from public.help_pay_requests where id='${first}'`),fundedBalances=balances();
 result=await race(`select public.decline_goodies_order('${orderId}','out_of_stock',null)`,`select public.decline_goodies_order('${orderId}','out_of_stock',null)`,'shared_decline',[vendor,vendor]);
 assert.ok(result.some(r=>r.code===0),JSON.stringify(result));assert.equal(sql(`select payment_status from public.goodies_orders where id='${orderId}'`),'refunded');
 const credits=Number(sql(`select coalesce(sum(wallet_amount),0)*100 from public.wallet_transactions where activity_type='help_pay_refund' and metadata->>'request_id'='${first}'`));assert.equal(credits,1100);assert.notEqual(balances(),fundedBalances);
 assert.equal(Number(sql(`select stock from public.goodies_products where id='${product}'`)),99);
 console.log('PASS: overlapping vendor rejection refunds the funded Shared Bill once and restores stock once.');
 const statusRequest=request('native-shared-status-expiry-race');sql(`update public.help_pay_requests set expires_at=now()+interval '2 seconds' where id='${statusRequest}'`);
 result=await race(pay(statusRequest,440,'native-shared-status-last',alice)+`;select pg_sleep(3)`,`select pg_sleep(2.2);select public.help_pay_status('${statusRequest}')`,'shared_status',[alice,host]);
 assert.equal(result.filter(r=>r.code===0).length,2,JSON.stringify(result));assert.equal(sql(`select status from public.help_pay_requests where id='${statusRequest}'`),'fulfilled');assert.equal(requestDebits(statusRequest),1100);
 assert.equal(Number(sql(`select count(*) from public.wallet_transactions where activity_type='help_pay_refund' and metadata->>'request_id'='${statusRequest}'`)),0);
 console.log('PASS: status polling crossing expiry waits for final funding and cannot refund a fulfilled order.');
 console.log('All eight Shared Bill PostgreSQL races passed using synthetic Wallets only.');
};
