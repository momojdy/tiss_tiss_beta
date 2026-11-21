/* Explicit opt-in provider acceptance: real Stripe sandbox + disposable local Goodies APIs.
 * No hosted Supabase URL, live-mode context or real card data is accepted.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {randomUUID,randomBytes,createHmac}=require('node:crypto'),{execFileSync,spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
exports.prepare=async function({args,report,registerSecret}){
 const value=flag=>args[args.indexOf(flag)+1];
 for(const flag of ['--stripe-cli','--stripe-config','--stripe-profile','--stripe-account'])assert.ok(args.includes(flag),'Supply '+flag+' for explicit sandbox acceptance.');
 const cli=fs.realpathSync(value('--stripe-cli')),config=fs.realpathSync(value('--stripe-config')),profile=value('--stripe-profile'),account=value('--stripe-account');
 assert.match(account,/^acct_[A-Za-z0-9]+$/);assert.match(profile,/^[A-Za-z0-9_-]+$/);
 const cliArgs=['--config',config,'--project-name',profile],cliEnv={...process.env,STRIPE_NO_AUTO_UPDATE:'1',STRIPE_CLI_TELEMETRY_OPTOUT:'1'};
 delete cliEnv.STRIPE_API_KEY;
 const identity=JSON.parse(execFileSync(cli,[...cliArgs,'whoami','--format','json'],{env:cliEnv,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}));
 assert.equal(identity.authorized,true);assert.equal(identity.mode,'test','Refuse live-mode Stripe access.');assert.equal(identity.account_id,account);
 const credentialFile=path.join(os.homedir(),'.config/stripe/credentials.json'),stat=fs.statSync(credentialFile);
 assert.equal(stat.uid,process.getuid());assert.equal(stat.mode&0o777,0o600,'Keep CLI credentials private.');
 const credentials=JSON.parse(fs.readFileSync(credentialFile,'utf8')),context=JSON.parse(credentials['oauth_active_context:'+profile]);
 assert.equal(context.account_id,account);assert.equal(context.livemode,false);
 const token=credentials['uat:'+profile];assert.equal(typeof token,'string');assert.ok(token.length>30);registerSecret(token);
 const runId=randomUUID(),requests=[],events=[],edgeChildren=new Map(),heldOrders=new Set(),captured=new Map();
 const provider=report.stripeSandbox={classification:'NOT VERIFIED',accountId:account,mode:'test',runId,realProviderContacted:true,liveChargesExecuted:false,productionDatabaseContacted:false,requests,events,limitations:['OAuth sandbox context headers are added by the test wrapper; handler business logic and actual Stripe HTTP responses are unchanged.','The server-only publishable-key fixture does not verify native/web 3DS authentication UI or real publishable-key configuration.','Local SQL/HTTP acceptance is not a deployed production webhook or installed-app certification.']};
 let customerId,listener,webhookServer,activeRuntime,disposed=false,workerToken,webhookSecret;
 const redact=text=>[token,workerToken,webhookSecret].filter(Boolean).reduce((s,v)=>s.split(v).join('[redacted]'),String(text));
 async function stripe(method,resource,params={},options={}){
  assert.match(resource,/^\/v1\/[A-Za-z0-9_/-]+$/);
  const encoded=new URLSearchParams();
  const add=(key,val)=>{if(Array.isArray(val))val.forEach((x,i)=>add(key+'['+i+']',x));else if(val&&typeof val==='object')Object.entries(val).forEach(([k,x])=>add(key+'['+k+']',x));else if(val!==undefined&&val!==null)encoded.append(key,String(val));};
  Object.entries(params).forEach(([k,v])=>add(k,v));
  const headers={Authorization:'Bearer '+token,'Stripe-Context':account,'Stripe-Livemode':'false','Stripe-Version':'2026-08-26.dahlia'};
  if(options.idempotency)headers['Idempotency-Key']=options.idempotency;
  if(method!=='GET')headers['Content-Type']='application/x-www-form-urlencoded';
  const response=await fetch('https://api.stripe.com'+resource+(method==='GET'&&encoded.size?'?'+encoded:''),{method,headers,...(method==='GET'?{}:{body:encoded.toString()}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();if('livemode'in data)assert.equal(data.livemode,false,'Stripe unexpectedly returned a live object.');
  requests.push({method,path:resource,status:response.status,requestId:response.headers.get('request-id')});
  if(!response.ok&&!options.allowError)throw Error(redact('Stripe sandbox '+response.status+': '+data.error?.code+' '+data.error?.message));
  return {data,status:response.status};
 }
 const balance=await stripe('GET','/v1/balance');assert.equal(balance.data.livemode,false);
 provider.authentication='PASS';
 async function startEdge(name,runtime){
  const {state,env,base,anonKey,serviceKey,denoBin,api}=runtime,wrapper=path.join(state,'stripe-'+name+'.ts'),logFile=path.join(state,'stripe-'+name+'.log');
  const source=[
   'import Stripe from "npm:stripe@18.5.0";',
   '// Add the current CLI OAuth context to real SDK requests; no response is replaced.',
   'const original=(Stripe.prototype as any)._setAuthenticator;',
   'if(typeof original!=="function")throw new Error("Reconcile pinned Stripe authentication adapter");',
   '(Stripe.prototype as any)._setAuthenticator=function(...args:any[]){original.apply(this,args);const authenticate=this._authenticator;this._authenticator=async(request:any)=>{await authenticate(request);request.headers["Stripe-Context"]=Deno.env.get("GOODIES_STRIPE_SANDBOX_CONTEXT");request.headers["Stripe-Livemode"]="false";};this.on("response",(r:any)=>console.log("GOODIES_STRIPE_API:"+JSON.stringify({method:r.method,path:r.path.split("?")[0],status:r.status,requestId:r.request_id})));};',
   'const serve=Deno.serve;',
   '(Deno as any).serve=(handler:any)=>serve({hostname:"127.0.0.1",port:0,onListen:address=>console.log("GOODIES_STRIPE_EDGE_PORT:"+address.port)},handler);',
   'await import('+JSON.stringify(pathToFileURL(path.join(root,'supabase/functions',name,'index.ts')).href)+');',
  ].join('\n');
  fs.writeFileSync(wrapper,source,{mode:0o600});const log=fs.openSync(logFile,'w',0o600);
  const child=spawn(denoBin,['run','--cached-only','--allow-read','--allow-env','--allow-net=127.0.0.1,api.stripe.com:443','--config',path.join(root,'supabase/functions/deno.json'),wrapper],{cwd:root,env:{...env,SUPABASE_URL:base,SUPABASE_ANON_KEY:anonKey,SUPABASE_SERVICE_ROLE_KEY:serviceKey,STRIPE_SECRET_KEY:token,STRIPE_PUBLISHABLE_KEY:'pk_test_server_only_fixture_not_for_client_authentication',STRIPE_WEBHOOK_SECRET:webhookSecret,GOODIES_STRIPE_SANDBOX_CONTEXT:account},stdio:['ignore','pipe',log]});fs.closeSync(log);
  edgeChildren.set(name,child);
  const port=await new Promise((resolve,reject)=>{
   let text='',settled=false;const fail=message=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();reject(Error(message+': '+redact(fs.readFileSync(logFile,'utf8').slice(-1800))));};
   const timer=setTimeout(()=>fail('Local '+name+' did not start'),30000);
   child.stdout.on('data',data=>{const lines=(text+data).split('\n');text=lines.pop();for(const line of lines){if(line.startsWith('GOODIES_STRIPE_API:'))requests.push({...JSON.parse(line.slice('GOODIES_STRIPE_API:'.length)),handler:name});const match=line.match(/GOODIES_STRIPE_EDGE_PORT:(\d+)/);if(match&&!settled){settled=true;clearTimeout(timer);resolve(Number(match[1]));}}});
   child.on('error',()=>fail('Cannot start '+name));child.on('exit',code=>fail('Local '+name+' exited ('+code+')'));
  });
  api.functionPorts.set(name,port);return port;
 }
 async function until(predicate,message,ms=30000){const end=Date.now()+ms;while(Date.now()<end){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,250));}throw Error(message);}
 async function dispose(){
  if(disposed)return;disposed=true;
  try{
  // Only the brand-new synthetic customer created by this run is eligible for cleanup.
  if(customerId){
   const list=(await stripe('GET','/v1/payment_intents',{customer:customerId,limit:100})).data;
   assert.equal(list.has_more,false);const cleanup=[];
   for(const pi of list.data){
    assert.equal(pi.livemode,false);assert.equal(pi.customer,customerId);assert.equal(pi.metadata?.wantiss_purpose,'goodies_order');
    if(pi.status==='succeeded'){
     const charge=(await stripe('GET','/v1/charges/'+pi.latest_charge)).data;
     if(charge.disputed){
      const disputes=(await stripe('GET','/v1/disputes',{payment_intent:pi.id,limit:100})).data.data;
      for(const dispute of disputes)if(dispute.status==='needs_response')await stripe('POST','/v1/disputes/'+dispute.id+'/close');
      if(disputes.some(dispute=>dispute.status!=='won'))continue;
     }
     if(charge.amount_refunded<charge.amount){await stripe('POST','/v1/refunds',{payment_intent:pi.id,amount:charge.amount-charge.amount_refunded},{idempotency:'goodies-sandbox-cleanup-'+runId+'-'+pi.id});cleanup.push(pi.id);}
    }else if(['requires_capture','requires_action','requires_confirmation','requires_payment_method'].includes(pi.status))await stripe('POST','/v1/payment_intents/'+pi.id+'/cancel',{}, {idempotency:'goodies-sandbox-cancel-'+runId+'-'+pi.id});
   }
   provider.cleanup={classification:'PASS',scope:'Remaining authorizations/payments for this run’s synthetic sandbox customer only.',refundedPaymentIntentIds:cleanup};
  }
  }finally{
  if(listener)listener.kill();
  if(webhookServer){webhookServer.closeAllConnections();await new Promise(resolve=>webhookServer.close(resolve));}
  for(const [name,child]of edgeChildren){child.kill();activeRuntime?.api.functionPorts.delete(name);}
  }
 }
 return {dispose,diagnostics(){if(!activeRuntime)return '';return ['place-goodies-card-order','process-goodies-card-refunds','refund-goodies-card-order','rapid-api'].map(name=>{const file=path.join(activeRuntime.state,'stripe-'+name+'.log');return fs.existsSync(file)?name+': '+redact(fs.readFileSync(file,'utf8').split('\n').filter(line=>/Error:|message:|code:|param:|type:|statusCode:/.test(line)&&!/client_secret|Authorization/.test(line)).slice(-12).join('\n')):'';}).filter(Boolean).join('\n');},async run(runtime){
  activeRuntime=runtime;const {actors:a,pg,scenario,state,base,api}=runtime;
  assert.equal(new URL(base).hostname,'127.0.0.1');
  const q=value=>"'"+String(value).replaceAll("'","''")+"'",j=value=>q(JSON.stringify(value))+'::jsonb';
  const rpc=async(actor,name,args)=>{const r=await actor.sdk.rpc(name,args);assert.equal(r.error,null,r.error?.message);return r.data;};
  const functionCall=async(actor,name,body)=>{const auth=actor?await actor.sdk.auth.getSession():null;const response=await fetch(base+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+auth.data.session.access_token}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
  workerToken=randomBytes(32).toString('hex');registerSecret(workerToken);
  // Vault is a synthetic local token boundary, never a production Vault export.
  pg("create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);alter table vault.decrypted_secrets enable row level security;insert into vault.decrypted_secrets values('goodies_refund_worker_token',"+q(workerToken)+");");
  pg("notify pgrst,'reload schema';");
  webhookServer=http.createServer(async(req,res)=>{
   try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks),event=JSON.parse(bytes);
    assert.equal(event.livemode,false);const order=event.data?.object?.metadata?.goodies_order_id;
    const record={id:event.id,type:event.type,status:null};events.push(record);captured.set(event.id,{bytes,signature:req.headers['stripe-signature'],event,record});
    if(order&&heldOrders.has(order)){record.status=503;res.writeHead(503).end('Synthetic offline interruption');return;}
    const port=api.functionPorts.get('rapid-api');if(!port){res.writeHead(503).end();return;}
    const response=await fetch('http://127.0.0.1:'+port,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':String(req.headers['stripe-signature']||'')},body:bytes});
    record.status=response.status;res.writeHead(response.status,{'Content-Type':'application/json'}).end(await response.text());
   }catch{res.writeHead(400).end();}
  });
  await new Promise(resolve=>webhookServer.listen(0,'127.0.0.1',resolve));
  listener=spawn(cli,[...cliArgs,'listen','--events','setup_intent.succeeded,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,charge.refunded,refund.updated,refund.failed,charge.dispute.created,charge.dispute.updated,charge.dispute.closed,charge.dispute.funds_reinstated,charge.dispute.funds_withdrawn','--forward-to','http://127.0.0.1:'+webhookServer.address().port,'--skip-update'],{env:cliEnv,stdio:['ignore','pipe','pipe']});
  webhookSecret=await new Promise((resolve,reject)=>{
   let output='',settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('Stripe sandbox webhook listener did not become ready.'));}},30000);
   const inspect=data=>{output=(output+data).slice(-10000);const match=output.match(/whsec_[A-Za-z0-9]+(?=[\s'"()\]])/);if(match&&!settled){settled=true;clearTimeout(timer);resolve(match[0]);}};
   listener.stdout.on('data',inspect);listener.stderr.on('data',inspect);listener.on('exit',()=>{if(!settled){settled=true;clearTimeout(timer);reject(Error('Stripe sandbox listener exited before authorization.'));}});
  });registerSecret(webhookSecret);
  for(const name of ['create-card-setup-intent','place-goodies-card-order','process-goodies-card-refunds','refund-goodies-card-order','rapid-api'])await startEdge(name,runtime);
  const business=randomUUID(),store='stripe-sandbox-'+runId,hours=Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>[day,{open:'00:00',close:'00:00',closed:false}]));
  pg('insert into public.businesses(id,name,verification) values('+q(business)+",'Synthetic Stripe merchant','verified');insert into public.business_members(business_id,user_id,role) values("+q(business)+','+q(a.vendor.id)+",'owner');insert into public.goodies_store_schedules(business_id,store_id,category,is_live,min_order,delivery_fee,delivery_modes,hours,accept_cash_on_delivery) values("+q(business)+','+q(store)+",'groceries',true,0,0,array['pickup'],"+j(hours)+',true);');
  const product=await rpc(a.vendor,'goodies_vendor_save_product',{p_business:business,p_id:null,p_name:'Synthetic Stripe product',p_description:'Disposable local test only',p_price:10,p_emoji:'🛍️',p_stock:50,p_restriction:'none',p_photo_url:null,p_photo_urls:[]});
  await rpc(a.superAdmin,'goodies_admin_review_product',{p_product_id:product,p_status:'approved',p_note:null});await rpc(a.vendor,'goodies_vendor_set_product_availability',{p_business:business,p_id:product,p_available:true});
  const customer=(await stripe('POST','/v1/customers',{name:'Synthetic Goodies sandbox acceptance',metadata:{goodies_test_run:runId,local_only:'true'}},{idempotency:'goodies-sandbox-customer-'+runId})).data;
  assert.equal(customer.livemode,false);customerId=customer.id;provider.customerId=customerId;
  pg('insert into public.stripe_customers(user_id,stripe_customer_id) values('+q(a.customer.id)+','+q(customerId)+');');
  await scenario('Real server-owned card setup ignores forged identity and signed Stripe completion saves one owner-visible card',async()=>{
   const setup=await functionCall(a.otherCustomer,'create-card-setup-intent',{user_id:a.customer.id,stripe_customer_id:customerId});assert.equal(setup.status,200);
   assert.equal(typeof setup.data.client_secret,'string');registerSecret(setup.data.client_secret);
   const intent=(await stripe('GET','/v1/setup_intents/'+setup.data.setup_intent_id)).data;
   assert.equal(intent.livemode,false);assert.equal(intent.metadata.wantiss_user_id,a.otherCustomer.id);assert.equal(intent.metadata.wantiss_purpose,'save_card');assert.deepEqual(intent.payment_method_types,['card']);assert.notEqual(intent.customer,customerId);
   assert.equal(pg('select stripe_customer_id from public.stripe_customers where user_id='+q(a.otherCustomer.id)),intent.customer);
   await stripe('POST','/v1/customers/'+intent.customer,{metadata:{goodies_test_run:runId,local_only:'true'}});
   await stripe('POST','/v1/setup_intents/'+intent.id+'/confirm',{payment_method:'pm_card_visa'},{idempotency:'goodies-setup-confirm-'+runId});
   await until(()=>[...captured.values()].some(x=>x.event.type==='setup_intent.succeeded'&&x.event.data.object.id===intent.id&&x.record.status===200),'Signed card-setup webhook was not saved.');
   const cards=await rpc(a.otherCustomer,'get_my_payment_methods',{});assert.equal(cards.length,1);assert.equal(cards[0].last4,'4242');assert.equal(cards[0].type,'card');
   const unrelated=await a.customer.sdk.from('user_payment_methods').select('id').eq('user_id',a.otherCustomer.id);assert.equal(unrelated.error,null);assert.equal(unrelated.data.length,0);
   const event=[...captured.values()].find(x=>x.event.type==='setup_intent.succeeded'&&x.event.data.object.id===intent.id),duplicate=await fetch(base+'/functions/v1/rapid-api',{method:'POST',headers:{'Stripe-Signature':event.signature},body:event.bytes});assert.equal(duplicate.status,200);await duplicate.arrayBuffer();assert.equal((await rpc(a.otherCustomer,'get_my_payment_methods',{})).length,1);
   provider.savedCardSetup={classification:'PASS',setupIntentId:intent.id,syntheticCustomerId:intent.customer,clientPaymentForm:'NOT VERIFIED'};
  });
  const saveMethod=async alias=>{
   const method=(await stripe('POST','/v1/payment_methods/'+alias+'/attach',{customer:customerId})).data;
   assert.equal(method.livemode,false);const id=randomUUID();pg('insert into public.user_payment_methods(id,user_id,stripe_customer_id,stripe_payment_method_id,brand,last4,expiry_month,expiry_year) values('+[id,a.customer.id,customerId,method.id,method.card.brand,method.card.last4].map(q).join(',')+','+method.card.exp_month+','+method.card.exp_year+');');return {id,stripeId:method.id};
  };
  const card=await saveMethod('pm_card_visa');
  const orderArgs=()=>({p_store_id:store,p_order_type:'pickup',p_scheduled_for:null,p_address:null,p_contact_phone:'50937000000',p_items:[{id:product,k:product,p:10,q:1,options:{size:null,drink:false,discount_pct:0}}],p_subtotal:10,p_delivery_fee:0,p_service_fee:1,p_discount:0,p_tip:0,p_total:11,p_notes:null,p_promo_code:null});
  const checkout=(key,method=card)=>({action:'start',idempotency_key:key,payment_method_id:method.id,order:orderArgs()});
  const place=body=>functionCall(a.customer,'place-goodies-card-order',body);
  const getOrder=id=>JSON.parse(pg('select row_to_json(o) from public.goodies_orders o where id='+q(id)));
  const stock=()=>Number(pg('select stock from public.goodies_products where id='+q(product)));
  const wallet=()=>pg('select balance from public.wallets where user_id='+q(a.customer.id));
  const initialWallet=wallet();let paidOrder,paidPi;
  await scenario('Stripe sandbox checkout rejects missing auth, another customer’s card and tampered prices before charging',async()=>{
   const before=stock(),requestsBefore=requests.length;
   assert.equal((await functionCall(null,'place-goodies-card-order',checkout('unauthorized-'+runId))).status,401);
   assert.equal((await functionCall(a.otherCustomer,'place-goodies-card-order',checkout('cross-customer-'+runId))).status,400);
   const bad=checkout('tampered-'+runId);bad.order.p_subtotal=0.01;bad.order.p_total=1.01;assert.equal((await place(bad)).status,400);
   assert.equal(stock(),before);assert.equal(requests.length,requestsBefore);assert.equal(wallet(),initialWallet);
  });
  await scenario('Real Stripe card checkout captures exactly the server total and retries recover one paid order',async()=>{
   const before=stock(),payload=checkout('capture-'+runId),result=await place(payload);
   assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.payment_status,'paid');paidOrder=result.data.id;
   const row=getOrder(paidOrder);paidPi=(await stripe('GET','/v1/payment_intents/'+row.payment_provider_ref)).data;
   assert.equal(paidPi.status,'succeeded');assert.equal(paidPi.amount,1100);assert.equal(paidPi.currency,'usd');assert.equal(paidPi.metadata.goodies_order_id,paidOrder);assert.equal(paidPi.customer,customerId);
   assert.equal(stock(),before-1);const replay=await place(payload);assert.equal(replay.status,200);assert.equal(replay.data.id,paidOrder);assert.equal(stock(),before-1);assert.equal(wallet(),initialWallet);
   for(const actor of [a.customer,a.vendor]){const visible=await actor.sdk.from('goodies_orders').select('id,payment_status').eq('id',paidOrder).single();assert.equal(visible.error,null);assert.equal(visible.data.payment_status,'paid');}
   assert.ok(JSON.stringify(await rpc(a.superAdmin,'goodies_admin_orders_page',{p_offset:0,p_limit:100})).includes(paidOrder));
   const charges=(await stripe('GET','/v1/charges',{customer:customerId,limit:100})).data.data.filter(charge=>charge.payment_intent===paidPi.id);assert.equal(charges.length,1);assert.equal(charges[0].captured,true);
   provider.originalChargeId=charges[0].id;provider.primaryPaymentIntentId=paidPi.id;provider.primaryOrderId=paidOrder;
  });
  await scenario('Real signed Stripe webhook reaches the production handler and duplicate delivery changes no financial state',async()=>{
   await until(()=>[...captured.values()].some(x=>x.event.type==='payment_intent.succeeded'&&x.event.data.object.id===paidPi.id&&x.record.status===200),'The actual signed success webhook did not complete.');
   const entry=[...captured.values()].find(x=>x.event.type==='payment_intent.succeeded'&&x.event.data.object.id===paidPi.id),beforeStock=stock();
   const endpoint=base+'/functions/v1/rapid-api';
   const unsigned=await fetch(endpoint,{method:'POST',body:entry.bytes});assert.equal(unsigned.status,400);await unsigned.arrayBuffer();
   const bad=await fetch(endpoint,{method:'POST',headers:{'Stripe-Signature':'t='+Math.floor(Date.now()/1000)+',v1='+'0'.repeat(64)},body:entry.bytes});assert.equal(bad.status,400);await bad.arrayBuffer();
   const timestamp=Math.floor(Date.now()/1000)-600,signature=createHmac('sha256',webhookSecret).update(timestamp+'.'+entry.bytes.toString()).digest('hex');
   const stale=await fetch(endpoint,{method:'POST',headers:{'Stripe-Signature':'t='+timestamp+',v1='+signature},body:entry.bytes});assert.equal(stale.status,400);await stale.arrayBuffer();
   for(let i=0;i<2;i++){const duplicate=await fetch(endpoint,{method:'POST',headers:{'Stripe-Signature':entry.signature},body:entry.bytes});assert.equal(duplicate.status,200);await duplicate.arrayBuffer();}
   assert.equal(getOrder(paidOrder).payment_status,'paid');assert.equal(stock(),beforeStock);assert.equal(wallet(),initialWallet);
   assert.equal(pg('select status from public.goodies_stripe_webhook_events where event_id='+q(entry.event.id)),'processed');
  });
  await scenario('Original-card refund denies unrelated users and repeated refund requests create one exact Stripe refund',async()=>{
   assert.equal((await functionCall(a.otherCustomer,'refund-goodies-card-order',{order_id:paidOrder})).status,404);
   assert.equal((await functionCall(a.otherVendor,'refund-goodies-card-order',{order_id:paidOrder})).status,404);
   const before=stock();await rpc(a.customer,'set_goodies_order_status',{p_order_id:paidOrder,p_status:'cancelled'});
   const response=await functionCall(a.customer,'refund-goodies-card-order',{order_id:paidOrder});assert.equal(response.status,200,JSON.stringify(response.data));assert.equal(response.data.status,'refunded');
   const repeated=await functionCall(a.customer,'refund-goodies-card-order',{order_id:paidOrder});assert.equal(repeated.status,200);assert.equal(repeated.data.status,'refunded');
   const refunds=(await stripe('GET','/v1/refunds',{payment_intent:paidPi.id,limit:100})).data;assert.equal(refunds.data.length,1);assert.equal(refunds.data[0].amount,1100);assert.equal(refunds.data[0].status,'succeeded');assert.equal(refunds.data[0].charge,provider.originalChargeId);
   assert.equal(stock(),before+1);assert.equal(wallet(),initialWallet);provider.originalCardRefundId=refunds.data[0].id;
   await until(()=>getOrder(paidOrder).payment_status==='refunded','Refund reconciliation did not reach the local order.');
  });
  let concurrentOrder,concurrentPayload;
  await scenario('Simultaneous real Stripe checkout requests reserve one order, charge and stock item',async()=>{
   const before=stock();concurrentPayload=checkout('simultaneous-'+runId,await saveMethod('pm_card_visa'));
   const responses=await Promise.all([place(concurrentPayload),place(concurrentPayload)]);
   for(const response of responses)assert.ok([200,409].includes(response.status),'Concurrent checkout returned '+response.status);
   const recovered=await place(concurrentPayload);assert.equal(recovered.status,200);assert.equal(recovered.data.payment_status,'paid');concurrentOrder=recovered.data.id;
   for(const response of responses.filter(x=>x.status===200))assert.equal(response.data.id,concurrentOrder);
   assert.equal(stock(),before-1);assert.equal(wallet(),initialWallet);
   const pi=getOrder(concurrentOrder).payment_provider_ref,charges=(await stripe('GET','/v1/charges',{customer:customerId,limit:100})).data.data.filter(charge=>charge.payment_intent===pi&&charge.paid);
   assert.equal(charges.length,1);assert.equal(charges[0].amount,1100);provider.concurrentOrderId=concurrentOrder;
  });
  await scenario('A restarted checkout Edge process recovers a lost successful response without another charge',async()=>{
   const before=stock(),child=edgeChildren.get('place-goodies-card-order'),stopped=new Promise(resolve=>child.once('exit',resolve));child.kill();await stopped;api.functionPorts.delete('place-goodies-card-order');
   await startEdge('place-goodies-card-order',runtime);
   const response=await place(concurrentPayload);assert.equal(response.status,200);assert.equal(response.data.id,concurrentOrder);assert.equal(response.data.payment_status,'paid');assert.equal(stock(),before);assert.equal(wallet(),initialWallet);
  });
  await scenario('Real 3DS-required authorization stays unpaid, blocks vendor acceptance and cancels without a charge',async()=>{
   const before=stock(),payload=checkout('authentication-'+runId,await saveMethod('pm_card_threeDSecure2Required')),result=await place(payload);
   assert.equal(result.status,200);assert.equal(result.data.requires_action,true);const id=result.data.id,row=getOrder(id);assert.equal(row.payment_status,'requires_action');
   const pi=(await stripe('GET','/v1/payment_intents/'+row.payment_provider_ref)).data;assert.equal(pi.status,'requires_action');assert.equal(pi.amount_received,0);assert.equal(stock(),before-1);
   const accepted=await a.vendor.sdk.rpc('accept_goodies_order',{p_order_id:id});assert.ok(accepted.error,'Unverified card authorization was accepted');
   const cancelled=await functionCall(a.customer,'place-goodies-card-order',{action:'cancel',order_id:id});assert.equal(cancelled.status,200);
   assert.equal((await stripe('GET','/v1/payment_intents/'+pi.id)).data.status,'canceled');assert.equal(stock(),before);assert.equal(wallet(),initialWallet);
   provider.authenticationRequiredServerState='PASS';provider.authenticationChallengeUi='NOT VERIFIED';
  });
  await scenario('A real issuer decline returns safe failure, restores stock and cannot be retried into another order',async()=>{
   const before=stock(),payload=checkout('decline-'+runId,await saveMethod('pm_card_chargeCustomerFail')),result=await place(payload);assert.equal(result.status,400);
   assert.equal(result.data.error,'Could not confirm the payment. Check your orders before trying again.');assert.doesNotMatch(JSON.stringify(result.data),/SQLSTATE|StripeCardError|card_declined|req_/);
   assert.equal(stock(),before);assert.equal(wallet(),initialWallet);
   const id=pg('select order_id from public.goodies_card_checkout_attempts where user_id='+q(a.customer.id)+' and idempotency_key='+q(payload.idempotency_key));assert.equal(getOrder(id).status,'cancelled');
   const repeated=await place(payload);assert.equal(repeated.status,409);assert.equal(stock(),before);
  });
  await scenario('Partial original-card refund reconciles before the worker returns only the remaining amount once',async()=>{
   const result=await place(checkout('partial-refund-'+runId,await saveMethod('pm_card_visa')));assert.equal(result.status,200);
   const id=result.data.id,pi=getOrder(id).payment_provider_ref;
   await stripe('POST','/v1/refunds',{payment_intent:pi,amount:300},{idempotency:'goodies-partial-'+runId});
   await until(()=>getOrder(id).payment_status==='partially_refunded','Actual partial refund webhook was not reconciled.');
   await rpc(a.customer,'set_goodies_order_status',{p_order_id:id,p_status:'cancelled'});
   const refunds=await Promise.all([functionCall(a.customer,'refund-goodies-card-order',{order_id:id}),functionCall(a.customer,'refund-goodies-card-order',{order_id:id})]);
   for(const result of refunds)assert.equal(result.status,200);
   await until(()=>getOrder(id).payment_status==='refunded','Remaining original-card refund did not complete.');
   const history=(await stripe('GET','/v1/refunds',{payment_intent:pi,limit:100})).data.data;assert.equal(history.length,2);assert.deepEqual(history.map(x=>x.amount).sort((a,b)=>a-b),[300,800]);assert.ok(history.every(x=>x.status==='succeeded'));assert.equal(wallet(),initialWallet);
  });
  await scenario('Reordered real Stripe failure/success webhooks recover an offline interval from canonical provider state',async()=>{
   const args={p_idempotency_key:'offline-'+runId,...orderArgs()},rows=await rpc(a.customer,'place_goodies_card_order_once',args),id=rows[0].id;
   heldOrders.add(id);
   const pi=(await stripe('POST','/v1/payment_intents',{amount:1100,currency:'usd',customer:customerId,payment_method_types:['card'],capture_method:'manual',metadata:{wantiss_user_id:a.customer.id,wantiss_purpose:'goodies_order',goodies_order_id:id}},{idempotency:'goodies-offline-create-'+runId})).data;
   pg('update public.goodies_orders set payment_provider_ref='+q(pi.id)+' where id='+q(id)+';');
   const declined=await stripe('POST','/v1/payment_intents/'+pi.id+'/confirm',{payment_method:(await saveMethod('pm_card_chargeCustomerFail')).stripeId},{idempotency:'goodies-offline-decline-'+runId,allowError:true});assert.equal(declined.status,402);
   await stripe('POST','/v1/payment_intents/'+pi.id+'/confirm',{payment_method:(await saveMethod('pm_card_visa')).stripeId},{idempotency:'goodies-offline-confirm-'+runId});
   await stripe('POST','/v1/payment_intents/'+pi.id+'/capture',{}, {idempotency:'goodies-offline-capture-'+runId});
   await until(()=>['payment_intent.payment_failed','payment_intent.succeeded'].every(type=>[...captured.values()].some(x=>x.event.type===type&&x.event.data.object.id===pi.id&&x.record.status===503)),'Stripe did not deliver both real events during the synthetic local outage.');
   heldOrders.delete(id);
   for(const type of ['payment_intent.succeeded','payment_intent.payment_failed']){
    const entry=[...captured.values()].find(x=>x.event.type===type&&x.event.data.object.id===pi.id),response=await fetch(base+'/functions/v1/rapid-api',{method:'POST',headers:{'Stripe-Signature':entry.signature},body:entry.bytes});assert.equal(response.status,200);await response.arrayBuffer();
   }
   assert.equal(getOrder(id).payment_status,'paid');assert.equal(getOrder(id).status,'placed');assert.equal(wallet(),initialWallet);provider.offlineReorderedWebhookOrderId=id;
  });
  await scenario('A real Stripe dispute blocks fulfillment/refund while open and reconciles a won case before original-card refund',async()=>{
   const result=await place(checkout('dispute-'+runId,await saveMethod('pm_card_createDisputeProductNotReceived')));assert.equal(result.status,200);
   const id=result.data.id,pi=getOrder(id).payment_provider_ref;
   await until(()=>getOrder(id).payment_dispute_status==='open','The signed real dispute event was not reconciled.',60000);
   assert.equal(getOrder(id).payment_status,'disputed');assert.ok((await a.vendor.sdk.rpc('accept_goodies_order',{p_order_id:id})).error);
   const denied=await functionCall(a.customer,'refund-goodies-card-order',{order_id:id});assert.equal(denied.status,409);
   const disputes=(await stripe('GET','/v1/disputes',{payment_intent:pi,limit:100})).data.data;assert.equal(disputes.length,1);assert.equal(disputes[0].status,'needs_response');
   assert.equal((await stripe('GET','/v1/refunds',{payment_intent:pi,limit:100})).data.data.length,0);
   await stripe('POST','/v1/disputes/'+disputes[0].id,{evidence:{uncategorized_text:'winning_evidence'},submit:true});
   await until(()=>getOrder(id).payment_dispute_status==='won','The signed dispute-won event was not reconciled.',60000);
   await rpc(a.customer,'set_goodies_order_status',{p_order_id:id,p_status:'cancelled'});
   const refunded=await functionCall(a.customer,'refund-goodies-card-order',{order_id:id});assert.equal(refunded.status,200);assert.equal(refunded.data.status,'refunded');
   assert.equal(wallet(),initialWallet);provider.dispute={classification:'PASS',disputeId:disputes[0].id,openStateDenied:true,wonStateReconciled:true,originalCardRefund:true};
  });
  provider.classification='PASS';provider.serverCheckout='PASS';provider.signedWebhook='PASS';provider.originalCardRefund='PASS';
  await dispose();
 }};
};
