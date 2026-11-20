/* Source-function regression tests; transports/native widgets are synthetic. Live snapshots remain explicitly identified. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {test}=require('node:test'),root=path.resolve(__dirname,'..'),admin=path.resolve(root,'../tiss-admin');
function extract(repo,file,name){const filename=path.join(repo,file),ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);let found;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;else if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer)found=node;else if(ts.isPropertyAssignment(node)&&node.name.getText(ast)===name&&ts.isArrowFunction(node.initializer))found=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(found,'Missing '+name);
 const code=ts.isFunctionDeclaration(found)?found.getText(ast)+'\nmodule.exports='+name+';':'module.exports='+found.initializer.getText(ast)+';';
 const javascript=ts.transpileModule(code,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 const tags=new Set();function tag(node){if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))tags.add(node.tagName.getText(ast));ts.forEachChild(node,tag);}tag(found);
 return context=>{const module={exports:{}};const env={GOODIES_SHARED_PAYMENTS_RELEASED:false,isGoodiesOnlyBusiness:()=>false,paymentOptionsGeneration:0,builderLoadGeneration:0,S:{accountId:'synthetic'},module,exports:module.exports,React,Date,console,require,...Object.fromEntries([...tags].filter(x=>!x.includes('.')).map(x=>[x,x])),goodiesRequest:(...args)=>context.supabase.rpc(...args),notifyStoreReviewsChanged(){},readOrderReviews:async()=>{},...context};vm.runInNewContext(javascript,env,{filename});return module.exports;};
}
const label=(_id,fallback)=>fallback;function flatten(node){if(Array.isArray(node))return node.map(flatten).join(' ');if(node==null||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);return flatten(node.props?.children);}function elements(node,out=[]){if(Array.isArray(node))node.forEach(x=>elements(x,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;}
test('REGRESSION A01: vendor errors never render raw database detail',()=>{
 const errText=extract(root,'src/screens/businessSpace/BusinessSpaceShared.tsx','errText')({Error});
 const message='permission denied for relation goodies_orders (SQLSTATE 42501)';assert.equal(errText(new Error(message)),'Could not complete this request. Please try again.');
});
test('REGRESSION A02: receipt errors use safe app-owned copy',async()=>{
 const messages=[],order={backendId:'synthetic-order'};const receiptCall=extract(root,'src/features/Goodies/screens/Shop.tsx','receiptCall')({receiptLock:{current:null},scopeRef:{current:{active:true}},accountId:'synthetic',setReceiptBusy(){},supabase:{rpc:async()=>({error:{message:'already reported; SQLSTATE 42501 private.internal_queue'}})},toast:value=>messages.push(value),label,o:order,save(){},emit(){}});
 await receiptCall('goodies_customer_dispute_delivery',{},'Success');assert.equal(messages[0],'Could not send this. Please try again.');
});
test('REGRESSION A03: admin Reject requires and sends a reason',async()=>{
 const calls=[],messages=[];const reviewProduct=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','reviewProduct')({canOperate:true,runMutation:async(_key,work)=>work(()=>true),busy:'',setRejection(){},setBusy(){},supabase:{rpc:async(fn,args)=>{calls.push({fn,args});return {error:null};}},toast:m=>messages.push(m),reload:async()=>{}});
 await reviewProduct({id:'synthetic-product'},'rejected');assert.equal(calls.length,0);assert.equal(messages[0],'Enter a rejection reason.');
 await reviewProduct({id:'synthetic-product'},'rejected','Needs a clear photo');assert.equal(calls[0].args.p_note,'Needs a clear photo');
});
test('REGRESSION A04: rating Submit claims success only after backend success',async()=>{
 const S={orders:[{id:'ORDER-TEST',backendId:'order-uuid',serverStatus:'completed',sid:'synthetic-store'}],pf:{n:'Synthetic customer'},rev:{},rt:0},messages=[];let saved=0;
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({supabase:{rpc:async()=>({data:'synthetic-review-id',error:null})},useRef:value=>({current:value}),useState:initial=>[initial,()=>{}],S,label,toast:m=>messages.push(m),ui:{close(){}},save(){saved++;},emit(){}});
 const tree=ReviewSheet({id:'ORDER-TEST',stars:()=>null,initialStars:5});await elements(tree).find(element=>element.type==='Cta').props.onPress();assert.equal(saved,1);assert.equal(S.rev['synthetic-store'][0].r,5);assert.equal(messages[0],'Thanks for your review! Your review is awaiting approval.');
 const source=fs.readFileSync(path.join(root,'src/features/Goodies/components/Sheets.tsx'),'utf8');const body=source.slice(source.indexOf('function ReviewSheet'),source.indexOf('function ContactsSheet'));assert.ok(body.includes("supabase.rpc('goodies_submit_order_review'"));
});
test('REGRESSION A05: support confirmation truthfully acknowledges submission',()=>{
 const Account=extract(root,'src/features/Goodies/screens/Account.tsx','Account')({useTheme:()=>({mut:'#555'}),S:{},STB:{},label});
 const text=flatten(Account({r:'supdone',p:{ticket:'SUP-TEST-001',storeId:''}}));assert.ok(text.includes('SUP-TEST-001'));assert.ok(!text.includes('(demo)'));assert.ok(!text.includes('not connected'));
});
test('REGRESSION A06: historical stores never acquire sample reviews',()=>{
 const StoreReviews=extract(root,'src/features/Goodies/screens/Shop.tsx','StoreReviews')({useStoreReviews:()=>({rows:[],loading:false,error:false}),useTheme:()=>({mut:'#555'}),STB:{'old-store':{n:'Historical store',e:'',rv:0}},S:{rev:{}},SEED_REVIEWS:[{n:'Sample customer',r:5,t:'Invented sample review',d:'2 days ago'}],label,back(){},browse(){},go(){}});
 assert.ok(!flatten(StoreReviews({id:'old-store'})).includes('Invented sample review'));
});
test('REGRESSION A07: missing store renders a safe fallback',()=>{
 const Store=extract(root,'src/features/Goodies/screens/Shop.tsx','Store')({useStoreReviews:()=>({rows:[]}),label,back(){},browse(){},useTheme:()=>({}),useEffect(){},STB:{},useState:v=>[v,()=>{}],S:{ss:{}},addr:()=>null});assert.doesNotThrow(()=>Store({id:'removed-store'}));
});
test('REGRESSION A08: historical orders render without a catalog store',()=>{
 const Orders=extract(root,'src/features/Goodies/screens/Shop.tsx','Orders')({useEffect(){},useTheme:()=>({}),S:{orders:[{id:'OLD-ORDER',backendId:'order-id',sid:'unpublished-store',t0:Date.now(),st:0,total:1}],ot:'active'},STB:{},done:()=>false,label,stageLabels:()=>['Placed'],TP:[],TL:[],setOrdersTab(){},fmtDay:()=>'',money:()=>'$1'});
 assert.doesNotThrow(()=>Orders());
});
test('REGRESSION A09: pickup map uses valid coordinates and otherwise shows unavailable state',()=>{
 const PickupLocationMap=extract(root,'src/features/Goodies/screens/Shop.tsx','PickupLocationMap')({label,coordinate:p=>p?.latitude!=null?p:null});
 const nodes=elements(PickupLocationMap({origin:{latitude:18.5,longitude:-72.3}}));assert.ok(nodes.some(n=>n.type==='MapView'));assert.ok(!nodes.some(n=>n.type==='Empty'));
 assert.ok(elements(PickupLocationMap({origin:null})).some(n=>n.type==='Empty'));
});
test('REGRESSION A11: fee save refuses unloaded defaults',async()=>{
 const calls=[];const saveFees=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','saveFees')({canOperate:true,canFinance:true,feesLoaded:false,busy:'',fee:'0',tips:'0,1,2,3',firstFree:false,wallet:true,card:true,cash:true,loading:true,setBusy(){},toast(){},supabase:{rpc:async(fn,args)=>{calls.push({fn,args});return {error:null};}}});
 await saveFees();assert.equal(calls.length,0);
});
test('REGRESSION A12: notification switches persist backend preference before local success',async()=>{
 const S={np:{orders:0,promos:0}};let saves=0;const toggle=extract(root,'src/features/Goodies/actions.ts','togglePref')({preferenceSaving:new Set(),supabase:{rpc:async()=>({error:null})},S,save(){saves++;},emit(){}});await toggle('orders');assert.equal(S.np.orders,1);assert.equal(saves,1);
});
test('REGRESSION A13: business storefront selection is included in save',async()=>{
 const requests=[];let pending=Promise.resolve();const f={name:'Synthetic merchant',phone:'',email:'',website:'',description:'',address:'',city:'',country:'HT',delivery_modes:[],hours:{},logo_url:null,accept_scheduled_orders:false,scheduled_order_start_minutes:60,goodies_store_id:'s1'};
 const save=extract(root,'src/screens/businessSpace/BusinessSpaceAccountScreens.tsx','save')({f,b:{id:'synthetic-business'},app:{toast(){},reloadBiz(){},back(){}},a:{run:work=>{pending=work();}},q:async p=>p,supabase:{rpc:async(fn,args)=>{requests.push({fn,args});return {error:null,data:true};}}});
 save();await pending;assert.equal(requests[0].fn,'update_my_business_info');assert.equal(requests[0].args.p_fields.goodies_store_id,'s1');
});
test('REGRESSION A14: secondary orders render canonical quantities and names',()=>{
 let query=0;const order={id:'synthetic-order',order_code:'TEST-ORDER',status:'accepted',items:[{q:3,n:'Synthetic meal'}],payment_status:'paid',total:10};
 const OrdersPanel=extract(root,'src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx','OrdersPanel')({useApp:()=>({biz:{id:'synthetic-business'},tick:0,bump(){},toast(){}}),useState:value=>[value,()=>{}],useQ:()=>({d:query++===0?[]:[order],l:false,e:null}),FX:{FM:{}},LIGHT:{line:'#ddd',ink:'#111',mute:'#555'},money:()=>'$10'});
 assert.ok(flatten(OrdersPanel()).includes('3× Synthetic meal'));
});
test('REGRESSION A15: admin analytics failures have a safe persistent error',async()=>{
 const messages=[];const loadAnalytics=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','loadAnalytics')({beginRead:()=>()=>true,setAnalyticsLoaded(){},setSectionErrors(fn){const state=fn({});messages.push(state.Analytics);},setBusy(){},setAnalytics(){},toast:m=>messages.push(m),supabase:{rpc:async()=>({data:null,error:{message:'permission denied for relation internal_finance_queue (SQLSTATE 42501)'}})}});
 await loadAnalytics();assert.ok(messages.includes('Could not load analytics. Please try again.'));assert.ok(!messages.some(m=>m.includes('internal_finance_queue')));
});
test('REGRESSION A16: failed payout summary displays unavailable instead of zero',()=>{
 let query=0;const app={biz:{id:'synthetic-business'},tick:0,range:{from:'2026-11-01',to:'2026-11-06'},meta:{payout:null,rules:[],minWithdrawal:5}};
 const PayoutsPanel=extract(root,'src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx','LegacyPayoutsPanel')({useApp:()=>app,useS:()=>({}),useTheme:()=>({}),useState:value=>[value,()=>{}],useQ:()=>query++===0?{d:null,l:false,e:'Summary request failed'}:{d:[],l:false,e:null},LIGHT:{blue:'#00f'},money:v=>'$'+v});
 const text=flatten(PayoutsPanel());assert.ok(!text.includes('$0'));assert.ok(text.includes('Unavailable'));
});
test('REGRESSION A17: placeholder catalogs cannot offer seeded builders',async()=>{
 const BYO={cfg:{},drafts:{},store:{}};const loadBuilders=extract(root,'src/features/Goodies/builders/engine.tsx','loadBuilders')({AsyncStorage:{getItem:async()=>null},BKEY:'synthetic-cache',BYO,STB:{s1:{id:'s1'}},fromTemplate:type=>({id:type,enabled:true,available:true}),bClean:value=>value,bsave(){},emit(){}});
 await loadBuilders();assert.equal(Object.keys(BYO.cfg).length,0);
});

test('admin transport failures return a safe failure and do not expose exception details',async()=>{
 const request=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','goodiesRequest')({supabase:{rpc:async()=>{throw new Error('private database connection token');}}});
 const result=await request('synthetic');assert.equal(result.data,null);assert.equal(result.error.message,'The request could not be completed.');
});
test('failed review persistence cannot produce a success toast or local review',async()=>{
 const S={accountId:'synthetic',orders:[{id:'REVIEW-FAIL',backendId:'order-uuid',serverStatus:'completed',sid:'store'}],pf:{n:'Customer'},rev:{},rt:0},messages=[];let saves=0;
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({useRef:value=>({current:value}),useState:value=>[value,()=>{}],S,label,toast:m=>messages.push(m),ui:{close(){throw new Error('Must not close on failure');}},save(){saves++;},emit(){},supabase:{rpc:async()=>({error:{message:'private SQL details'}})}});
 const tree=ReviewSheet({id:'REVIEW-FAIL',stars:()=>null,initialStars:5});await elements(tree).find(e=>e.type==='Cta').props.onPress();
 assert.equal(saves,0);assert.deepEqual(S.rev,{});assert.deepEqual(messages,['Could not submit your review. Please try again.']);
});

test('history paging merges cached rows, advances its server cursor and prevents concurrent duplicate reads',async()=>{
 const cursor={createdAt:'2026-11-06T00:00:00Z',id:'newer-order'},S={accountId:'customer',ordersCursor:cursor,ordersPaging:false,orders:[{backendId:'older-order',id:'OLD',t0:1}],ordersHasMore:true};
 let calls=0,condition='';
 const query={select(){return this;},eq(){return this;},or(value){condition=value;return this;},order(){return this;},async limit(){calls++;return {data:[{id:'older-order',order_code:'OLD',store_id:'removed-store',status:'completed',created_at:'2026-11-05T00:00:00Z',items:[]}],error:null};}};
 const stageByStatus=extract(root,'src/features/Goodies/serverSync.ts','stageByStatus')({});
 const STB={},placeholderStore=extract(root,'src/features/Goodies/store.ts','placeholderStore')({label,bgOf:()=> 'green'}),ensureGoodiesOrderStore=extract(root,'src/features/Goodies/store.ts','ensureGoodiesOrderStore')({STB,placeholderStore});
 const mapOrder=extract(root,'src/features/Goodies/serverSync.ts','mapOrder')({STB,IT:{},stageByStatus,ensureGoodiesOrderStore});
 const load=extract(root,'src/features/Goodies/serverSync.ts','loadOlderGoodiesOrders')({S,supabase:{from:()=>query},mapOrder,save(){},emit(){}});
 await Promise.all([load(),load()]);assert.equal(calls,1);assert.equal(S.orders.length,1);assert.equal(S.orders[0].serverCreatedAt,'2026-11-05T00:00:00Z');assert.equal(S.ordersCursor.id,'older-order');assert.equal(S.ordersHasMore,false);assert.ok(STB['removed-store']);assert.equal(STB['removed-store'].open,0);assert.ok(condition.includes('newer-order'));assert.equal(S.ordersPaging,false);
});
test('history paging cannot overwrite a newer refresh cursor or expose a prior account response',async()=>{
 const oldCursor={createdAt:'2026-11-06T00:00:00Z',id:'old-cursor'},freshCursor={createdAt:'2026-11-06T01:00:00Z',id:'fresh-cursor'};
 const S={accountId:'customer',ordersCursor:oldCursor,ordersPaging:false,orders:[],ordersHasMore:true};
 let switchAccount=false;
 const query={select(){return this;},eq(){return this;},or(){return this;},order(){return this;},async limit(){S.ordersCursor=freshCursor;if(switchAccount){S.accountId='other-customer';S.orders=[];S.ordersPaging=false;}return {data:[{id:'older',created_at:'2026-11-05T00:00:00Z'}],error:null};}};
 const load=extract(root,'src/features/Goodies/serverSync.ts','loadOlderGoodiesOrders')({S,supabase:{from:()=>query},mapOrder:r=>({backendId:r.id,t0:1}),save(){},emit(){}});
 await load();assert.equal(S.ordersCursor,freshCursor);assert.equal(S.orders.length,1);
 switchAccount=true;S.ordersCursor=oldCursor;await load();assert.equal(S.orders.length,0);assert.equal(S.accountId,'other-customer');
});

test('checkout locks before asynchronous validation and always releases after transport failure',async()=>{
 const S={accountId:'customer',busy:0},placingOrders=new Set(),messages=[];let calls=0,release;
 const waiting=new Promise(resolve=>{release=resolve;});
 const placeOrder=extract(root,'src/features/Goodies/actions.ts','placeOrder')({S,placingOrders,emit(){},label,toast:m=>messages.push(m),friendlyError:(_e,fallback)=>fallback,placeOrderWork:async()=>{calls++;await waiting;throw new Error('private transport detail');}});
 const first=placeOrder();await placeOrder();assert.equal(calls,1);assert.equal(S.busy,1);release();await first;assert.equal(S.busy,0);assert.equal(placingOrders.size,0);assert.deepEqual(messages,['Could not confirm the order. Check your order history before trying again.']);
});

test('vendor overview never renders a zero wallet or no-revenue claim after a failed summary request',()=>{
 let query=0;const app={biz:{id:'business',verification:'verified'},meta:{feats:[],payout:{status:'verified'}},range:{from:'2026-11-01',to:'2026-11-06'},tick:0,bump(){}};
 const Home=extract(root,'src/screens/businessSpace/BusinessSpaceHomeScreen.tsx','Home')({useApp:()=>app,useS:()=>({}),useTheme:()=>({}),useSafeAreaInsets:()=>({top:0}),useQ:()=>query++===0?{d:null,e:'Private server error',l:false,reload(){}}:{d:[],e:null,l:false,reload(){}}});
 const tree=Home();assert.ok(!elements(tree).some(e=>e.type==='WalletCard'));assert.ok(!elements(tree).some(e=>e.type==='Empty'&&e.props.title==='No revenue yet'));assert.ok(elements(tree).some(e=>e.type==='ErrBox'&&e.props.e==='Financial summary unavailable.'));
});

test('review retries replace the local order review and refresh the matching public store only after persistence',async()=>{
 const S={accountId:'customer',orders:[{id:'REVIEW-RETRY',backendId:'order-uuid',serverStatus:'completed',sid:'store'}],pf:{n:'Customer'},rev:{},rt:0},changed=[];
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({useRef:value=>({current:value}),useState:value=>[value,()=>{}],S,label,toast(){},ui:{close(){}},save(){},emit(){},notifyStoreReviewsChanged:store=>changed.push(store),supabase:{rpc:async()=>({data:'synthetic-review-id',error:null})}});
 const handler=elements(ReviewSheet({id:'REVIEW-RETRY',stars:()=>null,initialStars:5})).find(e=>e.type==='Cta').props.onPress;
 await handler();await handler();assert.equal(S.rev.store.length,1);assert.equal(S.rev.store[0].orderId,'REVIEW-RETRY');assert.deepEqual(changed,['store','store']);
});
test('older-order review hydration cannot commit across an account switch',async()=>{
 const S={accountId:'customer',ordersCursor:{createdAt:'2026-11-06T00:00:00Z',id:'cursor'},ordersPaging:false,orders:[],ordersHasMore:true};let saves=0;
 const query={select(){return this;},eq(){return this;},or(){return this;},order(){return this;},async limit(){return{data:[{id:'old',created_at:'2026-11-05T00:00:00Z'}],error:null};}};
 const load=extract(root,'src/features/Goodies/serverSync.ts','loadOlderGoodiesOrders')({S,supabase:{from:()=>query},mapOrder:row=>({backendId:row.id,t0:1}),readOrderReviews:async()=>{S.accountId='another-customer';S.orders=[];},save(){saves++;},emit(){}});
 await load();assert.equal(S.orders.length,0);assert.equal(saves,0);
});

test('review hydration queries only the current customer and page and preserves cache on backend failure',async()=>{
 const filters=[],applied=[],orders=[{backendId:'order-one',orderReview:{t:'cached'}}];let fail=false;
 const query={select(){return this;},eq(key,value){filters.push([key,value]);return this;},async in(key,value){filters.push([key,value]);return fail?{data:null,error:{message:'private error'}}:{data:[{order_id:'order-one',target:'store'}],error:null};}};
 const read=extract(root,'src/features/Goodies/serverSync.ts','readOrderReviews')({S:{lang:'ht'},supabase:{from:table=>{assert.equal(table,'goodies_order_reviews');return query;}},applyOrderReviews:(...args)=>applied.push(args)});
 await read(orders,'current-customer');assert.deepEqual(filters,[['customer_id','current-customer'],['order_id',['order-one']]]);assert.equal(applied.length,1);assert.equal(applied[0][2],'ht');
 fail=true;await read(orders,'current-customer');assert.equal(applied.length,1);assert.equal(orders[0].orderReview.t,'cached');
});

test('REGRESSION A27: builder outages expose retryable failure instead of an empty catalog',async()=>{
 const BYO={cfg:{s1:[{id:'old'}]},store:{},drafts:{}};
 const load=extract(root,'src/features/Goodies/builders/engine.tsx','loadBuilders')({label,BYO,BKEY:'synthetic',AsyncStorage:{getItem:async()=>null},STB:{s1:{id:'s1',live:true,businessId:'biz'}},supabase:{from:()=>({select:()=>({in:()=>({eq:async()=>({data:null,error:{message:'private server error'}})})})})},bsave(){},emit(){}});
 await load();assert.equal(BYO.loading,false);assert.equal(BYO.error,'Could not load custom products. Please try again.');assert.ok(!BYO.error.includes('private'));
});

test('REGRESSION A28: checkout payment outages render retry and never a false missing wallet',()=>{
 for(const status of ['loading','error','ready']){
  const S={accountId:'a',paymentOptionsStatus:status,hasWallet:false,wallet:0,pay:'wallet',cards:[],cs:2,cart:{sid:'s',lines:[]},sch:0};
  let retries=0;
  const view=extract(root,'src/features/Goodies/screens/Shop.tsx','Checkout')({S,label,useTheme:()=>({mut:'#555',red:'#f00',br:'#333',ink:'#000'}),totals:()=>({st:{id:'s',n:'Store',open:1,live:true},total:20}),isPk:()=>false,addr:()=>({t:'Synthetic address'}),ctOf:()=>null,useState:v=>[v,()=>{}],useEffect(){},deliveryAddressKey:()=> 'synthetic-address',deliveryQuoteReady:()=> true,cartStoreIds:()=> ['s'],fees:()=>({pay:{Wallet:true,Card:true}}),providerInfo:{demo:false},hasAlcohol:()=>false,money:v=>'$'+v,refreshPaymentOptions:()=>{retries++;},setPay(){},setSch(){},back(){},go(){},createWallet(){},setCard(){},cnt:()=>1,dp:x=>x,checkoutNext(){},placeOrder(){}});
  const tree=view(),text=flatten(tree);const missing=text.includes('Wantiss wallet not found');assert.equal(missing,status==='ready');
  if(status==='error'){assert.ok(text.includes('Payment details unavailable'));const retry=elements(tree).find(e=>e.type==='Cta'&&e.props.label==='Try again');assert.ok(retry);retry.props.onPress();assert.equal(retries,1);}
  if(status==='loading')assert.ok(text.includes('Loading payment methods'));
 }
});

test('store sharing never displays private friend-list or message transport errors',async()=>{
 const messages=[],problems=[],set=()=>{},S={accountId:'customer'},failure=new Error('private relation SQLSTATE 42501 connection token');
 const query={select(){return this;},eq(){return this;},or:async()=>({error:failure}),contains(){return this;},limit(){return this;},maybeSingle:async()=>({error:failure})};
 const context={S,setShareOpen:set,setShareLoading:set,setShareProblem:value=>problems.push(value),setShareFriends:set,setShareSending:set,shareSending:null,label,Alert:{alert:(_title,message)=>messages.push(message)},friendlyError:(_e,fallback)=>fallback,supabase:{auth:{getUser:async()=>({data:{user:{id:'customer'}}})},from:()=>query,rpc:async()=>({data:[]})}};
 await extract(root,'src/features/Goodies/screens/Shop.tsx','openStoreShare')(context)();
 await extract(root,'src/features/Goodies/screens/Shop.tsx','sendStoreToFriend')(context)('friend');
 assert.deepEqual(messages,['Could not load friends.','Please try again.']);assert.equal(problems.at(-1),'Could not load friends.');
});
test('store sharing never starts a write for a replacement account',async()=>{
 const S={accountId:'customer'};let calls=0;
 const send=extract(root,'src/features/Goodies/screens/Shop.tsx','sendStoreToFriend')({S,shareSending:null,setShareProblem(){},setShareSending(){},supabase:{auth:{getUser:async()=>{S.accountId='other';return{data:{user:{id:'other'}}};}},from:()=>{calls++;throw Error('Must not query');}},label,Alert:{alert(){throw Error('Must not alert the replacement account');}},friendlyError:(_e,fallback)=>fallback});
 await send('friend');assert.equal(calls,0);
});

function receiptHarness(){
 const S={accountId:'customer',orders:[{backendId:'order',serverStatus:'picked_up'}]},messages=[],states=[],calls=[];let resolve;
 const response=new Promise(done=>resolve=done),scope={active:true},context={S,accountId:'customer',scopeRef:{current:scope},receiptLock:{current:null},o:S.orders[0],label,toast:m=>messages.push(m),setReceiptBusy:v=>states.push(v),setReportOpen(){},setReportText(){},setTrackingRetry(){},supabase:{rpc:async(...args)=>{calls.push(args);return response;}},save(){},emit(){},require:()=>({stage:()=>4})};
 return{S,messages,states,calls,scope,context,resolve,call:extract(root,'src/features/Goodies/screens/Shop.tsx','receiptCall')(context)};
}
test('receipt double taps send one request and update the current order record',async()=>{
 const h=receiptHarness(),one=h.call('goodies_customer_confirm_received',{},'Confirmed');await h.call('goodies_customer_confirm_received',{},'Confirmed');assert.equal(h.calls.length,1);
 h.S.orders=[{backendId:'order',serverStatus:'picked_up'}];h.resolve({error:null});await one;assert.equal(h.S.orders[0].serverStatus,'completed');assert.deepEqual(h.messages,['Confirmed']);assert.equal(h.context.receiptLock.current,null);
});
test('late receipt responses after account change or unmount cannot update another screen',async()=>{
 for(const invalidate of [h=>h.S.accountId='other',h=>h.scope.active=false]){
  const h=receiptHarness(),pending=h.call('goodies_customer_confirm_received',{},'Confirmed');invalidate(h);h.resolve({error:null});await pending;assert.equal(h.S.orders[0].serverStatus,'picked_up');assert.equal(h.messages.length,0);
 }
});
test('stale product controls never add a removed product or crash after a store disappears',()=>{
 for(const removedStore of [false,true])for(const name of ['openProduct','quickAdd','productQty','productAdd']){
  const messages=[],S={sh:{id:'removed',q:1}},IT=removedStore?{removed:{id:'removed',s:'closed'}}:{};
  const action=extract(root,'src/features/Goodies/actions.ts',name)({S,IT,STB:{},label,toast:m=>messages.push(m),cartAdd(){throw Error('Must not add');},push(){throw Error('Must not navigate');}});
  assert.doesNotThrow(()=>action(name==='productQty'?1:'removed'));assert.deepEqual(messages,['Please select the product again and retry.']);
 }
});
test('removed cart products remain removable but cannot be incremented',()=>{
 const S={cart:{sid:'store',lines:[{id:'removed',k:'line',q:2}]}},messages=[];
 const action=extract(root,'src/features/Goodies/actions.ts','qty')({S,IT:{},STB:{},label,toast:m=>messages.push(m),cartStoreIds:()=>['store'],save(){},emit(){}});
 action('line',1);assert.equal(S.cart.lines[0].q,2);assert.equal(messages.length,1);action('line',-1);assert.equal(S.cart.lines[0].q,1);
});
test('store info sheet handles a removed store and returns to the real store browser',()=>{
 let closed=0,browsed=0;
 const Sheets=extract(root,'src/features/Goodies/components/Sheets.tsx','Sheets')({useTheme:()=>({}),useSafeAreaInsets:()=>({bottom:0}),useWindowDimensions:()=>({height:800}),STB:{},label,A:{browse(){browsed++;}}});
 const tree=Sheets({sheet:{kind:'sinfo',id:'removed'},close:()=>closed++}),empty=elements(tree).find(e=>e.type==='Empty');assert.ok(empty);empty.props.onPress();assert.equal(closed,1);assert.equal(browsed,1);
});
function courierPresenceHarness(){
 const calls=[],alerts=[],busy=[],owner={current:'courier'},mounted={current:true},mutation={current:null};let resolve;
 const response=new Promise(done=>resolve=done),context={owner,mounted,mutation,acceptsCash:false,setBusy:v=>busy.push(v),supabase:{rpc:async(...args)=>{calls.push(args);return response;}},label,friendlyError:(_error,fallback)=>fallback,Alert:{alert:(...args)=>alerts.push(args)},setAvailable(){},setAcceptsCash(){}};
 return{calls,alerts,busy,owner,mounted,mutation,resolve,run:extract(root,'src/features/Goodies/GoodiesCourierScreen.tsx','setPresence')(context)};
}
test('courier availability double taps dispatch once and network failures release the busy state safely',async()=>{
 const h=courierPresenceHarness(),pending=h.run(true);await h.run(true);assert.equal(h.calls.length,1);h.resolve(Promise.reject(Error('private SQLSTATE table')));await pending;assert.equal(h.mutation.current,null);assert.equal(h.busy.at(-1),'');assert.deepEqual(h.alerts,[['Availability not updated','Please try again.']]);
});
test('late courier presence failures cannot alert a replacement account',async()=>{
 const h=courierPresenceHarness(),pending=h.run(true);h.owner.current='another';h.resolve({error:{message:'private'}});await pending;assert.equal(h.alerts.length,0);assert.equal(h.mutation.current,null);
});

test('order history exposes a failed initial auth transport instead of an endless loading state',async()=>{
 const S={ordersLoading:true},messages=[];
 const start=extract(root,'src/features/Goodies/serverSync.ts','startGoodiesSync')({S,activeRefresh:null,emit:()=>messages.push('update'),supabase:{auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>{throw Error('private transport');}}},AppState:{addEventListener:()=>({remove(){}})}});
 const stop=start();await new Promise(resolve=>setImmediate(resolve));assert.equal(S.ordersLoading,false);assert.equal(S.ordersError,'unavailable');assert.ok(messages.length);stop();
});
test('removed catalog stores do not crash product rendering or hide an existing order confirmation',()=>{
 const Product=extract(root,'src/features/Goodies/screens/Shop.tsx','Product')({S:{sh:{id:'product'}},IT:{product:{s:'removed'}},STB:{},useTheme:()=>({}),useWindowDimensions:()=>({width:390}),useState:v=>[v,()=>{}],useEffect(){},label,back(){},browse(){}});assert.equal(elements(Product()).find(e=>e.type==='Empty').props.title,'Product not found');
 const Confirm=extract(root,'src/features/Goodies/screens/Shop.tsx','Confirm')({S:{orders:[{id:'ORDER',backendId:'uuid',sid:'removed',sn:'Historical shop',lines:[]}]},STB:{},useTheme:()=>({}),label,back(){},browse(){},money:()=>'$1'});assert.ok(flatten(Confirm({id:'ORDER'})).includes('Historical shop'));
});

test('courier reads cannot restore an old account after authentication changes mid-request',async()=>{
 let resolve,calls=0;const owner={current:'old'},pendingAuth=new Promise(done=>resolve=done);
 const read=extract(root,'src/features/Goodies/GoodiesCourierScreen.tsx','read')({owner,mounted:{current:true},setUid(){throw Error('Must not restore old account');},supabase:{auth:{getUser:()=>pendingAuth},from(){calls++;throw Error('Must not query an old account');}}});
 const pending=read();owner.current='new';resolve({data:{user:{id:'old'}},error:null});assert.equal(await pending,null);assert.equal(calls,0);
});
test('courier account changes while presence loads cannot request the next account’s assignments',async()=>{
 let resolve,calls=0;const owner={current:'old'},presence=new Promise(done=>resolve=done);
 const read=extract(root,'src/features/Goodies/GoodiesCourierScreen.tsx','read')({owner,mounted:{current:true},setUid(){},supabase:{auth:{getUser:async()=>({data:{user:{id:'old'}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:()=>presence})})}),rpc(){calls++;throw Error('Must not query a different account');}}});
 const pending=read();await new Promise(resolve=>setImmediate(resolve));owner.current='new';resolve({data:null,error:null});assert.equal(await pending,null);assert.equal(calls,0);
});
test('a failed courier load exposes retry without claiming no delivery offers exist',()=>{
 let index=0;
 const Courier=extract(root,'src/features/Goodies/GoodiesCourierScreen.tsx','GoodiesCourierScreen')({label,useState:initial=>[index++===6?false:index===8?true:initial,()=>{}],useEffect(){},useRef:value=>({current:value}),useCallback:fn=>fn});
 const tree=Courier({onSignOut(){}}),text=flatten(tree);assert.ok(text.includes('Could not load deliveries'));assert.ok(text.includes('Try again'));assert.ok(!text.includes('No active delivery offers'));
});
test('the new-cart confirmation executes the existing builder callback exactly once',()=>{
 let committed=0;const S={pend:[null,null,()=>committed++]},run=extract(root,'src/features/Goodies/actions.ts','newCart')({S,IT:{},STB:{},ui:{close(){}},label,toast(){}});run();assert.equal(committed,1);assert.equal(S.pend,null);
});
test('a pending product removed before new-cart confirmation cannot clear the saved cart',()=>{
 const cart={sid:'old',lines:[{id:'saved'}]},S={cart,pend:[{id:'removed'},{q:1}]};const run=extract(root,'src/features/Goodies/actions.ts','newCart')({S,IT:{},STB:{},ui:{close(){}},label,toast(){}});run();assert.equal(S.cart,cart);assert.equal(S.cart.lines.length,1);assert.equal(S.pend,null);
});
test('builder new-cart confirmation revalidates availability and recalculates the current composition before clearing the cart',()=>{
 for(const available of [true,false]){const cart={sid:'old',lines:[{id:'saved'}]},S={accountId:'customer',cart},BD={sid:'new',bid:'builder',q:1,busy:0},builder={id:'builder'},commits=[];let valid=true,price=10;
  const add=extract(root,'src/features/Goodies/builders/engine.tsx','bzAddOrder')({BD,S,STB:{old:{n:'Old'},new:{n:'New'}},bGet:()=>builder,bCheck:()=>({ok:valid}),bLine:()=>({p:price}),animateCommit:(_b,line)=>commits.push(line),label,toast(){},ui:{sheet(){},close(){}}});
  add();assert.equal(typeof S.pend[2],'function');valid=available;price=15;S.pend[2]();if(available){assert.equal(commits[0].p,15);assert.equal(S.cart.lines.length,0);}else{assert.equal(commits.length,0);assert.equal(S.cart,cart);}
 }
});
test('reordering keeps product options and notes while refreshing prices, stock and promotional discounts',()=>{
 const line={id:'meal',k:'past-key',n:'Old name',e:'',p:3,q:3,d:'Large, + drink, no onions',options:{size:'large',drink:true,discount_pct:20}},IT={meal:{id:'meal',s:'store',n:'Current meal',e:'🍔',p:12,stock:2,oos:0}};
 const reorder=extract(root,'src/features/Goodies/store.ts','reorderLines')({IT,STB:{store:{live:true,open:1,c:'restaurants'}},hooks:{}}),result=reorder({sid:'store',lines:[line]});assert.equal(result.ok.length,1);assert.equal(result.ok[0].p,14.5);assert.equal(result.ok[0].q,2);assert.equal(result.ok[0].s,'store');assert.equal(result.ok[0].d,line.d);assert.equal(result.ok[0].options.discount_pct,0);assert.equal(result.ok[0].options.size,'large');assert.equal(result.ok[0].options.drink,true);
 const missing=extract(root,'src/features/Goodies/store.ts','reorderLines')({IT,STB:{},hooks:{}})({sid:'removed',lines:[line]});assert.equal(missing.ok.length,0);assert.equal(missing.miss.length,1);
});
test('direct cart additions reject stale catalog snapshots rather than silently adding removed products',()=>{
 const messages=[],context={IT:{},label,toast:m=>messages.push(m)},add=extract(root,'src/features/Goodies/store.ts','cartAdd')(context);add({id:'removed',s:'store'},{q:1});assert.deepEqual(messages,['Please select the product again and retry.']);
 const canBuy=extract(root,'src/features/Goodies/store.ts','canBuy')({...context,STB:{}});assert.equal(canBuy({id:'removed',s:'store'}),false);
});
test('stock changes before new-cart confirmation preserve the existing cart',()=>{
 const cart={sid:'old',lines:[{id:'saved'}]},product={id:'product',s:'new',stock:1},S={cart,pend:[product,{q:2}]},messages=[];
 const run=extract(root,'src/features/Goodies/actions.ts','newCart')({S,IT:{product},STB:{new:{}},canBuy:()=>true,ui:{close(){}},label,toast:m=>messages.push(m)});run();assert.equal(S.cart,cart);assert.equal(messages[0],'Only 1 available');
});
