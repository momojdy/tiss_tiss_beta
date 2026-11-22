const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../src/features/Goodies');
// Public home-only CMS shape observed during the regression. No customer or financial records.
const observed=require('./fixtures/goodies-home-published-legacy.json');
function harness(){
 const state={S:{lang:'en',orders:[],rv:[],catalogLoading:false,catalogError:'',f:'all'},contentHooks:{}},cache=new Map();
 function load(filename){
  if(cache.has(filename))return cache.get(filename).exports;
  const module={exports:{}};cache.set(filename,module);
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const local=id=>{
   if(id==='@react-native-async-storage/async-storage')return {getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};
   if(id.endsWith('/store'))return state;
   if(id.endsWith('/wantissCms'))return {fetchPublishedWantissContent:async()=>({content:[{content_key:'goodies.content',payload:structuredClone(observed)}],assets:[]})};
   if(!id.startsWith('.'))return require(id);
   const target=path.resolve(path.dirname(filename),id),resolved=[target,target+'.ts',path.join(target,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
   assert.ok(resolved,'Missing '+target);return load(resolved);
  };
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(local,module,module.exports);return module.exports;
 }
 const content=load(path.join(root,'content.ts')),i18n=load(path.join(root,'i18n/index.ts'));
 content.applyContent(structuredClone(observed));
 return {state,content,i18n};
}
function renderHome(h,{loading=false,stores=[],eligible=true,error=''}={}){
 Object.assign(h.state.S,{catalogLoading:loading,catalogError:error});
 const source=fs.readFileSync(path.join(root,'screens/Browse.tsx'),'utf8'),ast=ts.createSourceFile('Browse.tsx',source,99,true);
 const names=['CachedContentImage','Mode','CategoryTile','promoGradient','PromoCard','Countdown','Home'];
 const declarations=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
 const calls=[],sheets=[];
 const React={createElement(type,props,...children){const p={...props,children};return typeof type==='function'?type(p):{type,props:p};}};
 const theme={soft:'#eee',mut:'#666',ink:'#111',m2bg:'#eee',m2fg:'#111',m3bg:'#eee',m3fg:'#111',br:'#63059F',line:'#ddd'};
 const context={React,exports:{},module:{exports:{}},useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{},useTheme:()=>theme,useSafeAreaInsets:()=>({top:0}),
  View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Image:'Image',T:'T',Icon:'Icon',Circ:'Circ',Grad:'Grad',Rail:'Rail',Sh:'Sh',Row:'Row',Chips:'Chips',Empty:'Empty',Dish:'Dish',VCard:'VCard',StoreCard:'StoreCard',
  ...h.content,S:h.state.S,ST:stores,STB:{},IT:{},FCH:[],addr:()=>({id:'synthetic-address',t:'Selected address'}),first:()=>eligible,filt:value=>value,
  tr:h.i18n.t,tx:h.i18n.tx,MODE1:['#63059F','#63059F'],PROMO:{plum:['#63059F','#63059F'],green:['#05503D','#05503D'],orange:['#EA6711','#EA6711']},
  go:(...args)=>calls.push(args),back:()=>{},tab:()=>{},setFilter:()=>{},refreshStoreDistances:async()=>{},refreshLiveSchedules:async()=>{},ui:{sheet:value=>sheets.push(value)}};
 const js=ts.transpileModule(declarations+'\nmodule.exports=Home;',{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,context);return {tree:context.module.exports({}),calls,sheets};
}
function nodes(tree){const out=[];function visit(value){if(Array.isArray(value))return value.forEach(visit);if(!value||typeof value!=='object')return;out.push(value);visit(value.props?.children);}visit(tree);return out;}
function text(tree){if(Array.isArray(tree))return tree.map(text).join(' ');if(typeof tree==='string'||typeof tree==='number')return String(tree);return tree?.props?text(tree.props.children):'';}
function button(tree,copy){return nodes(tree).find(n=>n.type==='Pressable'&&text(n).replace(/\s+/g,' ').includes(copy));}

test('published legacy home copy remains visible without promoting any translation review status',async()=>{
 const h=harness();await h.content.loadContent();
 const before=JSON.stringify(h.content.C);
 for(const locale of ['en','fr','ht','es','zh-Hans']){
  h.state.S.lang=locale;
  assert.deepEqual(h.content.modes().map(m=>m.title),['Food delivery','Groceries','Drugstore']);
  const promos=h.content.promoCards();assert.equal(promos[0].title,'Free delivery on your first order');assert.equal(promos[0].btn,'Order now');assert.equal(promos[2].title,'20% off fresh produce');
  assert.equal(h.content.categories().find(c=>c.id==='produce').name,'Fresh produce');
 }
 assert.equal(JSON.stringify(h.content.C),before);
 assert.equal(h.content.C.modes[0].title.en.s,'draft');
});
test('reviewed translations and manually published English home edits override the original copy',()=>{
 const h=harness(),payload=structuredClone(observed);
 payload.modes[0].title.en.v='Food from local kitchens';payload.promos[0].title.en.v='Your first delivery is free';payload.cats[1].name.en.v='Farm produce';
 payload.modes[0].title.fr={v:'Livraison de repas',s:'reviewed'};payload.promos[0].title.ht={v:'Synthetic unfinished translation',s:'draft'};
 h.content.applyContent(payload);h.state.S.lang='en';assert.equal(h.content.modes()[0].title,'Food from local kitchens');assert.equal(h.content.categories()[1].name,'Farm produce');
 h.state.S.lang='fr';assert.equal(h.content.modes()[0].title,'Livraison de repas');
 h.state.S.lang='ht';assert.equal(h.content.promoCards()[0].title,'Your first delivery is free');assert.equal(payload.promos[0].title.ht.s,'draft');
});
test('the home fallback does not publish draft policies, FAQ answers or critical checkout text',()=>{
 const h=harness(),draft={en:{v:'Unreviewed critical English',s:'draft'},ht:{v:'Unreviewed Creole',s:'draft'}};
 h.content.applyContent({...structuredClone(observed),labels:[{id:'lbl.checkoutPlaceOrder',t:draft}],faq:[{q:draft,a:draft}],legal:[{id:'legal.terms',st:'Live',t:draft}]});h.state.S.lang='ht';
 assert.equal(h.content.label('lbl.checkoutPlaceOrder','Place order'),'Place order');assert.deepEqual(h.content.faq([]),[]);assert.equal(h.content.legalDoc('legal.terms'),null);
});
test('home renders the original service tiles, promotion text and category routes',()=>{
 const h=harness(),r=renderHome(h);
 for(const [copy,category] of [['Food delivery','restaurants'],['Groceries','groceries'],['Drugstore','drugstore'],['Fresh produce','produce']]){
  const target=button(r.tree,copy);assert.ok(target,copy+' must remain visible');target.props.onPress();assert.deepEqual(Array.from(r.calls.at(-1)),['catlist',category]);
 }
 const promo=button(r.tree,'Free delivery on your first order');assert.ok(promo);promo.props.onPress();assert.equal(r.sheets.at(-1).custom.target,'category:restaurants');assert.equal(r.sheets.at(-1).custom.btn,'Order now');
 assert.ok(text(r.tree).includes('20% off fresh produce'));
});
test('home has no added no-store banner during loading or when stores are empty or out of range',()=>{
 for(const options of [{loading:true},{stores:[]},{stores:[{id:'synthetic-store',live:true,c:'groceries',it:[],distanceReady:true,far:true,rv:0}]}]){
  const h=harness(),r=renderHome(h,options);assert.ok(!text(r.tree).includes('No stores match right now'));assert.ok(button(r.tree,'Food delivery'));
 }
});
test('restored first-order copy retains the existing new-customer eligibility restriction',()=>{
 const h=harness();assert.ok(button(renderHome(h,{eligible:true}).tree,'Free delivery on your first order'));
 assert.equal(button(renderHome(h,{eligible:false}).tree,'Free delivery on your first order'),undefined);
});
