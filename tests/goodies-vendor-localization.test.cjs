const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const copy=require('../src/features/Goodies/i18n/vendorCopy.json');
const labelsPath='src/screens/businessSpace/BusinessSpaceGoodiesLabels.ts';
const vendorPath='src/screens/businessSpace/BusinessSpaceGoodies.tsx';
const ordersPath='src/screens/businessSpace/BusinessSpaceGoodiesOrders.tsx';
function compileModule(file,dependencies={}){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{assert.ok(id in dependencies,'Missing dependency '+id);return dependencies[id];},Intl});return module.exports;
}
function labelsHarness(role='owner'){
 const app={lang:'English',biz:{id:'business',role},toasts:[],toast(value){this.toasts.push(value);}},listeners=new Set();let effects=[],renders=0,first=true,loads=0;
 const content={C:null,loadContent:async()=>{loads++;},onContent:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
 const resolve=compileModule('src/features/Goodies/i18n/resolveText.ts');
 const locales=compileModule('src/lib/locales.ts');
 const api=compileModule(labelsPath,{'react':{useState:()=>[0,()=>{renders++;}],useEffect:fn=>{if(first)effects.push(fn());}},'../../features/Goodies/content':content,'../../features/Goodies/i18n/resolveText':resolve,'../../lib/locales':locales,'./BusinessSpaceShared':{useApp:()=>app},'../../features/Goodies/i18n/vendorCopy.json':copy});
 const render=(page='products')=>{const result=api.useGoodiesVendorLabels(page);first=false;return result;};
 return{api,app,content,render,get renders(){return renders;},get loads(){return loads;},publish(){for(const listener of listeners)listener();},unmount(){effects.forEach(stop=>stop?.());effects=[];}};
}
function expression(file,owner,name){
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let found;
 function walk(node,current){if(ts.isFunctionDeclaration(node)&&node.name)current=node.name.text;if(current===owner&&ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)found=node.initializer;ts.forEachChild(node,child=>walk(child,current));}walk(ast);assert.ok(found,owner+'.'+name);return found.getText(ast);
}
function compileExpression(code,context){const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports='+code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{module,exports:module.exports,React,...context});return module.exports;}
const placeholders=value=>[...value.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort();
test('every dedicated vendor copy field has the four approved locales and unchanged dynamic placeholders',()=>{
 const ids=new Set();for(const row of copy){assert.ok(!ids.has(row.id));ids.add(row.id);assert.match(row.id,/^lbl\.vendor\./);assert.equal(row.t.ht,undefined);
  for(const locale of ['en','fr','es','zh-Hans']){assert.ok(row.t[locale]?.v?.trim(),row.id+': '+locale);assert.equal(row.t[locale].s,'reviewed');assert.equal(row.t[locale].human_reviewed,false);assert.deepEqual(placeholders(row.t[locale].v),placeholders(row.t.en.v),row.id+': '+locale);}
 }
});
test('the actual vendor hook follows all five configured language switches and English fallback for unfinished Creole',()=>{
 const h=labelsHarness(),row=copy.find(row=>row.page==='products'&&row.t.en.v==='Products');assert.ok(row);
 for(const [value,locale]of [['English','en'],['Français','fr'],['Español','es'],['简体中文','zh-Hans'],['Kreyòl Ayisyen','ht']]){
  h.app.lang=value;const labels=h.render();assert.equal(labels.locale,locale);assert.equal(labels.label(row.id,'fallback'),row.t[locale==='ht'?'en':locale].v);
 }
 assert.equal(h.loads,1);h.unmount();
});
test('published CMS overrides rerender the vendor hook and never expose an unreviewed translation',()=>{
 const h=labelsHarness(),row=copy[0];h.app.lang='Français';h.render();h.content.C={labels:[{id:row.id,t:{en:{v:'Published heading',s:'reviewed'},fr:{v:'Brouillon secret',s:'draft'}}}]};h.publish();assert.equal(h.renders,1);assert.equal(h.render().label(row.id,'fallback'),'Published heading');
 h.content.C.labels[0].t.fr={v:'Titre publié',s:'reviewed'};h.publish();assert.equal(h.render().label(row.id,'fallback'),'Titre publié');
 h.unmount();h.publish();assert.equal(h.renders,2);
});
test('translated segment labels preserve canonical builder and backend values',()=>{
 const h=labelsHarness();h.app.lang='Français';const labels=h.render('builders'),updates=[];
 const segment=h.api.vendorSegmentProps(['Pick one','Pick several'],'Pick one',value=>updates.push(value),labels.text);
 assert.notEqual(segment.items[1].l,'Pick several');assert.equal(segment.value,'Pick one');segment.onChange(segment.items[1].k);assert.deepEqual(updates,['Pick several']);segment.onChange('not an option');assert.deepEqual(updates,['Pick several']);
});
test('identical edited captions cannot change the canonical option selected',()=>{
 const h=labelsHarness(),updates=[],segment=h.api.vendorSegmentProps(['first','second'],'first',value=>updates.push(value),()=> 'Same edited caption');
 assert.equal(segment.items[0].l,segment.items[1].l);assert.notEqual(segment.items[0].k,segment.items[1].k);
 segment.onChange(segment.items[1].k);assert.deepEqual(updates,['second']);
});
test('money follows the selected locale and unknown payment statuses do not expose server enums',()=>{
 const h=labelsHarness();h.app.lang='Français';let labels=h.render('orders');assert.equal(labels.money(1234.5),new Intl.NumberFormat('fr',{style:'currency',currency:'USD'}).format(1234.5));assert.notEqual(labels.status('refund_manual_review'),'refund_manual_review');assert.doesNotMatch(labels.status('private_queue_invalid'),/private|queue|invalid/);
 h.app.lang='简体中文';labels=h.render();assert.equal(labels.money(12),new Intl.NumberFormat('zh-Hans',{style:'currency',currency:'USD'}).format(12));
});
test('staff and unknown roles are read-only while owners and administrators retain the server membership role',()=>{
 const h=labelsHarness('staff');assert.equal(h.render().canManage,false);assert.equal(h.render().requireManage(),false);assert.equal(h.app.toasts.length,1);
 for(const role of ['owner','admin']){h.app.biz.role=role;assert.equal(h.render().requireManage(),true);}
 h.app.biz.verification='restricted';assert.equal(h.render().canManage,true);
 h.app.biz.role='viewer';assert.equal(h.render().requireManage(),false);
});
test('actual product availability and product-save handlers do not dispatch writes for read-only staff',async()=>{
 const h=labelsHarness('staff'),labels=h.render(),calls=[];
 const toggle=compileExpression(expression(vendorPath,'GoodiesProductsPage','toggle'),{...labels,availabilityLock:{current:false},setAvailabilityBusy(){},app:h.app,goodiesApi:{saveProduct:async()=>calls.push('toggle')},lst:{reload:async()=>{}},errText:()=> 'safe'});
 await toggle({id:'product',reviewStatus:'approved'},true);await toggle({id:'product',reviewStatus:'approved'},true);assert.deepEqual(calls,[]);
 const save=compileExpression(expression(vendorPath,'ProductSheet','save'),{...labels,operationLock:{current:false},check:()=>'',app:h.app,setBusy(){},goodiesApi:{saveProduct:async()=>calls.push('save')}});await save();assert.deepEqual(calls,[]);
 h.app.biz.role='owner';const owner=h.render();const allowed=compileExpression(expression(vendorPath,'GoodiesProductsPage','toggle'),{...owner,availabilityLock:{current:false},setAvailabilityBusy(){},app:h.app,goodiesApi:{saveProduct:async(biz,record)=>calls.push({biz,record})},lst:{reload:async()=>{}},errText:()=> 'safe'});await allowed({id:'vendor-product',reviewStatus:'approved'},false);assert.equal(calls[0].biz,'business');assert.equal(calls[0].record.id,'vendor-product');assert.equal(calls[0].record.available,false);
});
test('actual order status and cash-setting handlers cannot dispatch mutations for staff',async()=>{
 const h=labelsHarness('staff'),labels=h.render('orders'),calls=[];
 const ctx={...labels,app:h.app,busyId:'',setBusyId(){},goodiesOrdersRequest:async()=>{calls.push('status');return{};}};
 const act=compileExpression(expression(ordersPath,'GoodiesOrdersPage','act'),ctx);await act({id:'order'},'accept');await act({id:'order'},'cancel');
 const cash=compileExpression(expression(ordersPath,'GoodiesOrdersPage','toggleCash'),{...ctx,storeId:'store',cashBusy:false,setCashBusy(){},setGoodiesCashAcceptance:async()=>calls.push('cash')});await cash();assert.deepEqual(calls,[]);
});
test('actual store validation messages resolve through the same four-locale dictionary',()=>{
 const h=labelsHarness();h.app.lang='Español';const labels=h.render('store');assert.notEqual(labels.text('Enter a store name'),'Enter a store name');assert.notEqual(labels.text('Enter a product name (up to 120 characters)'),'Enter a product name (up to 120 characters)');
 const row=copy.find(row=>row.t.en.v==='Enter at least 10 characters ({count}/10).');assert.ok(row);assert.ok(labels.label(row.id,row.t.en.v,{count:4}).includes('4/10'));assert.equal(labels.text('Vendor-owned product name'),'Vendor-owned product name');
});

test('opening a read-only order list cannot trigger the automatic refund mutation',async()=>{
 const ast=ts.createSourceFile(ordersPath,fs.readFileSync(ordersPath,'utf8'),99,true);let callback;
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0].getText(ast).includes('refundAttempts.current.add'))callback=node.arguments[0];ts.forEachChild(node,visit);}visit(ast);assert.ok(callback);
 for(const canManage of [false,true]){
  const calls=[],orders={d:[{id:'cancelled-order',status:'cancelled',payment_method:'card',payment_status:'paid'}],reload(){}};
  const run=compileExpression(callback.getText(ast),{canManage,orders,refundAttempts:{current:new Set()},supabase:{functions:{invoke:async(name,args)=>{calls.push({name,args});return{};}}}});
  run();await Promise.resolve();assert.equal(calls.length,canManage?1:0);
  if(canManage){assert.equal(calls[0].name,'refund-goodies-card-order');assert.equal(calls[0].args.body.order_id,'cancelled-order');}
 }
});
test('disabled vendor option groups block interaction without replacing their children',()=>{
 const file='src/screens/businessSpace/BusinessSpaceGoodiesFeedback.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true),node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='GoodiesVendorControl');assert.ok(node);
 const Control=compileExpression(node.getText(ast).replace(/^export\s+/,''),{View:'View'}),child=React.createElement('ExampleOption');
 for(const disabled of [true,false]){const result=Control({disabled,children:child});assert.equal(result.props.pointerEvents,disabled?'none':'auto');assert.equal(result.props.accessibilityState.disabled,disabled);assert.equal(result.props.children,child);}
});
test('all direct vendor labels are bundled and retain complete locale placeholders',()=>{
 for(const file of [vendorPath,ordersPath]){
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);
  function visit(node){
   if(ts.isCallExpression(node)&&node.expression.getText(ast)==='label'&&ts.isStringLiteral(node.arguments[0])&&ts.isStringLiteral(node.arguments[1])){const [id,fallback]=node.arguments,row=copy.find(row=>row.id===id.text);assert.ok(row,file+': '+id.text);assert.equal(row.t.en.v,fallback.text,id.text);}
   ts.forEachChild(node,visit);
  }visit(ast);
 }
});
