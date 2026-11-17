const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const user='a0000000-0000-4000-8000-000000000001',other='a0000000-0000-4000-8000-000000000002',request='a0000000-0000-4000-8000-000000000010';
const snapshot=(creator=false)=>({id:request,mode:'share',service:'goodies',status:'active',total_cents:1100,initial_cents:660,contributed_cents:0,remaining_cents:440,expires_at:'2099-01-01T00:00:00Z',is_creator:creator,my_contributed_cents:0});
const receipt=(amount=100)=>({ok:true,status:'active',contribution_status:'paid',request_id:request,amount_cents:amount,refunded:false});
function runtime({storage=new Map(),rpc=async()=>({data:null}),actor=()=>user,failWrite=()=>false,afterWrite=()=>{}}={}){
 const calls=[],writes=[];
 const client={auth:{getUser:async()=>({data:{user:{id:actor()}}})},rpc:async(name,args)=>{calls.push({name,args});return rpc(name,args);}};
 const disk={getItem:async key=>storage.get(key)||null,removeItem:async key=>{storage.delete(key);},setItem:async(key,value)=>{if(failWrite(key,value))throw Error('Synthetic storage failure');storage.set(key,value);writes.push({key,value});afterWrite(key,value);}};
 const modules={};function load(name){if(modules[name])return modules[name];const module={exports:{}};modules[name]=module.exports;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/Goodies/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,process:{env:{EXPO_PUBLIC_GOODIES_SHARED_PAYMENTS_RELEASED:'true'}},require:id=>id.includes('async-storage')?disk:id.includes('helpPayApi')?load('helpPayApi'):{supabase:client}});return module.exports;
 }
 return{api:load('helpPayApi'),recovery:load('helpPayRecovery'),calls,writes,storage};
}
test('Shared Bill money calculations use integer cents and reject malformed or over-precise input',()=>{
 const {api}=runtime();assert.equal(api.shareBillAmounts(101).initialCents,61);assert.equal(api.shareBillAmounts(101).shareableCents,40);
 assert.equal(api.helpPayContributionCents(440,'share','percent','25'),110);assert.equal(api.helpPayContributionCents(101,'share','percent','50'),51);assert.equal(api.helpPayContributionCents(440,'share','amount','.50'),50);assert.equal(api.helpPayContributionCents(440,'full','amount','1'),440);
 for(const text of ['1.001','NaN','Infinity','-1','1e2','10000000000',''])assert.equal(api.helpPayContributionCents(440,'share','amount',text),null);
 assert.equal(api.helpPayContributionCents(440,'share','percent','101'),null);
});
test('simultaneous callbacks with one confirmation submit one payment request',async()=>{
 let finish;const pending=new Promise(resolve=>finish=resolve);const h=runtime({rpc:async(name)=>name==='help_pay_contribute_for_account'?pending:{data:{found:false}}});
 const a=h.recovery.payRecoverableHelpPay(request,100,'synthetic-confirm-once',user),b=h.recovery.payRecoverableHelpPay(request,100,'synthetic-confirm-once',user);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls.filter(c=>c.name==='help_pay_contribute_for_account').length,1);finish({data:receipt()});await Promise.all([a,b]);
 assert.equal(h.calls.find(c=>c.name==='help_pay_contribute_for_account').args.p_expected_user_id,user);
});
test('a lost payment response survives a fresh application runtime and recovers without another debit',async()=>{
 const storage=new Map(),ledger=new Map();let debits=0;
 const server=async(name,args)=>{if(name==='help_pay_contribute_for_account'){debits++;ledger.set(args.p_idempotency_key,receipt(args.p_amount_cents));throw Error('Synthetic dropped response after commit');}if(name==='help_pay_contribution_status')return{data:ledger.has(args.p_idempotency_key)?{found:true,...ledger.get(args.p_idempotency_key)}:{found:false}};throw Error('Unexpected request');};
 const first=runtime({storage,rpc:server});await assert.rejects(first.recovery.payRecoverableHelpPay(request,100,'synthetic-lost-reply',user));
 const restarted=runtime({storage,rpc:server});const recovered=await restarted.recovery.recoverHelpPayPayment(request);assert.equal(recovered.result.amount_cents,100);assert.equal(recovered.pending,null);assert.equal(debits,1);assert.ok(!restarted.calls.some(c=>c.name==='help_pay_contribute_for_account'));
});
test('a request lost before reaching the server retries the original stored key after restart',async()=>{
 const storage=new Map();const first=runtime({storage,rpc:async()=>{throw Error('Synthetic offline before dispatch');}});await assert.rejects(first.recovery.payRecoverableHelpPay(request,100,'synthetic-original-key',user));
 const restarted=runtime({storage,rpc:async(name)=>({data:name==='help_pay_contribution_status'?{found:false}:receipt()})});await restarted.recovery.payRecoverableHelpPay(request,100,'synthetic-new-ui-key',user);
 assert.equal(restarted.calls.find(c=>c.name==='help_pay_contribute_for_account').args.p_idempotency_key,'synthetic-original-key');
});
test('changing the amount cannot discard an unresolved financial intent',async()=>{
 const storage=new Map(),first=runtime({storage,rpc:async()=>{throw Error('Synthetic offline');}});await assert.rejects(first.recovery.payRecoverableHelpPay(request,100,'synthetic-uncertain-key',user));
 const next=runtime({storage,rpc:async()=>({data:{found:false}})});await assert.rejects(next.recovery.payRecoverableHelpPay(request,200,'synthetic-different-key',user));assert.ok(!next.calls.some(c=>c.name==='help_pay_contribute_for_account'));assert.equal(JSON.parse([...storage.values()][0]).amountCents,100);
});
test('storage failure after payment confirmation preserves a recoverable key',async()=>{
 const storage=new Map();let saved;
 const first=runtime({storage,rpc:async(_name,args)=>{saved={key:args.p_idempotency_key,...receipt()};return{data:receipt()};},failWrite:(_key,value)=>JSON.parse(value).confirmed===true});await assert.rejects(first.recovery.payRecoverableHelpPay(request,100,'synthetic-storage-key',user));
 const next=runtime({storage,rpc:async()=>({data:{found:true,...saved}})});assert.equal((await next.recovery.recoverHelpPayPayment(request)).result.ok,true);assert.equal(next.calls.length,1);
});
test('account changes before dispatch cannot charge another account or expose its stored intent',async()=>{
 let actor=user;const h=runtime({actor:()=>actor,afterWrite:()=>{actor=other;}});await assert.rejects(h.recovery.payRecoverableHelpPay(request,100,'synthetic-account-key',user));assert.equal(h.calls.length,0);
 const otherSession=runtime({storage:h.storage,actor:()=>other});const result=await otherSession.recovery.recoverHelpPayPayment(request);assert.equal(result.result,null);assert.equal(result.pending,null);assert.equal(otherSession.calls.length,0);
});
test('creator reservation recovery finds an existing request after restart and sends no second creation',async()=>{
 const storage=new Map();let key;
 const first=runtime({storage,rpc:async(name,args)=>{if(name==='help_pay_create_for_account'){key=args.p_checkout_key;throw Error('Synthetic lost creation response');}throw Error('Unexpected request');}});await assert.rejects(first.recovery.createRecoverableHelpPay('share',1100,'synthetic-creation-key',{},user));
 const next=runtime({storage,rpc:async(name,args)=>{assert.equal(name,'help_pay_request_for_checkout');assert.equal(args.p_checkout_key,key);return{data:{found:true,request:snapshot(true)}};}});
 assert.equal((await next.recovery.recoverHelpPayCreation()).id,request);assert.equal(await next.recovery.createRecoverableHelpPay('share',1100,'synthetic-new-key',{},user),request);assert.ok(!next.calls.some(c=>c.name==='help_pay_create_for_account'));
 await assert.rejects(next.recovery.finishHelpPayCreation(request));assert.ok(storage.size>0);
});
test('malformed receipts and server details never become success or a public database error',async()=>{
 for(const raw of [{},{...receipt(),amount_cents:0},{...receipt(),request_id:other},{...receipt(),ok:'true'},{...receipt(),contribution_status:'refunded',ok:false,refunded:false}])assert.throws(()=>runtime().api.parseHelpPayContribution(raw,request,100));
 const h=runtime({rpc:async()=>({error:{code:'XX000',message:'private database relation and provider secret'}})});await assert.rejects(h.api.fetchHelpPayStatus(request),error=>!error.message.includes('private')&&!error.message.includes('relation'));
});
