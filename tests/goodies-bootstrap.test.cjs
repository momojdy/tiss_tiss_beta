const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const file='src/features/Goodies/GoodiesApp.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true),declaration=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='GoodiesApp');
function render(route,error=false,options={}){let stateIndex=0;const S={accountId:'b',stack:[{r:route,u:1}],notifs:[],serverUnread:0,orders:[{id:'private-old-order'}],pf:{n:'private-old-account'},goodiesAccess:{status:'suspended',reason:'private-old-restriction'}};if(options.carousel&&options.hydrated)S.goodiesAccess={status:'active'};const tags=new Set();function find(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))tags.add(n.tagName.getText(ast));ts.forEachChild(n,find);}find(declaration);const module={exports:{}};
 const context={module,exports:module.exports,React,Date,Platform:{OS:'android'},S,TABS:['home','cats','orders','cart'],NOCB:['addresses','orders','payments','checkout','profile'],FOOTED:['checkout'],useGoodies(){},useEffect(){},useMemo:fn=>fn(),useRef:initial=>({current:initial}),useState:initial=>{const index=stateIndex++;return[index===0?options.sheet||null:index===2?!!options.loaded:index===5?error:index===7?!!options.hydrated:initial,()=>{}];},useTheme:()=>({bg:'#fff',mut:'#333'}),useSafeAreaInsets:()=>({top:0,bottom:0}),reset:r=>S.stack=[{r,u:1}],cur:()=>S.stack.at(-1),ui:{},label:(_id,text)=>text,tr:key=>key,PanResponder:{create:()=>({panHandlers:{}})},Animated:{Value:class{setValue(){}},View:'AnimatedView'},cnt:()=>1,totals:()=>({total:12345}),money:n=>'$'+n,A:{},...Object.fromEntries([...tags].filter(t=>!t.includes('.')).map(t=>[t,t]))};
 vm.runInNewContext(ts.transpileModule(declaration.getText(ast)+'\nmodule.exports=GoodiesApp;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,context);
 return module.exports({initialRoute:options.carousel?undefined:route});
}
const elements=(node,out=[])=>{if(Array.isArray(node))node.forEach(n=>elements(n,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;};
const text=node=>Array.isArray(node)?node.map(text).join(' '):node&&typeof node==='object'?text(node.props?.children):typeof node==='string'?node:'';
test('all private Goodies destinations wait for account hydration before rendering cached account screens',()=>{
 for(const route of ['addresses','orders','payments','profile','checkout']){const tree=render(route);assert.equal(tree.props.accessibilityRole,'progressbar',route);assert.ok(!elements(tree).some(e=>['Account','Orders','Checkout'].includes(e.type)),route);assert.doesNotMatch(text(tree),/private-old/);}
});
test('failed account hydration exposes retry without a previous account restriction, cart or private page',()=>{
 const tree=render('home',true),visible=text(tree);assert.match(visible,/Goodies could not load/);assert.doesNotMatch(visible,/private-old|Your cart|12345/);assert.ok(elements(tree).some(e=>e.type==='Cta'&&e.props.label==='Try again'));
});

test('a native sheet can render only for the account that opened it',()=>{
 for(const accountId of ['a','b']){const value={kind:'ctform',privatePhone:'synthetic-owned-phone'};const tree=render('addresses',false,{loaded:true,sheet:{accountId,value}}),sheet=elements(tree).find(e=>e.type==='Sheets');if(accountId==='a')assert.ok(!sheet?.props.sheet);else assert.equal(sheet.props.sheet,value);}
});


test('restricted customers cannot open new Goodies shopping routes but retain history and recovery',()=>{
 for(const route of ['home','cart','checkout','reviews','flashdeals','grouporder']){
  const tree=render(route,false,{loaded:true});
  assert.match(text(tree),/Goodies access temporarily suspended/,route);
 }
 for(const route of ['orders','track','help-pay','help','addresses']){
  const tree=render(route,false,{loaded:true});
  assert.doesNotMatch(text(tree),/Goodies access temporarily suspended/,route);
 }
});

test('carousel entry has no branded loading screen and does not expose an unhydrated account',()=>{
 const tree=render('home',false,{carousel:true});assert.notEqual(tree.props.accessibilityRole,'progressbar');assert.doesNotMatch(text(tree),/Getting everything ready|Loading Goodies|private-old/);assert.ok(!elements(tree).some(e=>e.type==='Home'));
});
test('carousel entry displays Home as soon as owned local state is restored while remote loading continues',()=>{
 const tree=render('home',false,{carousel:true,hydrated:true});assert.ok(elements(tree).some(e=>e.type==='Home'));assert.doesNotMatch(text(tree),/Getting everything ready|Loading Goodies/);
});
