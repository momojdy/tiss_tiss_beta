/* Source-function regression tests; transports/native widgets are synthetic. Live snapshots remain explicitly identified. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {test}=require('node:test'),root=path.resolve(__dirname,'..'),admin=path.resolve(root,'../tiss-admin');
function extract(repo,file,name){const filename=path.join(repo,file),ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);let found;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;else if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer)found=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(found,'Missing '+name);
 const code=ts.isFunctionDeclaration(found)?found.getText(ast)+'\nmodule.exports='+name+';':'module.exports='+found.initializer.getText(ast)+';';
 const javascript=ts.transpileModule(code,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 const tags=new Set();function tag(node){if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))tags.add(node.tagName.getText(ast));ts.forEachChild(node,tag);}tag(found);
 return context=>{const module={exports:{}};const env={module,exports:module.exports,React,Date,console,require,...Object.fromEntries([...tags].filter(x=>!x.includes('.')).map(x=>[x,x])),goodiesRequest:(...args)=>context.supabase.rpc(...args),notifyStoreReviewsChanged(){},readOrderReviews:async()=>{},...context};vm.runInNewContext(javascript,env,{filename});return module.exports;};
}
const label=(_id,fallback)=>fallback;function flatten(node){if(Array.isArray(node))return node.map(flatten).join(' ');if(node==null||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);return flatten(node.props?.children);}function elements(node,out=[]){if(Array.isArray(node))node.forEach(x=>elements(x,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;}
test('REGRESSION A01: vendor errors never render raw database detail',()=>{
 const errText=extract(root,'src/screens/businessSpace/BusinessSpaceShared.tsx','errText')({Error});
 const message='permission denied for relation goodies_orders (SQLSTATE 42501)';assert.equal(errText(new Error(message)),'Could not complete this request. Please try again.');
});
test('REGRESSION A02: receipt errors use safe app-owned copy',async()=>{
 const messages=[],order={backendId:'synthetic-order'};const receiptCall=extract(root,'src/features/Goodies/screens/Shop.tsx','receiptCall')({receiptBusy:false,setReceiptBusy(){},supabase:{rpc:async()=>({error:{message:'already reported; SQLSTATE 42501 private.internal_queue'}})},toast:value=>messages.push(value),label,o:order,save(){},emit(){}});
 await receiptCall('goodies_customer_dispute_delivery',{},'Success');assert.equal(messages[0],'Could not send this. Please try again.');
});
test('REGRESSION A03: admin Reject requires and sends a reason',async()=>{
 const calls=[],messages=[];const reviewProduct=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','reviewProduct')({busy:'',setRejection(){},setBusy(){},supabase:{rpc:async(fn,args)=>{calls.push({fn,args});return {error:null};}},toast:m=>messages.push(m),reload:async()=>{}});
 await reviewProduct({id:'synthetic-product'},'rejected');assert.equal(calls.length,0);assert.equal(messages[0],'Enter a rejection reason.');
 await reviewProduct({id:'synthetic-product'},'rejected','Needs a clear photo');assert.equal(calls[0].args.p_note,'Needs a clear photo');
});
test('REGRESSION A04: rating Submit claims success only after backend success',async()=>{
 const S={orders:[{id:'ORDER-TEST',backendId:'order-uuid',sid:'synthetic-store'}],pf:{n:'Synthetic customer'},rev:{},rt:0},messages=[];let saved=0;
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({supabase:{rpc:async()=>({error:null})},useRef:value=>({current:value}),useState:initial=>[initial,()=>{}],S,label,toast:m=>messages.push(m),ui:{close(){}},save(){saved++;},emit(){}});
 const tree=ReviewSheet({id:'ORDER-TEST',stars:()=>null,initialStars:5});await elements(tree).find(element=>element.type==='Cta').props.onPress();assert.equal(saved,1);assert.equal(S.rev['synthetic-store'][0].r,5);assert.equal(messages[0],'Thanks for your review!');
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
 const Store=extract(root,'src/features/Goodies/screens/Shop.tsx','Store')({useStoreReviews:()=>({rows:[]}),label,back(){},browse(){},useTheme:()=>({}),useEffect(){},STB:{},S:{ss:{}},addr:()=>null});assert.doesNotThrow(()=>Store({id:'removed-store'}));
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
test('LIVE SNAPSHOT A10 (deployment pending): live product photo-array grants disagree with the vendor save payload',()=>{
 const live=JSON.parse(fs.readFileSync(path.join(root,'docs/goodies/audit-live-moderation.json'),'utf8'));assert.equal(live.product_columns.find(c=>c.column==='photo_urls').insert,false);assert.equal(live.product_columns.find(c=>c.column==='photo_urls').update,false);
 const source=fs.readFileSync(path.join(root,'src/screens/businessSpace/BusinessSpaceGoodies.tsx'),'utf8');assert.ok(source.includes('photoUrls: nextPhotoUrls'));assert.ok(source.includes('f.photo_urls ='));
});
test('REGRESSION A11: fee save refuses unloaded defaults',async()=>{
 const calls=[];const saveFees=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','saveFees')({feesLoaded:false,busy:'',fee:'0',tips:'0,1,2,3',firstFree:false,wallet:true,card:true,cash:true,loading:true,setBusy(){},toast(){},supabase:{rpc:async(fn,args)=>{calls.push({fn,args});return {error:null};}}});
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
 const messages=[];const loadAnalytics=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','loadAnalytics')({setAnalyticsLoaded(){},setSectionErrors(fn){const state=fn({});messages.push(state.Analytics);},setBusy(){},setAnalytics(){},toast:m=>messages.push(m),supabase:{rpc:async()=>({data:null,error:{message:'permission denied for relation internal_finance_queue (SQLSTATE 42501)'}})}});
 await loadAnalytics();assert.ok(messages.includes('Could not load analytics. Please try again.'));assert.ok(!messages.some(m=>m.includes('internal_finance_queue')));
});
test('REGRESSION A16: failed payout summary displays unavailable instead of zero',()=>{
 let query=0;const app={biz:{id:'synthetic-business'},tick:0,range:{from:'2026-11-01',to:'2026-11-06'},meta:{payout:null,rules:[],minWithdrawal:5}};
 const PayoutsPanel=extract(root,'src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx','PayoutsPanel')({useApp:()=>app,useS:()=>({}),useTheme:()=>({}),useState:value=>[value,()=>{}],useQ:()=>query++===0?{d:null,l:false,e:'Summary request failed'}:{d:[],l:false,e:null},LIGHT:{blue:'#00f'},money:v=>'$'+v});
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
 const S={accountId:'synthetic',orders:[{id:'REVIEW-FAIL',backendId:'order-uuid',sid:'store'}],pf:{n:'Customer'},rev:{},rt:0},messages=[];let saves=0;
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({useRef:value=>({current:value}),useState:value=>[value,()=>{}],S,label,toast:m=>messages.push(m),ui:{close(){throw new Error('Must not close on failure');}},save(){saves++;},emit(){},supabase:{rpc:async()=>({error:{message:'private SQL details'}})}});
 const tree=ReviewSheet({id:'REVIEW-FAIL',stars:()=>null,initialStars:5});await elements(tree).find(e=>e.type==='Cta').props.onPress();
 assert.equal(saves,0);assert.deepEqual(S.rev,{});assert.deepEqual(messages,['Could not submit your review. Please try again.']);
});

test('history paging merges cached rows, advances its server cursor and prevents concurrent duplicate reads',async()=>{
 const cursor={createdAt:'2026-11-06T00:00:00Z',id:'newer-order'},S={accountId:'customer',ordersCursor:cursor,ordersPaging:false,orders:[{backendId:'older-order',id:'OLD',t0:1}],ordersHasMore:true};
 let calls=0,condition='';
 const query={select(){return this;},eq(){return this;},or(value){condition=value;return this;},order(){return this;},async limit(){calls++;return {data:[{id:'older-order',order_code:'OLD',store_id:'removed-store',status:'completed',created_at:'2026-11-05T00:00:00Z',items:[]}],error:null};}};
 const stageByStatus=extract(root,'src/features/Goodies/serverSync.ts','stageByStatus')({});
 const mapOrder=extract(root,'src/features/Goodies/serverSync.ts','mapOrder')({STB:{},IT:{},stageByStatus});
 const load=extract(root,'src/features/Goodies/serverSync.ts','loadOlderGoodiesOrders')({S,supabase:{from:()=>query},mapOrder,save(){},emit(){}});
 await Promise.all([load(),load()]);assert.equal(calls,1);assert.equal(S.orders.length,1);assert.equal(S.orders[0].serverCreatedAt,'2026-11-05T00:00:00Z');assert.equal(S.ordersCursor.id,'older-order');assert.equal(S.ordersHasMore,false);assert.ok(condition.includes('newer-order'));assert.equal(S.ordersPaging,false);
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
 const S={accountId:'customer',orders:[{id:'REVIEW-RETRY',backendId:'order-uuid',sid:'store'}],pf:{n:'Customer'},rev:{},rt:0},changed=[];
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({useRef:value=>({current:value}),useState:value=>[value,()=>{}],S,label,toast(){},ui:{close(){}},save(){},emit(){},notifyStoreReviewsChanged:store=>changed.push(store),supabase:{rpc:async()=>({error:null})}});
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
