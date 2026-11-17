import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('Shared Bill uses the final backend package for actual Wallet funding, one order, split refunds and authorization',async t=>{
 const h=await sharedBillHarness(),{db}=h;
 try{
  await t.step('funding is paused by default, including direct RPC calls',async()=>{
   await h.as(u.host);await h.denied("select public.help_pay_create_request('share',1100,'synthetic-default-off',$1::jsonb)",[JSON.stringify(h.snapshot())]);
   check((await db.query<{enabled:boolean}>('select public.help_pay_wallet_enabled() as enabled')).rows[0].enabled===false,'Funding unexpectedly enabled');
  });
  await h.enable();
  await t.step('60/40 debits the host and two contributors, with one real owner order and one stock reservation',async()=>{
   const before=await h.balances(),id=await h.create();
   await h.root();check(Number((await db.query<{balance:string}>('select balance from public.wallets where user_id=$1',[u.host])).rows[0].balance)===93.4,'Host upfront debit incorrect');
   check(Number((await db.query<{n:string}>('select count(*) n from public.goodies_orders')).rows[0].n)===0,'Created order before full funding');
   const partial=await h.contribute(id,u.alice,200);check(partial.status==='active','Partial payment finalized order');
   const paid=await h.contribute(id,u.bob,240,'synthetic-final-key');check(paid.ok&&paid.status==='fulfilled','Final contribution did not create an order');
   const retry=await h.contribute(id,u.bob,240,'synthetic-final-key');check(retry.already_processed&&retry.status==='fulfilled'&&retry.order_id===paid.order_id,'Lost response retry did not recover the same order');
   await h.root();const order=(await db.query<{customer_id:string;payment_method:string;payment_status:string}>('select customer_id,payment_method,payment_status from public.goodies_orders where id=$1',[paid.order_id])).rows[0];
   check(order.customer_id===u.host&&order.payment_method==='wallet'&&order.payment_status==='paid','Order identity or payment state incorrect');
   check(Number((await db.query<{stock:number}>('select stock from public.goodies_products where id=$1',[u.product])).rows[0].stock)===99,'Stock was not reserved once');
   const after=await h.balances();check(Math.round(100*(Number(before.find(r=>r[0]===u.host)![1])-Number(after.find(r=>r[0]===u.host)![1])))===660,'Host balance differs');
   await h.as(u.vendor);check((await db.query('select id from public.goodies_orders where id=$1',[paid.order_id])).rows.length===1,'Vendor cannot see its funded order');
   await h.as(u.otherVendor);check((await db.query('select id from public.goodies_orders where id=$1',[paid.order_id])).rows.length===0,'Other vendor read private order');
   await h.as(u.alice);check((await db.query('select id from public.goodies_orders where id=$1',[paid.order_id])).rows.length===0,'Contributor acquired order ownership');
   await h.as(u.admin);check((await db.query('select * from public.goodies_admin_orders_page(0,40)')).rows.length>0,'Admin cannot oversee the order');
  });
  await t.step('full-payment mode leaves the host untouched and requires one complete friend payment',async()=>{
   const before=await h.balances(),id=await h.create('full');await h.as(u.alice);await h.denied('select public.help_pay_contribute_wallet($1,100,$2)',[id,'synthetic-full-too-small']);
   const paid=await h.contribute(id,u.alice,1100);check(paid.status==='fulfilled','Full payment failed');const after=await h.balances();check(before.find(r=>r[0]===u.host)![1]===after.find(r=>r[0]===u.host)![1],'Full-payment request charged host');
  });
  await t.step('cancellation refunds every payer once and repeated cancellation remains safe',async()=>{
   const before=await h.balances(),id=await h.create();await h.contribute(id,u.alice,100);await h.as(u.host);
   await db.query('select public.help_pay_cancel_request($1)',[id]);await db.query('select public.help_pay_cancel_request($1)',[id]);
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Cancellation did not restore every Wallet exactly');
  });
  await t.step('scheduled expiry refunds without reopening any app',async()=>{
   const before=await h.balances(),id=await h.create();await h.contribute(id,u.alice,100);await h.root();await db.query("update public.help_pay_requests set expires_at=now()-interval '1 minute' where id=$1",[id]);
   await db.query('select public.help_pay_expire()');await db.query('select public.help_pay_expire()');check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Expiry did not restore every Wallet exactly');
  });
  await t.step('changed prices or unavailable stock cancel finalization and refund all contributors',async()=>{
   const before=await h.balances(),id=await h.create();await h.contribute(id,u.alice,100);await h.root();await db.query('update public.goodies_products set stock=0 where id=$1',[u.product]);
   const failed=await h.contribute(id,u.bob,340);check(!failed.ok&&failed.refunded&&failed.status==='cancelled'&&!('message' in failed),'Checkout failure did not refund safely');
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Failed finalization left money reserved');await db.query('update public.goodies_products set stock=100 where id=$1',[u.product]);
  });
  await t.step('anonymous calls, forged client writes and private helpers are denied',async()=>{
   await h.as(null,'anon');await h.denied('select public.help_pay_wallet_enabled()');await h.denied('select public.help_pay_status($1)',[u.product]);
   await h.as(u.stranger);await h.denied("insert into public.help_pay_requests(creator_id,service,mode,checkout_key,checkout_snapshot,total_cents,initial_cents,expires_at) values($1,'goodies','full','forged-client-request','{}',1100,0,now())",[u.stranger]);
   await h.denied('select private.help_pay_reverse_locked($1,$2)',[u.product,'cancelled']);
  });
  await t.step('exact authoritative cents reject one-cent total/subtotal tampering and fractional amounts before reservation',async()=>{
   const before=await h.balances();await h.as(u.host);
   for(const change of [{p_total:10.99},{p_subtotal:9.99,p_total:10.99},{p_subtotal:9.99,p_total:10.98},{p_service_fee:0,p_total:10},{p_discount:1,p_total:10},{p_total:11.001},{p_tip:1,p_total:12}])await h.denied("select public.help_pay_create_request('share',$1,$2,$3::jsonb)",[Math.round(Number(h.snapshot(change).p_total)*100),'tamper-'+JSON.stringify(change),JSON.stringify(h.snapshot(change))]);
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Tampered checkout reserved money');
  });
  await t.step('aggregate stock is checked without reserving inventory at request creation',async()=>{
   await h.root();await db.query('update public.goodies_products set stock=1 where id=$1',[u.product]);const before=await h.balances();await h.as(u.host);
   const checkout=h.snapshot({p_items:[{id:u.product,q:1,p:10},{id:u.product,q:1,p:10}],p_subtotal:20,p_total:21});
   await h.denied("select public.help_pay_create_request('share',2100,'synthetic-repeated-stock',$1::jsonb)",[JSON.stringify(checkout)]);
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Out-of-stock request reserved money');await db.query('update public.goodies_products set stock=100 where id=$1',[u.product]);
  });
  await t.step('account-bound financial RPCs reject stale confirmations after account changes',async()=>{
   const before=await h.balances();await h.as(u.alice);
   await h.denied("select public.help_pay_create_for_account('share',1100,'synthetic-stale-owner',$1::jsonb,$2)",[JSON.stringify(h.snapshot()),u.host]);
   const request=await h.create();await h.as(u.bob);
   await h.denied("select public.help_pay_contribute_for_account($1,100,'synthetic-stale-payer',$2)",[request,u.alice]);
   await h.as(u.host);await db.query('select public.help_pay_cancel_request($1)',[request]);check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Stale confirmation moved money');
  });
  await t.step('refund failures stay pending and recover once with audited finance-only retry',async()=>{
   const before=await h.balances(),request=await h.create();await h.contribute(request,u.alice,100);
   await h.root();await db.exec("create function public.synthetic_refund_failure() returns trigger language plpgsql as $$begin if new.activity_type='help_pay_refund' then raise exception 'SYNTHETIC_PRIVATE_REFUND_FAILURE' using errcode='55000';end if;return new;end$$;create trigger synthetic_refund_failure before insert on public.wallet_transactions for each row execute function public.synthetic_refund_failure();");
   await h.as(u.host);const pending=(await db.query<{value:{refunded:boolean;status:string}}>('select public.help_pay_cancel_request($1) as value',[request])).rows[0].value;
   check(!pending.refunded&&pending.status==='refund_pending','Failed refunds were reported completed');
   await h.as(u.vendor);await h.denied('select public.help_pay_admin_refund_queue()');await h.denied("select public.help_pay_admin_retry_refund($1,'Synthetic operator review')",[request]);
   await h.as(u.admin);const queue=(await db.query<{value:any[]}>('select public.help_pay_admin_refund_queue() as value')).rows[0].value;check(queue.some(row=>row.id===request&&row.refund_attempts===1),'Missing durable refund queue');
   check(!JSON.stringify(queue).includes('SYNTHETIC_PRIVATE'),'Refund queue leaked server error');
   await h.root();await db.exec('drop trigger synthetic_refund_failure on public.wallet_transactions;drop function public.synthetic_refund_failure();');
   await h.as(u.admin);await db.query("select public.help_pay_admin_retry_refund($1,'Synthetic operator review')",[request]);
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Refund retry did not restore every payer');
   check((await db.query("select * from public.wantiss_admin_audit_log where action='shared_bill_refund_retried' and resource_id=$1",[request])).rows.length===1,'Refund retry not audited');
   await h.as(u.host);await db.query('select public.help_pay_cancel_request($1)',[request]);check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Resolved refund was credited twice');
  });
  await t.step('accepted-friend invitations are private, authorized and deduplicated',async()=>{
   const request=await h.create();await h.as(u.host);await h.denied('select public.help_pay_share_to_friend($1,$2)',[request,u.alice]);
   await h.root();await db.query("insert into public.user_friendships(requester_id,recipient_id,status) values($1,$2,'accepted')",[u.host,u.alice]);
   await h.as(u.bob);await h.denied('select public.help_pay_share_to_friend($1,$2)',[request,u.alice]);
   await h.as(u.host);const first=(await db.query<{id:string}>('select public.help_pay_share_to_friend($1,$2) id',[request,u.alice])).rows[0].id;
   const second=(await db.query<{id:string}>('select public.help_pay_share_to_friend($1,$2) id',[request,u.alice])).rows[0].id;check(first===second,'Invitation created duplicate conversations');
   await h.root();const messages=(await db.query<{body:string}>('select body from public.messages where conversation_id=$1',[first])).rows;check(messages.length===1&&messages[0].body.includes('wantiss://help-pay/'+request),'Invitation duplicated or wrong destination');
   await h.as(u.stranger);const projection=(await db.query<{value:any}>('select public.help_pay_status($1) value',[request])).rows[0].value;
   check(projection.is_creator===false&&projection.order_id===null&&projection.contributors.length===0&&!('checkout_snapshot'in projection)&&!('creator_id'in projection),'QR access exposed private checkout/participant details');
   check((await db.query('select * from public.help_pay_requests where id=$1',[request])).rows.length===0,'Non-owner read private request table');
   await h.as(u.host);await db.query('select public.help_pay_cancel_request($1)',[request]);
  });
  await t.step('automatic refund recovery respects backoff, escalates repeat failures and retains cancellation',async()=>{
   const before=await h.balances(),request=await h.create();await h.contribute(request,u.alice,100);
   await h.root();await db.exec("create function public.synthetic_refund_failure() returns trigger language plpgsql as $$begin if new.activity_type='help_pay_refund' then raise exception 'SYNTHETIC_PRIVATE_REFUND_FAILURE' using errcode='55000';end if;return new;end$$;create trigger synthetic_refund_failure before insert on public.wallet_transactions for each row execute function public.synthetic_refund_failure();");
   await h.as(u.host);await db.query('select public.help_pay_cancel_request($1)',[request]);await db.query('select public.help_pay_cancel_request($1)',[request]);await db.query('select public.help_pay_status($1)',[request]);
   await h.root();check((await db.query<{n:number}>('select refund_attempts n from public.help_pay_requests where id=$1',[request])).rows[0].n===1,'Polling/cancellation ignored refund retry backoff');
   for(let attempt=0;attempt<7;attempt++){await db.query("update public.help_pay_requests set refund_retry_at=now()-interval '1 minute' where id=$1",[request]);await db.query('select public.help_pay_expire()');}
   const pending=(await db.query<{refund_attempts:number;refund_attention_required:boolean;refund_failure_code:string}>('select refund_attempts,refund_attention_required,refund_failure_code from public.help_pay_requests where id=$1',[request])).rows[0];
   check(pending.refund_attempts===8&&pending.refund_attention_required&&pending.refund_failure_code==='55000','Repeated failures were not marked for finance attention');
   await db.exec('drop trigger synthetic_refund_failure on public.wallet_transactions;drop function public.synthetic_refund_failure();');await db.query("update public.help_pay_requests set refund_retry_at=now()-interval '1 minute' where id=$1",[request]);
   await h.as(u.host);const result=(await db.query<{value:{status:string}}>('select public.help_pay_status($1) value',[request])).rows[0].value;check(result.status==='cancelled','Status recovery changed cancellation to expiry');
   await h.root();await db.query('select public.help_pay_expire()');check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Automatic recovery did not credit each original Wallet once');
  });
  await t.step('reused keys with a different amount/request and creator self-payment never debit a Wallet',async()=>{
   const request=await h.create(),second=await h.create('full');await h.contribute(request,u.alice,100,'synthetic-same-key');const before=await h.balances();
   await h.as(u.alice);await h.denied("select public.help_pay_contribute_wallet($1,101,'synthetic-same-key')",[request]);await h.denied("select public.help_pay_contribute_wallet($1,1100,'synthetic-same-key')",[second]);
   await h.as(u.host);await h.denied("select public.help_pay_contribute_wallet($1,100,'synthetic-self-payment')",[request]);
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Invalid/replayed contribution moved money');
   await h.as(u.host);await db.query('select public.help_pay_cancel_request($1)',[request]);await db.query('select public.help_pay_cancel_request($1)',[second]);
  });
  await t.step('server promotions and exact discount cents are validated, consumed only upon final funding',async()=>{
   await h.root();await db.query("insert into public.goodies_promotions(code,discount_type,discount_value,min_subtotal,store_id,is_active,max_redemptions) values('SYNTHETIC-SB10','percent',10,0,'shared-bill-test',true,10)");
   const checkout=h.snapshot({p_discount:1,p_total:10,p_promo_code:'SYNTHETIC-SB10'}),request=await h.create('full',checkout);
   await h.root();check((await db.query<{n:number}>("select redemption_count n from public.goodies_promotions where code='SYNTHETIC-SB10'")).rows[0].n===0,'Request creation consumed promo');
   await h.as(u.host);await h.denied("select public.help_pay_create_request('full',1001,'synthetic-promo-tamper',$1::jsonb)",[JSON.stringify({...checkout,p_discount:0.99,p_total:10.01})]);
   check((await h.contribute(request,u.alice,1000)).status==='fulfilled','Valid promotion could not fund');await h.root();check((await db.query<{n:number}>("select redemption_count n from public.goodies_promotions where code='SYNTHETIC-SB10'")).rows[0].n===1,'Promo was not consumed once');
  });
  await t.step('real owner-scoped delivery quotes survive the shared window and are consumed once at funding',async()=>{
   const quote='a0000000-0000-4000-8000-000000000040',address={l:'Home',t:'Synthetic delivery address'},route={type:'LineString',coordinates:[[-72.3,18.5],[-72.29,18.51],[-72.28,18.52]]};
   await h.root();await db.exec("update public.goodies_store_schedules set delivery_pricing_mode='distance' where store_id='shared-bill-test'");
   await db.query("insert into public.goodies_delivery_quotes(id,customer_id,store_id,address_payload,distance_m,fee,expires_at,created_at,origin_latitude,origin_longitude,destination_latitude,destination_longitude,route_geometry) values($1,$2,'shared-bill-test',$3::jsonb,1000,2,now()+interval '5 minutes',now()-interval '20 minutes',18.5,-72.3,18.52,-72.28,$4::jsonb)",[quote,u.host,JSON.stringify(address),JSON.stringify(route)]);
   const checkout=h.snapshot({p_order_type:'delivery',p_address:{...address,delivery_quote_id:quote},p_delivery_fee:2,p_total:13});const request=await h.create('full',checkout);
   await h.root();const reserved=(await db.query<{extended:boolean;consumed_at:string|null}>('select expires_at>now()+interval \'29 minutes\' as extended,consumed_at from public.goodies_delivery_quotes where id=$1',[quote])).rows[0];check(reserved.extended&&!reserved.consumed_at,'Quote was consumed prematurely or not extended');
   const paid=await h.contribute(request,u.alice,1300);check(paid.status==='fulfilled','Owner quote failed when a friend finalized');await h.root();const order=(await db.query<{delivery_route:unknown;store_latitude:number;delivery_latitude:number;address:Record<string,unknown>}>('select delivery_route,store_latitude,delivery_latitude,address from public.goodies_orders where id=$1',[paid.order_id])).rows[0];check(JSON.stringify(order.delivery_route)===JSON.stringify(route)&&order.store_latitude===18.5&&order.delivery_latitude===18.52&&!('delivery_quote_id' in order.address),'Delayed Shared Bill lost its actual quote geometry/coordinates or leaked the internal quote id');await h.root();check((await db.query<{used:boolean}>('select consumed_at is not null used from public.goodies_delivery_quotes where id=$1',[quote])).rows[0].used,'Funded order did not consume quote');
   await db.exec("update public.goodies_store_schedules set delivery_pricing_mode='fixed' where store_id='shared-bill-test'");
  });
  await t.step('builder selections/prices stay authoritative, and a disabled builder refunds every payer',async()=>{
   const config={id:'shared-builder',type:'pizza',name:'Synthetic server builder',enabled:true,available:true,base:10,sizes:[{id:'regular',add:0,avail:true}],groups:[{id:'base',kind:'one',req:true,min:1,max:1,items:[{id:'standard',free:true,avail:true}]}]};
   await h.root();await db.query("insert into public.goodies_builder_configs(business_id,builder_id,enabled,config) values($1,'shared-builder',true,$2::jsonb)",[u.business,JSON.stringify(config)]);
   const line={id:'byo:shared-builder',q:1,p:10,byo:{sid:'shared-bill-test',bid:'shared-builder',size:'regular',sel:{base:['standard']}}};
   const checkout=h.snapshot({p_items:[line]});await h.as(u.host);
   await h.denied("select public.help_pay_create_request('share',1100,'synthetic-invalid-builder',$1::jsonb)",[JSON.stringify({...checkout,p_items:[{...line,byo:{...line.byo,sel:{base:['standard'],forged:['free']}}}]})]);
   const paid=await h.create('full',checkout);check((await h.contribute(paid,u.alice,1100)).status==='fulfilled','Server-backed builder failed');
   const before=await h.balances(),stale=await h.create('share',checkout);await h.root();await db.query("update public.goodies_builder_configs set enabled=false where builder_id='shared-builder'");
   const refunded=await h.contribute(stale,u.bob,440);check(refunded.refunded&&!refunded.ok,'Disabled builder was purchased');check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Disabled builder refund changed total balances');
  });
  await t.step('the first-delivery fee rule stays authoritative after pickup orders and cannot be reused',async()=>{
   await h.as(u.stranger);const pickup=(await db.query<{id:string}>("select public.help_pay_create_request('full',1100,'synthetic-first-pickup',$1::jsonb) id",[JSON.stringify(h.snapshot())])).rows[0].id;
   check((await h.contribute(pickup,u.alice,1100)).status==='fulfilled','Prior pickup failed');
   await h.root();await db.exec("update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees,first}','true'::jsonb) where content_key='goodies.content'");
   const free=h.snapshot({p_order_type:'delivery',p_address:{l:'Home',t:'Synthetic first delivery'},p_delivery_fee:0,p_total:11});await h.as(u.stranger);
   const first=(await db.query<{id:string}>("select public.help_pay_create_request('full',1100,'synthetic-first-delivery',$1::jsonb) id",[JSON.stringify(free)])).rows[0].id;
   check((await h.contribute(first,u.bob,1100)).status==='fulfilled','Pickup incorrectly consumed first-delivery eligibility');
   await h.as(u.stranger);await h.denied("select public.help_pay_create_request('full',1100,'synthetic-first-delivery-reuse',$1::jsonb)",[JSON.stringify(free)]);
   await h.root();await db.exec("update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees,first}','false'::jsonb) where content_key='goodies.content'");
  });
  await t.step('deployed vendor product RPCs remain compatible and material product edits return to moderation',async()=>{
   await h.as(u.vendor);const product=(await db.query<{id:string}>("select public.goodies_vendor_save_product($1,null,'Synthetic revised product','Synthetic description',10,'🛍️',10,'none',null,'[]'::jsonb) id",[u.business])).rows[0].id;
   await h.as(u.admin);await db.query("select public.goodies_admin_review_product($1,'approved',null)",[product]);
   await h.as(u.vendor);await db.query("select public.goodies_vendor_save_product($1,$2,'Synthetic revised product','Synthetic description',12,'🛍️',10,'none',null,'[]'::jsonb)",[u.business,product]);
   const updated=(await db.query<{review_status:string;is_available:boolean}>('select review_status,is_available from public.goodies_products where id=$1',[product])).rows[0];check(updated.review_status==='pending'&&!updated.is_available,'Candidate migrations weakened the deployed material-edit moderation');
   await h.denied('select public.goodies_vendor_set_product_availability($1,$2,true)',[u.business,product]);await h.as(u.otherVendor);await h.denied('select public.goodies_vendor_set_product_availability($1,$2,true)',[u.business,product]);
  });
  await t.step('pausing new funding preserves participant recovery and finance activation is audited',async()=>{
   const before=await h.balances(),request=await h.create();await h.as(u.vendor);await h.denied("select public.help_pay_set_wallet_enabled(false,'Unauthorized pause test')");
   await h.as(u.admin);await db.query("select public.help_pay_set_wallet_enabled(false,'Synthetic pause acceptance')");
   await h.as(u.alice);await h.denied("select public.help_pay_contribute_wallet($1,100,'synthetic-paused-payment')",[request]);await h.as(u.host);await db.query('select public.help_pay_status($1)',[request]);await db.query('select public.help_pay_cancel_request($1)',[request]);
   check(JSON.stringify(before)===JSON.stringify(await h.balances()),'Paused funding blocked recovery');await h.as(u.admin);await db.query("select public.help_pay_set_wallet_enabled(true,'Synthetic resume acceptance')");
  });
 }finally{await db.close();}
});

Deno.test('Shared Bill migration rollback leaves the prior schema/checkout intact and the complete migration can be retried',async()=>{
 const h=await sharedBillHarness({integrity:false});try{
  const sql=await Deno.readTextFile(new URL('../../migrations/20261113101825_goodies_shared_bill_integrity.sql',import.meta.url));let failed=false;
  try{await h.db.exec(sql.replace('commit;','select public.synthetic_deliberate_migration_failure();\ncommit;'));}catch{failed=true;}check(failed,'Injected migration failure was not detected');await h.db.exec('rollback');
  check((await h.db.query<{name:string|null}>("select to_regclass('private.goodies_shared_bill_config')::text name")).rows[0].name===null,'Partial Shared Bill schema survived rollback');
  await h.db.exec(sql);check((await h.db.query<{enabled:boolean}>('select public.help_pay_wallet_enabled() enabled')).rows[0].enabled===false,'Clean retry enabled funding');
 }finally{await h.db.close();}
});
