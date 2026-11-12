const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function compile(source,context={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,...context});return module.exports;}
const recover=compile(fs.readFileSync('src/features/Goodies/cacheRecovery.ts','utf8')).recoverShoppingSnapshots;
const placeholder=(id,n)=>({id,n,open:0,live:false,acceptScheduledOrders:false});
test('catalog outages preserve owned shopping snapshots and unavailable stores are never purchasable',()=>{
 const line={id:'product',k:'line',q:2,p:125,s:'removed'};
 const s={cart:{sid:'removed',lines:[line]},orders:[{sid:'historical',sn:'Former store',lines:[line]}],fav:['removed'],favp:['product'],checkoutAttempt:{completed:false}};const stores={};
 recover(s,{},stores,placeholder);assert.equal(s.cart.lines[0],line);assert.equal(s.orders.length,1);assert.deepEqual(s.favp,['product']);assert.equal(stores.removed.open,0);assert.equal(stores.historical.live,false);assert.equal(s.checkoutAttempt.completed,false);assert.equal(s.cart.lines[0].p,125);
});
test('empty cart cannot complete an unresolved checkout and builder snapshots retain their store',()=>{
 const s={cart:{lines:[]},checkoutAttempt:{completed:false}};recover(s,{}, {},placeholder);assert.equal(s.checkoutAttempt.completed,false);
 s.cart={sid:'wrong',lines:[{id:'byo',k:'custom',q:1,p:20,byo:{sid:'builder-store'}}]};const stores={};recover(s,{},stores,placeholder);assert.equal(s.cart.sid,'builder-store');assert.equal(stores['builder-store'].open,0);
});
test('malformed cached quantities and prices are discarded without removing valid snapshots',()=>{
 const good={id:'p',k:'p',q:1,p:0,s:'store'};const s={cart:{lines:[good,{...good,q:-1},{...good,p:NaN},null]},orders:[null,{}]};recover(s,{}, {},placeholder);assert.equal(s.cart.lines.length,1);assert.equal(s.orders.length,0);
});
function payments(){const text=fs.readFileSync('src/features/Goodies/actions.ts','utf8'),source=ts.createSourceFile('actions.ts',text,ts.ScriptTarget.Latest,true);const declaration=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='refreshPaymentOptions');const requests=[];const S={accountId:'a',wallet:91,hasWallet:true,cards:[{id:'old'}]};const client={auth:{getUser:async()=>({data:{user:{id:S.accountId}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:()=>new Promise(resolve=>requests.push({kind:'wallet',resolve}))})})}),rpc:()=>new Promise(resolve=>requests.push({kind:'cards',resolve}))};const mod=compile('let paymentOptionsGeneration=0;'+declaration.getText(source),{S,supabase:client,emit(){},save(){}});return{S,requests,refresh:mod.refreshPaymentOptions};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('failed payment reads preserve known balance, report unavailable, and retry successfully',async()=>{
 const h=payments(),pending=h.refresh();assert.equal(h.S.paymentOptionsStatus,'loading');await tick();h.requests[0].resolve({data:null,error:{message:'private sql'}});h.requests[1].resolve({data:[]});assert.equal(await pending,false);assert.equal(h.S.wallet,91);assert.equal(h.S.hasWallet,true);assert.equal(h.S.paymentOptionsStatus,'error');
 const retry=h.refresh();await tick();h.requests[2].resolve({data:null});h.requests[3].resolve({data:[]});assert.equal(await retry,true);assert.equal(h.S.hasWallet,false);assert.equal(h.S.wallet,0);assert.equal(h.S.paymentOptionsStatus,'ready');
});
test('malformed balances never become a successful zero-dollar payment result',async()=>{
 for(const balance of [null,'', 'invalid']){const h=payments(),p=h.refresh();await tick();h.requests[0].resolve({data:{id:'wallet',balance}});h.requests[1].resolve({data:[]});assert.equal(await p,false);assert.equal(h.S.wallet,91);}
});
test('late responses cannot overwrite another account or a newer payment refresh',async()=>{
 const h=payments(),old=h.refresh();await tick();h.S.accountId='b';const next=h.refresh();await tick();h.requests[2].resolve({data:{id:'new',balance:30}});h.requests[3].resolve({data:[]});assert.equal(await next,true);h.requests[0].resolve({data:{id:'old',balance:999}});h.requests[1].resolve({data:[]});assert.equal(await old,false);assert.equal(h.S.wallet,30);assert.equal(h.S.paymentOptionsStatus,'ready');
});

