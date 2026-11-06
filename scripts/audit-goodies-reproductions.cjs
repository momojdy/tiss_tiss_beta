/* Defect reproductions. Passing assertions CONFIRM the named defect; they do not certify readiness. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {test}=require('node:test'),root=path.resolve(__dirname,'..'),admin=path.resolve(root,'../tiss-admin');
function extract(repo,file,name){const filename=path.join(repo,file),ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);let found;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;else if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer)found=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(found,'Missing '+name);
 const code=ts.isFunctionDeclaration(found)?found.getText(ast)+'\nmodule.exports='+name+';':'module.exports='+found.initializer.getText(ast)+';';
 const javascript=ts.transpileModule(code,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 const tags=new Set();function tag(node){if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))tags.add(node.tagName.getText(ast));ts.forEachChild(node,tag);}tag(found);
 return context=>{const module={exports:{}};const env={module,exports:module.exports,React,Date,console,require,...Object.fromEntries([...tags].filter(x=>!x.includes('.')).map(x=>[x,x])),...context};vm.runInNewContext(javascript,env,{filename});return module.exports;};
}
const label=(_id,fallback)=>fallback;function flatten(node){if(Array.isArray(node))return node.map(flatten).join(' ');if(node==null||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);return flatten(node.props?.children);}function elements(node,out=[]){if(Array.isArray(node))node.forEach(x=>elements(x,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;}
test('CONFIRMED DEFECT A01: vendor errText returns raw database/server detail',()=>{
 const errText=extract(root,'src/screens/businessSpace/BusinessSpaceShared.tsx','errText')({Error});
 const message='permission denied for relation goodies_orders (SQLSTATE 42501)';assert.equal(errText(new Error(message)),message);
});
test('CONFIRMED DEFECT A02: consumer receipt error keyword check allows arbitrary server detail',async()=>{
 const messages=[],order={backendId:'synthetic-order'};const receiptCall=extract(root,'src/features/Goodies/screens/Shop.tsx','receiptCall')({receiptBusy:false,setReceiptBusy(){},supabase:{rpc:async()=>({error:{message:'already reported; SQLSTATE 42501 private.internal_queue'}})},toast:value=>messages.push(value),label,o:order,save(){},emit(){}});
 await receiptCall('goodies_customer_dispute_delivery',{},'Success');assert.ok(messages[0].includes('private.internal_queue'));
});
test('CONFIRMED DEFECT A03: admin Reject supplies no backend-required reason and displays raw error',async()=>{
 const calls=[],messages=[];const reviewProduct=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','reviewProduct')({setBusy(){},supabase:{rpc:async(fn,args)=>{calls.push({fn,args});return {error:{message:'A rejection reason is required'}};}},toast:m=>messages.push(m),reload:async()=>{}});
 await reviewProduct({id:'synthetic-product'},'rejected');assert.equal(calls[0].args.p_note,null);assert.equal(messages[0],'A rejection reason is required');
});
test('CONFIRMED DEFECT A04: rating Submit claims success with only local mutations',()=>{
 const S={orders:[{id:'ORDER-TEST',sid:'synthetic-store'}],pf:{n:'Synthetic customer'},rev:{},rt:0},messages=[];let saved=0;
 const ReviewSheet=extract(root,'src/features/Goodies/components/Sheets.tsx','ReviewSheet')({useState:initial=>[initial,()=>{}],S,label,toast:m=>messages.push(m),ui:{close(){}},save(){saved++;},emit(){}});
 const tree=ReviewSheet({id:'ORDER-TEST',stars:()=>null,initialStars:5});elements(tree).find(element=>element.type==='Cta').props.onPress();assert.equal(saved,1);assert.equal(S.rev['synthetic-store'][0].r,5);assert.equal(messages[0],'Thanks for your review!');
 const source=fs.readFileSync(path.join(root,'src/features/Goodies/components/Sheets.tsx'),'utf8');const body=source.slice(source.indexOf('function ReviewSheet'),source.indexOf('function ContactsSheet'));assert.ok(!/supabase|\.rpc\(|\.insert\(|\.invoke\(/.test(body));
});
test('CONFIRMED DEFECT A05: genuine platform support confirmation is labelled demo/disconnected',()=>{
 const Account=extract(root,'src/features/Goodies/screens/Account.tsx','Account')({useTheme:()=>({mut:'#555'}),S:{},STB:{},label});
 const text=flatten(Account({r:'supdone',p:{ticket:'SUP-TEST-001',storeId:''}}));assert.ok(text.includes('SUP-TEST-001 (demo)'));assert.ok(text.includes('not connected to a live support inbox'));
});
test('CONFIRMED DEFECT A06: unavailable historical stores acquire sample reviews in production',()=>{
 const StoreReviews=extract(root,'src/features/Goodies/screens/Shop.tsx','StoreReviews')({useTheme:()=>({mut:'#555'}),STB:{'old-store':{n:'Historical store',e:'',rv:0}},S:{rev:{}},SEED_REVIEWS:[{n:'Sample customer',r:5,t:'Invented sample review',d:'2 days ago'}],label,back(){},browse(){},go(){}});
 assert.ok(flatten(StoreReviews({id:'old-store'})).includes('Invented sample review'));
});
test('CONFIRMED DEFECT A07: Store route crashes when the supplied store is missing',()=>{
 const Store=extract(root,'src/features/Goodies/screens/Shop.tsx','Store')({useTheme:()=>({}),useEffect(){},STB:{},S:{ss:{}},addr:()=>null});assert.throws(()=>Store({id:'removed-store'}),/undefined/);
});
test('CONFIRMED DEFECT A08: newly synchronized historical order can crash without a catalog store',()=>{
 const Orders=extract(root,'src/features/Goodies/screens/Shop.tsx','Orders')({useEffect(){},useTheme:()=>({}),S:{orders:[{id:'OLD-ORDER',backendId:'order-id',sid:'unpublished-store',t0:Date.now(),st:0,total:1}],ot:'active'},STB:{},done:()=>false,label,stageLabels:()=>['Placed'],TP:[],TL:[],setOrdersTab(){},fmtDay:()=>'',money:()=>'$1'});
 assert.throws(()=>Orders(),/undefined/);
});
test('CONFIRMED DEFECT A09: pickup map always says coordinates missing even with known coordinates',()=>{
 const PickupLocationMap=extract(root,'src/features/Goodies/screens/Shop.tsx','PickupLocationMap')({label,STB:{store:{storeLatitude:18.5,storeLongitude:-72.3}}});const text=flatten(PickupLocationMap());
 const nodes=elements(PickupLocationMap());assert.equal(nodes.find(node=>node.type==='Empty').props.title,'Live location unavailable');assert.equal(nodes.find(node=>node.type==='Empty').props.text,'Pickup coordinates have not been provided by the store.');
});
test('CONFIRMED DEFECT A10: live product photo-array grants disagree with the vendor save payload',()=>{
 const live=JSON.parse(fs.readFileSync(path.join(root,'docs/goodies/audit-live-moderation.json'),'utf8'));assert.equal(live.product_columns.find(c=>c.column==='photo_urls').insert,false);assert.equal(live.product_columns.find(c=>c.column==='photo_urls').update,false);
 const source=fs.readFileSync(path.join(root,'src/screens/businessSpace/BusinessSpaceGoodies.tsx'),'utf8');assert.ok(source.includes('photoUrls: nextPhotoUrls'));assert.ok(source.includes('f.photo_urls ='));
});
test('CONFIRMED DEFECT A11: fee save can submit defaults without waiting for configuration to load',async()=>{
 const calls=[];const saveFees=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','saveFees')({fee:'0',tips:'0,1,2,3',firstFree:false,wallet:true,card:true,cash:true,loading:true,setBusy(){},toast(){},supabase:{rpc:async(fn,args)=>{calls.push({fn,args});return {error:null};}}});
 await saveFees();assert.equal(calls[0].args.p_service_fee,0);assert.equal(calls[0].fn,'goodies_admin_update_fee_policy');
});
test('CONFIRMED DEFECT A12: notification switches persist only a local preference',()=>{
 const S={np:{orders:0,promos:0}};let saves=0;const toggle=extract(root,'src/features/Goodies/actions.ts','togglePref')({S,save(){saves++;},emit(){}});toggle('orders');assert.equal(S.np.orders,1);assert.equal(saves,1);
});
test('CONFIRMED DEFECT A13: business Goodies storefront selector is omitted from the actual save request',async()=>{
 const requests=[];let pending=Promise.resolve();const f={name:'Synthetic merchant',phone:'',email:'',website:'',description:'',address:'',city:'',country:'HT',delivery_modes:[],hours:{},logo_url:null,accept_scheduled_orders:false,scheduled_order_start_minutes:60,goodies_store_id:'s1'};
 const save=extract(root,'src/screens/businessSpace/BusinessSpaceAccountScreens.tsx','save')({f,b:{id:'synthetic-business'},app:{toast(){},reloadBiz(){},back(){}},a:{run:work=>{pending=work();}},q:async p=>p,supabase:{rpc:async(fn,args)=>{requests.push({fn,args});return {error:null,data:true};}}});
 save();await pending;assert.equal(requests[0].fn,'update_my_business_info');assert.equal(requests[0].args.p_fields.goodies_store_id,undefined);
});
test('CONFIRMED DEFECT A14: secondary vendor orders panel misreads canonical q/n item snapshots',()=>{
 let query=0;const order={id:'synthetic-order',order_code:'TEST-ORDER',status:'accepted',items:[{q:3,n:'Synthetic meal'}],payment_status:'paid',total:10};
 const OrdersPanel=extract(root,'src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx','OrdersPanel')({useApp:()=>({biz:{id:'synthetic-business'},tick:0,bump(){},toast(){}}),useState:value=>[value,()=>{}],useQ:()=>({d:query++===0?[]:[order],l:false,e:null}),FX:{FM:{}},LIGHT:{line:'#ddd',ink:'#111',mute:'#555'},money:()=>'$10'});
 assert.ok(flatten(OrdersPanel()).includes('1× undefined'));
});
test('CONFIRMED DEFECT A15: admin analytics errors expose raw SQL details',async()=>{
 const messages=[];const loadAnalytics=extract(admin,'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx','loadAnalytics')({setBusy(){},setAnalytics(){},toast:m=>messages.push(m),supabase:{rpc:async()=>({data:null,error:{message:'permission denied for relation internal_finance_queue (SQLSTATE 42501)'}})}});
 await loadAnalytics();assert.equal(messages[0],'permission denied for relation internal_finance_queue (SQLSTATE 42501)');
});
test('CONFIRMED DEFECT A16: vendor payout summary shows zero funds when its summary request failed',()=>{
 let query=0;const app={biz:{id:'synthetic-business'},tick:0,range:{from:'2026-11-01',to:'2026-11-06'},meta:{payout:null,rules:[],minWithdrawal:5}};
 const PayoutsPanel=extract(root,'src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx','PayoutsPanel')({useApp:()=>app,useS:()=>({}),useTheme:()=>({}),useState:value=>[value,()=>{}],useQ:()=>query++===0?{d:null,l:false,e:'Summary request failed'}:{d:[],l:false,e:null},LIGHT:{blue:'#00f'},money:v=>'$'+v});
 const text=flatten(PayoutsPanel());assert.ok(text.includes('$0'));assert.ok(!text.includes('Summary request failed'));
});
test('CONFIRMED DEFECT A17: legacy placeholder-only catalogs retain demo builders in production loader',async()=>{
 const BYO={cfg:{},drafts:{},store:{}};const loadBuilders=extract(root,'src/features/Goodies/builders/engine.tsx','loadBuilders')({AsyncStorage:{getItem:async()=>null},BKEY:'synthetic-cache',BYO,STB:{s1:{id:'s1'}},fromTemplate:type=>({id:type,enabled:true,available:true}),bClean:value=>value,bsave(){},emit(){}});
 await loadBuilders();assert.equal(BYO.cfg.s1.length,2);assert.equal(BYO.cfg.s1[0].id,'pizza');
});
