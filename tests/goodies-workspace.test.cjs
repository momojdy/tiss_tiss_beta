const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const app={userId:'owner',email:'owner@example.test',biz:{id:'business',goodies_store_id:'store'},meta:{feats:[{feature:'goodies'}]}};
function service(responses={},user='owner'){
 const calls=[];
 const client={auth:{getUser:async()=>({data:{user:{id:user,email:'owner@example.test'}}})},rpc:async(name,args)=>{calls.push({rpc:name,args});return responses[name]||{data:null,error:null};},from:table=>{const call={table,filters:[]};calls.push(call);const query=new Proxy({then(resolve,reject){return Promise.resolve(responses[table]||{data:[],error:null}).then(resolve,reject);}}, {get(target,name){return name==='then'?target.then:(...args)=>{call.filters.push([name,...args]);return query;};}});return query;}};
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/goodiesWorkspace.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Date,require:id=>id.includes('supabase')?{supabase:client}:{isGoodiesOnlyBusiness:a=>a.meta.feats.every(f=>f.feature==='goodies')}});
 return {...module.exports,calls};
}
test('Goodies action cards read real scoped orders, rejected products and messages without legacy RPCs',async()=>{
 const s=service({goodies_orders:{data:[{id:'order'}]},goodies_products:{data:[{id:'product'}]},conversations:{data:[{id:'thread'}]}});
 const rows=await s.businessActions(app);assert.ok(s.calls[0].filters.some(f=>f[0]==='eq'&&f[1]==='status'&&f[2]==='placed'));assert.deepEqual(Array.from(rows,r=>r.target),['goodiesOrders','goodiesProducts','messages']);assert.ok(s.calls.every(c=>c.filters.some(f=>f[0]==='eq'&&f[1]==='business_id'&&f[2]==='business')));
});
test('failed vendor reads reject instead of displaying an empty action list',async()=>{
 await assert.rejects(service({goodies_orders:{data:null,error:Error('private database failure')}}).businessActions(app));
});
test('activity uses existing notification fields, account/business scope and stable paired cursors',async()=>{
 const id='11111111-1111-4111-8111-111111111111',at='2026-11-01T10:00:00Z';
 const s=service({notifications:{data:[{id,title:'Actual payout',created_at:at,notification_type:'goodies_vendor_settlement_payout_completed'}]}});
 const rows=await s.businessActivity(app,30,at+'|'+id,'payout');assert.equal(rows[0].kind,'payout');assert.equal(rows[0].cursor,at+'|'+id);assert.equal(rows[0].amount,undefined);
 assert.ok(s.calls[0].filters.some(f=>f[0]==='eq'&&f[1]==='user_id'&&f[2]==='owner'));assert.ok(s.calls[0].filters.some(f=>f[0]==='contains'&&f[2].business_id==='business'));
 await assert.rejects(s.businessActivity(app,30,'invalid|private query'));
});
test('business search returns real Goodies destinations and escapes wildcard input',async()=>{
 const s=service({goodies_products:{data:[{id:'p',name:'Real product',review_status:'approved'}]},goodies_orders:{data:[{id:'o',order_code:'GOOD-1',status:'completed'}]}});
 const rows=await s.businessSearch(app,'50%_');assert.equal(rows[0].page,'goodiesProducts');assert.equal(rows[1].page,'goodiesOrders');assert.equal(s.calls[0].filters.find(f=>f[0]==='ilike')[2],'%50\\%\\_%');
});
test('workspace navigation accepts registered pages and rejects unknown or inherited notification destinations',()=>{
 const file='src/screens/businessSpace/BusinessSpaceScreen.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let registry,nav;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='PAGES')registry=node.initializer;if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='nav')nav=node.initializer;ts.forEachChild(node,visit);}visit(ast);
 assert.ok(registry&&nav);const pages=Object.fromEntries(registry.properties.map(p=>[p.name.text,()=>null]));let stack=[],panel='orders',sheet='profile';const alerts=[];
 const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports='+nav.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,PAGES:pages,sheet:{name:'profile'},lang:'fr',wantissLocale:v=>v,resolveGoodiesVendorLabel:()=> 'Indisponible',toast:v=>alerts.push(v),setStack:update=>{stack=update(stack);},setPanel:v=>{panel=v;},setSheet:v=>{sheet=v;}});
 for(const key of Object.keys(pages))module.exports.go(key,{focus:'synthetic'});
 assert.equal(stack.length,Object.keys(pages).length);assert.equal(panel,null);assert.equal(sheet,null);
 const before=stack.length;
 for(const key of ['missing-page','constructor','__proto__','',null,[]])module.exports.go(key);
 assert.equal(stack.length,before,'Unknown routes must not leave an invisible page on the navigation stack');
 assert.equal(alerts.length,6);assert.ok(alerts.every(text=>text==='Indisponible'));
});
test('vendor preferences use an atomic main-account RPC and reject stale account writes',async()=>{
 const s=service();await s.saveBusinessPreferences('owner',{push:false,email:false});assert.equal(s.calls[0].rpc,'goodies_set_vendor_notification_preferences');assert.equal(s.calls[0].args.p_push,false);
 const stale=service({},'other');await assert.rejects(stale.saveBusinessPreferences('owner',{push:true,email:true}));assert.equal(stale.calls.length,0);
});
test('data requests create real support tickets without promising a completed export or deletion',async()=>{
 const s=service();await s.requestBusinessData(app,'export');assert.equal(s.calls[0].table,'settings_support_requests');const row=s.calls[0].filters.find(f=>f[0]==='insert')[1];assert.equal(row.user_id,'owner');assert.match(row.subject,/export request/);assert.match(row.message,/business/);
 await assert.rejects(service({},'other').requestBusinessData(app,'delete'));
});
function metadataLoader(responses){
 const file='src/screens/businessSpace/BusinessSpaceScreen.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let callback;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='meta')callback=node.initializer.arguments[0];ts.forEachChild(node,visit);}visit(ast);assert.ok(callback);
 const accessed=[],supabase={from:table=>{accessed.push(table);if(['listings','payout_methods','payout_rules'].includes(table))throw Error('Legacy API reached');const proxy=new Proxy({then(resolve,reject){return Promise.resolve(responses[table]||{data:[],count:0,error:null}).then(resolve,reject);}}, {get(target,name){return name==='then'?target.then:()=>proxy;}});return proxy;}};
 const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports='+callback.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,supabase,biz:app.biz,user:{id:'owner'},FX:{FM:{goodies:{}}},DEFAULT_RULES:[],q:async request=>{const r=await request;if(r.error)throw r.error;return r.data;}});return {load:module.exports,accessed};
}
test('the actual Goodies workspace metadata avoids unavailable legacy listing/payout APIs and retains real counts',async()=>{
 const h=metadataLoader({business_features:{data:[{feature:'goodies',status:'active'}]},goodies_products:{count:4},notifications:{count:2},conversations:{data:[{unread_business:3}]}});
 const data=await h.load();assert.equal(data.listings,4);assert.equal(data.unreadN,2);assert.equal(data.unreadM,3);assert.equal(data.payout,null);assert.ok(!h.accessed.includes('payout_rules'));
});
test('the actual Goodies workspace rejects failed counts instead of presenting false zero badges',async()=>{
 const h=metadataLoader({business_features:{data:[{feature:'goodies'}]},goodies_products:{error:Error('private count failure')}});await assert.rejects(h.load());
});
test('vendor search/notification destinations load the selected product and order within the current business',async()=>{
 for(const kind of ['product','order']){
  const file=`src/screens/businessSpace/BusinessSpaceGoodies${kind==='order'?'Orders':''}.tsx`,ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let callback;
  function visit(node){if(kind==='product'&&ts.isPropertyAssignment(node)&&node.name.getText(ast)==='listProducts')callback=node.initializer;if(kind==='order'&&ts.isVariableDeclaration(node)&&node.name.getText(ast)==='orders'&&ts.isCallExpression(node.initializer))callback=node.initializer.arguments[0];ts.forEachChild(node,visit);}visit(ast);assert.ok(callback);
  const filters=[],query=new Proxy({then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}}, {get(target,name){return name==='then'?target.then:(...args)=>{filters.push([name,...args]);return query;};}}),module={exports:{}};
  vm.runInNewContext(ts.transpileModule('module.exports='+callback.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,supabase:{from:()=>query},q:async p=>(await p).data,app,focus:'selected',page:0});
  await (kind==='product'?module.exports('business',0,'selected'):module.exports());
  assert.ok(filters.some(f=>f[0]==='eq'&&f[1]==='business_id'&&f[2]==='business'));assert.ok(filters.some(f=>f[0]==='eq'&&f[1]==='id'&&f[2]==='selected'));
 }
});
