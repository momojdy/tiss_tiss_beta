const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(signedIn=true){
 const calls={customer:[],setup:[],serverReads:0,serverWrites:0};let mapping,handler;
 const actor='authenticated-owner';
 const auth={auth:{getUser:async()=>({data:{user:signedIn?{id:actor}:null},error:null})},from(){throw Error('Authenticated clients cannot write Stripe customer bindings');}};
 class Query{
  select(){calls.serverReads++;return this;}
  eq(key,value){assert.equal(key,'user_id');assert.equal(value,actor);return this;}
  async maybeSingle(){return {data:mapping?{stripe_customer_id:mapping.stripe_customer_id}:null,error:null};}
  async insert(row){calls.serverWrites++;assert.equal(row.user_id,actor);mapping=row;return {error:null};}
 }
 class Stripe{
  customers={create:async args=>{calls.customer.push(args);return {id:'cus_server_created'};}};
  setupIntents={create:async args=>{calls.setup.push(args);return {id:'seti_synthetic',client_secret:'seti_synthetic_secret_synthetic'};}};
 }
 const module={exports:{}},source=ts.transpileModule(fs.readFileSync('supabase/functions/create-card-setup-intent/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>name==='npm:stripe@18.5.0'?Stripe:{createClient:(_url,key,options)=>options?.global?auth:{from:table=>{assert.equal(key,'synthetic-server-key');assert.equal(table,'stripe_customers');return new Query();}}},Deno:{env:{get:name=>name==='SUPABASE_URL'?'http://local-synthetic.invalid':name==='SUPABASE_SERVICE_ROLE_KEY'?'synthetic-server-key':'synthetic-public'},serve:callback=>{handler=callback;}},Request,Response,Error,console:{error(){}}});
 const invoke=()=>handler(new Request('http://local-synthetic.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic-only','Content-Type':'application/json'},body:JSON.stringify({user_id:'forged-other-owner',stripe_customer_id:'cus_forged'})}));
 return {invoke,calls};
}
test('card setup binds Stripe through the trusted server and authenticated identity instead of request fields',async()=>{
 const h=harness(),response=await h.invoke();assert.equal(response.status,200);
 assert.equal(h.calls.serverWrites,1);assert.equal(h.calls.customer[0].metadata.wantiss_user_id,'authenticated-owner');assert.equal(h.calls.setup[0].customer,'cus_server_created');assert.deepEqual(Array.from(h.calls.setup[0].payment_method_types),['card']);
 await h.invoke();assert.equal(h.calls.customer.length,1);assert.equal(h.calls.serverWrites,1);
});
test('a missing authenticated user cannot create or inspect a Stripe customer through card setup',async()=>{
 const h=harness(false),response=await h.invoke();assert.equal(response.status,401);
 assert.equal(h.calls.customer.length,0);assert.equal(h.calls.setup.length,0);assert.equal(h.calls.serverReads,0);assert.equal(h.calls.serverWrites,0);
});