function groupCheckout({detailsFail=false}={}){
 const file='src/features/Goodies/components/Sheets.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let action;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='checkoutGroupOrder')action=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(action);
 const line={k:'paid',id:'p',q:1},other={k:'unrelated',id:'other',q:1},S={accountId:'a',pf:{ph:'valid'},hasWallet:true,wallet:100,cart:{sid:'store',lines:[line,other]},groupOrder:{groupId:'group'}};
 let resolveWallet;const calls=[],messages=[],routes=[];const group={serverBacked:true,groupId:'group'};
 const context={S,group,groupCheckoutLock:{current:false},sharedItems:[{user_id:'a',line_key:'paid'}],currentUserId:'a',groupMembers:[{user_id:'a',role:'host'}],checkoutPreview:{items:[{line_key:'paid',product_id:'p',quantity:1,unit_price:10}]},checkoutEstimate:{group_id:'group',order_type:'pickup',estimated_total:10},groupCheckoutType:'pickup',setGroupCheckoutBusy(){},phoneOK:()=>true,A:{refreshPaymentOptions:()=>new Promise(resolve=>{resolveWallet=resolve;})},label:(_id,text)=>text,toast:text=>messages.push(text),friendlyError:(_e,text)=>text,save(){},emit(){},close(){},clearActiveGroup(){S.groupOrder=null;},reset:r=>routes.push(r),push:(r,p)=>routes.push([r,p]),fetchGoodiesOrderForNotification:async()=>{if(detailsFail)throw Error('offline');return 'code';},supabase:{rpc:async(name,args)=>{calls.push({name,args});return{data:{id:'order',order_code:'code'}};}}};
 const run=compile('module.exports='+action,context);return{run,S,calls,messages,routes,release:()=>resolveWallet(true)};
}
test('group checkout prevents concurrent duplicate payment and opens the actual placed order',async()=>{
 const h=groupCheckout(),first=h.run();await h.run();assert.equal(h.calls.length,0);h.release();await first;
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].args.p_idempotency_key,'group-group-checkout');assert.equal(h.calls[0].args.p_address._goodies_expected_total,10);assert.equal(h.calls[0].args.p_address._goodies_expected_items[0].line_key,'paid');assert.deepEqual(h.S.cart.lines.map(x=>x.k),['unrelated']);assert.equal(h.S.groupOrder,null);assert.deepEqual(h.routes,['home',['confirm','code']]);
});
test('successful group payment remains successful when order details are temporarily unavailable',async()=>{
 const h=groupCheckout({detailsFail:true}),request=h.run();h.release();await request;assert.deepEqual(h.routes,['orders']);assert.equal(h.calls.length,1);assert.match(h.messages.at(-1),/Group order placed/);
});
test('group checkout stops after an account switch and never submits for the replacement account',async()=>{
 const h=groupCheckout(),request=h.run();h.S.accountId='b';h.release();await request;assert.equal(h.calls.length,0);assert.equal(h.S.cart.lines.length,2);assert.equal(h.routes.length,0);
});

test('permission failures never masquerade as insufficient wallet funds',()=>{
 const error=compile(fs.readFileSync('src/features/Goodies/friendlyError.ts','utf8'),{require:()=>({label:(_id,text)=>text}),console:{warn(){}}}).friendlyError;
 const fallback='Could not complete this request. Please retry.';
 for(const message of ['insufficient privileges for private_finance','insufficient_privilege','permission denied; SQLSTATE 42501','private connection token'])assert.equal(error({message},fallback),fallback);
 for(const message of ['Insufficient funds','Insufficient balance','Insufficient wallet balance','Insufficient Wantiss wallet balance'])assert.match(error({message},fallback),/^Insufficient Wantiss wallet balance/);
});
