const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
function compile(text,context={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,{module,exports:module.exports,...context});return module.exports;}
const locales=compile(fs.readFileSync('src/lib/locales.ts','utf8'));
function service(client){return compile(fs.readFileSync('src/services/goodiesSettlement.ts','utf8'),{require:id=>id.includes('locales')?locales:{supabase:client}});}
const base=()=>({business_id:'business',currency:'USD',wallet_ready:true,cash_paused:false,settlement_due_at:null,available:9,pending:0,reserved:0,paid_out:0,recovery_due:0,commission_due:0,commission_credit:0,cash_sales_htg:0,cash_sales_limit_htg:5000,hold_hours:24,settlement_days:7});
test('financial summaries reject malformed amounts rather than inventing zero balances',()=>{
 const s=service({});for(const value of [null,undefined,'',true,false,NaN,Infinity,-1,{},'private sql'])assert.throws(()=>s.parseSettlementSummary({...base(),available:value}));assert.equal(s.parseSettlementSummary({...base(),available:'0'}).available,0);assert.throws(()=>s.parseSettlementSummary({...base(),wallet_ready:undefined}));
});
test('transport and backend errors never expose server details; actionable codes use owned messages',async()=>{
 for(const response of [{data:null,error:{message:'secret SQLSTATE private.finance'}},{data:null,error:{code:'P4001',message:'private wallet table'}},new Error('upstream private token')]){
  const s=service({rpc:async()=>{if(response instanceof Error)throw response;return response;}});await assert.rejects(s.getGoodiesSettlement('business'),error=>!error.message.includes('private')&&!error.message.includes('secret')&&error.code===(response.error?.code||'unavailable'));
 }
});
test('summary responses are bound to the requested business and empty successful protocols fail closed',async()=>{
 await assert.rejects(service({rpc:async()=>({data:{...base(),business_id:'other'}})}).getGoodiesSettlement('business'));await assert.rejects(service({rpc:async()=>({data:null})}).registerGoodiesDestination('business','moncash','HT','Owner',{account:'37000000'}));
});
test('Goodies-only businesses use the scoped dashboard while unrelated and mixed feature dashboards keep their existing API',async()=>{
 const calls=[],s=service({rpc:async(name,args)=>{calls.push({name,args});return{data:{...base(),scope:'goodies',revenue:10}};}});
 const app={biz:{id:'business',goodies_store_id:'store'},meta:{feats:[{feature:'goodies'}]},range:{from:'2026-11-01',to:'2026-11-07'}};await s.getBusinessFinancialSummary(app);assert.equal(calls[0].name,'goodies_vendor_dashboard_range');
 await s.getBusinessFinancialSummary({...app,meta:{feats:[{feature:'goodies'},{feature:'other'}]}});assert.equal(calls[1].name,'dashboard_range');
});
test('currency quotes match positive PostgreSQL decimal rounding and reject unsupported precision',()=>{
 const {quoteGoodiesReceive:q}=service({});assert.equal(q('1.00','1.00500000'),1.01);assert.equal(q('0.01','0.50000000'),0.01);assert.equal(q('2000.00','130.50000000'),261000);assert.equal(q('3.00','133.33000000'),399.99);for(const [amount,rate] of [['1.001','1'],['-1','1'],['1','NaN'],['1','-1'],['900719925474099.12','1']])assert.ok(Number.isNaN(q(amount,rate)));
});
test('commission and payout requests retain their idempotency keys and send explicit server quote expectations',async()=>{
 const calls=[],s=service({rpc:async(name,args)=>{calls.push({name,args});return{data:{id:'payout',status:'requested'}};}});await s.requestGoodiesPayout('business',1,'moncash','destination','same-key',130);await s.requestGoodiesPayout('business',1,'moncash','destination','same-key',130);assert.equal(calls[0].args.p_key,calls[1].args.p_key);assert.equal(calls[0].args.p_expected_receive,130);assert.equal(calls[0].args.p_business,'business');
});
test('Goodies vendor language uses the main account locale codes and never writes another signed-in account',async()=>{
 const writes=[];const s=service({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:table=>({upsert:async record=>{writes.push({table,record});return{};}})});
 await s.saveGoodiesVendorLanguage('owner','Kreyòl Ayisyen');assert.equal(writes[0].table,'user_settings');assert.equal(writes[0].record.language,'ht');await assert.rejects(s.saveGoodiesVendorLanguage('other','Français'));assert.equal(writes.length,1);
});
function extract(name,context){const file='src/screens/businessSpace/BusinessSpaceGoodiesSettlement.tsx',source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);const node=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node);const tags=new Set();function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))tags.add(n.tagName.getText(source));ts.forEachChild(n,visit);}visit(node);return compile(node.getText(source)+'\nmodule.exports='+name+';',{React,...Object.fromEntries([...tags].map(tag=>[tag,tag])),...context});}
function elements(node,out=[]){if(Array.isArray(node))node.forEach(n=>elements(n,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;}
const label=(_key,fallback)=>fallback;
function requestView(summaryResult,request){let stateIndex=0,qIndex=0,closed=0;const data=[summaryResult,{d:{channels:[{method:'wal',enabled:true}],destinations:[],rates:[],cash_enabled:true},l:false,e:null}];
 const view=extract('GoodiesPayoutRequestSheet',{useApp:()=>({biz:{id:'business',role:'owner'},tick:0,toast(){},bump(){},closeSheet(){closed++;}}),useS:()=>({mut:{}}),useTheme:()=>({badFg:'#f00'}),useMounted:()=>({current:true}),useSettlementLabels:()=>({label,money:v=>'$'+v}),useQ:()=>data[qIndex++],useState:v=>[stateIndex++===2?'9':v,()=>{}],useRef:v=>({current:v}),useEffect(){},uuid:()=> 'same-payout-key',names:()=>({wal:'Wantiss Wallet'}),timing:()=> 'Instant',quoteGoodiesReceive:service({}).quoteGoodiesReceive,requestGoodiesPayout:request,failureText:()=> 'Safe failure'});return{tree:view(),closed:()=>closed};}
test('the actual payout form shows unavailable/retry instead of spendable zero on a failed summary',()=>{
 const h=requestView({d:null,l:false,e:'private server error'},()=>{throw Error('must not pay');});const nodes=elements(h.tree);assert.ok(nodes.some(n=>n.type==='ErrBox'&&n.props.retry));assert.ok(!nodes.some(n=>n.type==='Field'));assert.ok(!JSON.stringify(h.tree).includes('private server error'));
});
test('the actual payout form locks repeated taps until the first request resolves',async()=>{
 let calls=0,resolve;const pending=new Promise(r=>resolve=r),h=requestView({d:base(),l:false,e:null},async()=>{calls++;return pending;});const confirm=elements(h.tree).find(n=>n.type==='Btn'&&n.props.label==='Confirm payout');assert.ok(confirm&&!confirm.props.disabled);confirm.props.onPress();confirm.props.onPress();assert.equal(calls,1);resolve({id:'payout',status:'completed'});await new Promise(r=>setImmediate(r));assert.equal(h.closed(),1);
});
test('new vendor copy uses its selected locale and never serves unfinished Creole',()=>{
 const resolveText=compile(fs.readFileSync('src/features/Goodies/i18n/resolveText.ts','utf8')).resolveGoodiesText;
 for(const [language,expected] of [['Français','Français vérifié'],['Kreyòl Ayisyen','Reviewed English']]){
  const hook=extract('useSettlementLabels',{useApp:()=>({lang:language}),useState:v=>[v,()=>{}],useEffect(){},wantissLocale:locales.wantissLocale,resolveGoodiesText:resolveText,C:{labels:[{id:'test',t:{en:{v:'Reviewed English',s:'reviewed'},fr:{v:'Français vérifié',s:'reviewed'},ht:{v:'Unreviewed Creole',s:'draft'}}}]}});assert.equal(hook().label('test','fallback'),expected);
 }
});

test('the actual Goodies balance panel never presents a failed summary as zero earnings',()=>{
 let q=0;const results=[{d:null,l:false,e:'private database error'},{d:[],l:false,e:null}];
 const panel=extract('GoodiesPayoutsPanel',{useApp:()=>({biz:{id:'business',role:'owner',verification:'verified'},userId:'owner',tick:0,sheet(){}}),useS:()=>({mut:{},rt:{},card:{}}),useTheme:()=>({ink:'#000'}),useMounted:()=>({current:true}),useSettlementLabels:()=>({label,money:v=>'$'+v,locale:'en'}),useQ:()=>results[q++],useState:v=>[v,()=>{}],useRef:v=>({current:v}),uuid:()=> 'key'});
 const nodes=elements(panel());assert.ok(nodes.some(n=>n.type==='Text'&&n.props.children==='Unavailable'));assert.ok(!nodes.some(n=>n.type==='Text'&&n.props.children==='$0'));assert.ok(nodes.find(n=>n.type==='Btn'&&n.props.label==='Request payout').props.disabled);
});

test('own-driver countdown never fabricates a wait when server eligibility is immediate and fails closed on unknown scope',()=>{
 const file='src/screens/businessSpace/BusinessSpaceGoodiesOrders.tsx',source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let expression;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='ownDriverWaitLeft')expression=node.initializer;ts.forEachChild(node,visit);}visit(source);assert.ok(expression);
 const make=(dispatchWaits,now)=>compile('module.exports='+expression.getText(source)+';',{dispatchWaits,now,app:{biz:{id:'business'}}});
 assert.equal(make({d:{businessId:'business',waits:{order:0},receivedAt:2000}},1000)({id:'order'}),0);
 assert.equal(make({d:{businessId:'other',waits:{order:0},receivedAt:2000}},1000)({id:'order'}),null);
 assert.equal(make({e:'unavailable',d:null},1000)({id:'order'}),null);
});
