const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(){
 const calls={create:[],capture:[],rpc:[]},order={id:'order-synthetic',customer_id:'customer-synthetic',total:11,status:'placed',payment_status:'pending',payment_provider_ref:null,payment_method:'card'};
 const metadata={wantiss_user_id:order.customer_id,wantiss_purpose:'goodies_order',goodies_order_id:order.id};
 class Stripe{
  paymentIntents={
   create:async(params,options)=>{
    calls.create.push({params,options});
    // The real provider rejects implicit redirect methods without return_url.
    assert.deepEqual(Array.from(params.payment_method_types||[]),['card']);
    return {id:'pi_synthetic',amount:1100,currency:'usd',status:'requires_capture',metadata};
   },
   capture:async(id,params,options)=>{calls.capture.push({id,options});return {id,amount:1100,currency:'usd',status:'succeeded',metadata};},
  };
 }
 class Query{
  constructor(table){this.table=table;}
  select(){return this;}eq(){return this;}
  update(values){Object.assign(order,values);return this;}
  async maybeSingle(){return {error:null,data:this.table==='user_payment_methods'?{stripe_customer_id:'cus_synthetic',stripe_payment_method_id:'pm_synthetic'}:this.table==='stripe_customers'?{stripe_customer_id:'cus_synthetic'}:{...order}};}
  async single(){return this.maybeSingle();}
  then(resolve,reject){return Promise.resolve({error:null,data:null}).then(resolve,reject);}
 }
 const auth={auth:{getUser:async()=>({error:null,data:{user:{id:order.customer_id}}})},rpc:async(name,args)=>{calls.rpc.push({name,args});return name==='get_my_goodies_access_status'?{error:null,data:[{status:'active'}]}:{error:null,data:[{id:order.id,order_code:'GOODIES-SYNTHETIC',status:order.status}]};}};
 let handler;
 const module={exports:{}},source=ts.transpileModule(fs.readFileSync('supabase/functions/place-goodies-card-order/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>name==='npm:stripe@18.5.0'?Stripe:{createClient:(_url,_key,options)=>options?.global?auth:{from:table=>new Query(table)}},Deno:{env:{get:name=>name==='SUPABASE_URL'?'http://local-synthetic.invalid':'synthetic-only'},serve:callback=>{handler=callback;}},Request,Response,Error,console:{error(){}}});
 const invoke=()=>handler(new Request('http://local-synthetic.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic-only','Content-Type':'application/json'},body:JSON.stringify({action:'start',idempotency_key:'same-checkout-key',payment_method_id:'saved-card-synthetic',order:{p_total:0.01,p_subtotal:0.01}})}));
 return {invoke,calls,order};
}
test('card checkout authorizes the server total through supported saved-card methods only',async()=>{
 const h=harness(),response=await h.invoke();assert.equal(response.status,200);
 assert.equal((await response.json()).payment_status,'paid');assert.equal(h.calls.create.length,1);
 const {params,options}=h.calls.create[0];assert.equal(params.amount,1100);assert.equal(params.currency,'usd');assert.equal(params.payment_method,'pm_synthetic');assert.equal(params.customer,'cus_synthetic');assert.equal(params.capture_method,'manual');assert.deepEqual(Array.from(params.payment_method_types),['card']);assert.equal(options.idempotencyKey,'goodies-card-order-order-synthetic');
 assert.equal(h.calls.capture[0].options.idempotencyKey,'goodies-capture-order-synthetic');
});
test('a lost successful card response reuses the paid order without another provider authorization or capture',async()=>{
 const h=harness();await h.invoke();const response=await h.invoke(),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.id,'order-synthetic');assert.equal(body.payment_status,'paid');
 assert.equal(h.calls.create.length,1);assert.equal(h.calls.capture.length,1);assert.equal(h.order.payment_status,'paid');
});
