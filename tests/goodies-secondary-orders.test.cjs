const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const file='src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true),component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='OrdersPanel');
const tags=new Set();function walk(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))tags.add(n.tagName.getText(ast));ts.forEachChild(n,walk);}walk(component);
const record={id:'synthetic-order',order_code:'G-1',status:'preparing',order_type:'pickup',payment_status:'paid',total:12,items:[{q:2,n:'Actual item'}]};
function elements(node,out=[]){if(Array.isArray(node))node.forEach(n=>elements(n,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;}
function harness({role='owner',filter='Open',response,rows=[record]}={}){
 let app={biz:{id:'business',role},userId:'owner',tick:0,bump(){events.push('reload');},toast:t=>events.push(t),go(){}};const events=[],calls=[],queries=[],states=[],refs=[];let stateIndex=0,refIndex=0,qIndex=0;const loaders=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});return response?response():{error:null};},from:table=>{const clauses=[];queries.push({table,clauses});const query=new Proxy({then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject);}}, {get(target,name){return name==='then'?target.then:(...args)=>{clauses.push([name,...args]);return query;};}});return query;}};
 const module={exports:{}};const context={React,module,exports:module.exports,Date,Number,Set,Object,...Object.fromEntries([...tags].map(t=>[t,t])),useApp:()=>app,useRef:v=>{const i=refIndex++;return refs[i]??=( {current:v});},useState:v=>{const i=stateIndex++;if(!(i in states))states[i]=i===0?filter:v;return[states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},useEffect(){},useQ:fn=>{const i=qIndex++;loaders[i]=fn;return{d:i?rows:[],l:false,e:null,reload(){}};},isGoodiesOnlyBusiness:()=>true,useGoodiesVendorLabels:()=>({text:v=>v,label:(_id,fallback)=>fallback,status:v=>v==='paid'?'Paid':'Unavailable',canManage:app.biz.role==='owner'||app.biz.role==='admin',requireManage:()=>app.biz.role==='owner'||app.biz.role==='admin'}),canManageGoodiesBusiness:b=>b.role==='owner'||b.role==='admin',supabase:client,q:async request=>{const r=await request;if(r.error)throw r.error;return r.data;},FX:{FM:{}},LIGHT:{line:'#eee',ink:'#000',mute:'#777'},money:v=>'$'+v};
 vm.runInNewContext(ts.transpileModule(component.getText(ast)+'\nmodule.exports=OrdersPanel;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,context);
 const render=()=>{stateIndex=refIndex=qIndex=0;return module.exports();};
 return{render,calls,events,loaders,queries,switchBusiness(){app={...app,biz:{id:'other-business',role:'owner'}};}};
}
test('secondary Goodies order actions block simultaneous taps and read-only staff',async()=>{
 let complete;const h=harness({response:()=>new Promise(resolve=>{complete=resolve;})}),button=elements(h.render()).find(n=>n.type==='Btn'&&n.props.label==='Mark ready');
 button.props.onPress();button.props.onPress();assert.equal(h.calls.length,1,'A same-tick second tap must not dispatch again');complete({error:null});await new Promise(r=>setImmediate(r));
 const readonly=harness({role:'staff'}),blocked=elements(readonly.render()).find(n=>n.type==='Btn'&&n.props.label==='Mark ready');assert.ok(blocked.props.disabled);await blocked.props.onPress();assert.equal(readonly.calls.length,0);
});
test('secondary order results cannot update a different selected business',async()=>{
 let complete;const h=harness({response:()=>new Promise(resolve=>{complete=resolve;})}),button=elements(h.render()).find(n=>n.type==='Btn'&&n.props.label==='Mark ready');
 button.props.onPress();h.switchBusiness();h.render();complete({error:null});await new Promise(r=>setImmediate(r));assert.deepEqual(h.events,[]);
});
test('secondary Goodies orders never render demo or raw unknown payment status',()=>{
 for(const payment_status of ['demo','private SQL failure']){const h=harness({rows:[{...record,payment_status}]}),tree=h.render(),text=JSON.stringify(tree);assert.ok(!text.includes('Demo payment'));assert.ok(!text.includes('private SQL failure'));assert.ok(text.includes('Unavailable'));}
});
test('secondary order filters run before pagination and retain declined and expired terminal orders',async()=>{
 for(const [filter,method,expected] of [['Open','not',['status','in','(completed,cancelled,declined,expired)']],['Closed','eq',['status','completed']],['Cancelled','in',['status',['cancelled','declined','expired']]]]){
  const h=harness({filter});h.render();await h.loaders[1]();const query=h.queries.find(q=>q.table==='goodies_orders');assert.ok(query);const predicate=query.clauses.find(row=>row[0]===method&&row[1]==='status');assert.deepEqual(JSON.parse(JSON.stringify(predicate)),[method,...expected]);
  assert.deepEqual(JSON.parse(JSON.stringify(query.clauses.at(-1))),['range',0,79]);
 }
});
