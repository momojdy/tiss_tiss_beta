const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const file='src/features/Goodies/screens/Shop.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true,ts.ScriptKind.TSX);
const checkout=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='Checkout').getText(ast);
const footer=ast.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).find(n=>n.name.getText(ast)==='CheckoutFoot').initializer.getText(ast);
const actionFile='src/features/Goodies/actions.ts',actionAst=ts.createSourceFile(actionFile,fs.readFileSync(actionFile,'utf8'),99,true);
const next=actionAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='checkoutNext').getText(actionAst);
const scheduling={exports:{}};vm.runInNewContext(compile(fs.readFileSync('src/features/Goodies/scheduling.ts','utf8')),{module:scheduling,exports:scheduling.exports,Date});
function harness({step=1,open=false,scheduled=0,admitted=true}={}){
 const S={cs:step,sch:scheduled,pay:'wallet',paymentOptionsStatus:'ready',hasWallet:true,wallet:0,cards:[],cart:{sid:'store'},tip:0},store={id:'store',live:true,open,acceptScheduledOrders:true,eta:20},messages=[],routes=[];
 const tags=new Set();function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))tags.add(n.tagName.getText(ast));ts.forEachChild(n,visit);}visit(ast);
 const module={exports:{}},context={module,exports:module.exports,S,STB:{store},React:{createElement:(type,props,...children)=>({type,props:{...props,children}})},Date,
  ...Object.fromEntries([...tags].filter(t=>!t.includes('.')).map(t=>[t,t])),
  useTheme:()=>({br:'orange',line:'#ddd',mut:'#666'}),useState:value=>[value,()=>{}],useEffect:()=>{},
  totals:()=>({st:store,stops:['store'],total:7.5}),isPk:()=>true,addr:()=>null,ctOf:()=>({ph:'2025550100'}),
  cartStoreIds:()=>['store'],canScheduleGoodiesStore:()=>admitted,deliveryQuoteReady:()=>true,deliveryAddressKey:()=>'',
  fees:()=>({pay:{Wallet:true,Card:true,Cash:true},tips:[],firstFree:false}),money:amount=>'$'+Number(amount).toFixed(2),
  label:(_id,text)=>text,GOODIES_SHARED_PAYMENTS_RELEASED:false,fmtStoreDay:()=> 'Tomorrow',fmtStoreTime:()=> '10:00',hasAlcohol:()=>false,
  back:()=>{},go:route=>routes.push(route),setSch:value=>{S.sch=value;},phoneOK:()=>true,toast:message=>messages.push(message),emit:()=>{},...scheduling.exports};
 vm.runInNewContext(compile(checkout+'\n'+next+'\nmodule.exports={render:Checkout,footer:'+footer+',next:checkoutNext};'),context);
 return {S,store,messages,routes,...module.exports};
}
function nodes(node){if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object')return[];return[node,...nodes(node.props?.children)];}
function text(node){if(Array.isArray(node))return node.map(text).join(' ');if(typeof node==='string')return node;return node?.props?text(node.props.children):'';}
test('closed-store checkout opens the automatic picker without an extra Schedule selector or card',()=>{
 const tree=harness().render(),all=nodes(tree);
 assert.ok(all.some(n=>n.type==='ScheduleInline'&&n.props.autoApply));
 assert.ok(!all.some(n=>n.type==='Radio'));assert.doesNotMatch(text(tree),/Schedule|Scheduled-order minimum/);
});
test('open stores keep ASAP and expose Schedule as a simple row instead of another card',()=>{
 const tree=harness({open:true}).render(),all=nodes(tree);
 assert.equal(all.filter(n=>n.type==='Radio').length,1);
 const schedule=all.find(n=>n.type==='Pressable'&&text(n).trim()==='Schedule');assert.ok(schedule);
 assert.equal(schedule.props.style.borderWidth,undefined);assert.equal(schedule.props.style.backgroundColor,undefined);
});
test('Wallet checkout removes the redundant debit sentence and retains the useful insufficient-balance action',()=>{
 const tree=harness({step:2}).render();assert.doesNotMatch(text(tree),/payments debit your available balance/);
 assert.match(text(tree),/Insufficient wallet balance/);
 assert.ok(nodes(tree).some(n=>n.type==='Pressable'&&text(n)==='Open Wallet'));
});
test('Continue requires a real valid slot for closed stores and retains immediate ordering for open stores',()=>{
 assert.equal(harness().footer().props.disabled,true);
 assert.equal(harness({open:true}).footer().props.disabled,false);
 const later=Date.now()+3600_000;
 assert.equal(harness({scheduled:later}).footer().props.disabled,false);
 assert.equal(harness({scheduled:later,admitted:false}).footer().props.disabled,true);
 assert.equal(harness({scheduled:Date.now()+5*60_000}).footer().props.disabled,true);
});
test('the actual Continue handler rechecks minimum lead time and every merchant before advancing',()=>{
 const later=Date.now()+3600_000;
 for(const options of [{},{scheduled:later,admitted:false},{scheduled:Date.now()+5*60_000}]){
  const h=harness(options);h.next();assert.equal(h.S.cs,1);assert.equal(h.messages.length,1);assert.doesNotMatch(h.messages[0],/tap Apply/);
 }
 for(const options of [{scheduled:later},{open:true}]){const h=harness(options);h.next();assert.equal(h.S.cs,2);assert.equal(h.messages.length,0);}
});
