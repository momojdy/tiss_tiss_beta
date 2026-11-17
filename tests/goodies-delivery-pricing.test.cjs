const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.createSourceFile('store.ts',fs.readFileSync('src/features/Goodies/store.ts','utf8'),99,true);
function extract(name,context){const match=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(match,name);const module={exports:{}};vm.runInNewContext(ts.transpileModule(match.getText(source)+'\nmodule.exports='+name+';',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,...context});return module.exports;}
function quoteHarness(invoke){const S={accountId:'synthetic-owner',deliveryFeeQuote:null},context={S,STB:{store:{live:true}},addr:()=>({t:'Synthetic address'}),cartStoreIds:()=>['store'],isPk:()=>false,deliveryAddressKey:()=> 'synthetic-address',deliveryAddressPayload:a=>a,deliveryQuoteReady:()=>false,activeQuoteRequest:null,emit(){},label:(_id,text)=>text,friendlyError:(_error,text)=>text,supabase:{functions:{invoke}}};context.quoteFee=extract('quoteFee',{});return{S,run:extract('refreshGoodiesDeliveryQuote',context)};}
test('malformed delivery fee responses show a retry state without displaying fabricated zero pricing',async()=>{
 for(const fee of [null,'',NaN,-1,1.001]){const h=quoteHarness(async()=>({data:{quote_id:'synthetic-quote',fee}}));assert.equal(await h.run(),null);assert.equal(h.S.deliveryFeeQuote,null);assert.match(h.S.deliveryQuoteError,/Could not calculate/);assert.equal(h.S.deliveryQuoteLoading,false);}
 const free=quoteHarness(async()=>({data:{quote_id:'synthetic-free-quote',fee:0}}));assert.equal((await free.run()).fee,0);
});
test('delivery pricing cannot apply an old account response to a new customer cart',async()=>{
 let resolve;const h=quoteHarness(()=>new Promise(done=>resolve=done));const pending=h.run();h.S.accountId='another-customer';h.S.deliveryQuoteLoading=false;resolve({data:{quote_id:'synthetic-quote',fee:2}});await pending;assert.equal(h.S.deliveryFeeQuote,null);assert.equal(h.S.deliveryQuoteError,'');
});
test('first-delivery eligibility uses only authenticated delivery history and ignores a stale account response',async()=>{
 let resolve;const filters=[],response=new Promise(done=>resolve=done),chain={select(){return this;},eq(...args){filters.push(args);return this;},then(done,fail){return response.then(done,fail);}},S={accountId:'synthetic-owner',firstOrderEligible:null};
 const run=extract('refreshFirstDeliveryEligibility',{S,feesNow:()=>({firstFree:true}),firstDeliveryRequest:null,firstDeliveryRequestUser:null,emit(){},label:(_id,text)=>text,friendlyError:(_error,text)=>text,supabase:{auth:{getUser:async()=>({data:{user:{id:'synthetic-owner'}}})},from:()=>chain}});
 const pending=run();await new Promise(done=>setImmediate(done));assert.ok(filters.some(([key,value])=>key==='order_type'&&value==='delivery'));S.accountId='another-customer';resolve({count:0});assert.equal(await pending,null);assert.equal(S.firstOrderEligible,null);
});
test('a long genuine road route fits the viewport without spreading vertices onto the call stack',()=>{
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/Goodies/deliveryTracking.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports});const points=Array.from({length:250000},(_,i)=>({latitude:18+i/1000000,longitude:-72-i/1000000}));const region=module.exports.trackingRegion(points);assert.ok(region.latitudeDelta>0.3&&region.longitudeDelta>0.3);assert.ok(region.latitude>18&&region.latitude<19);
});
