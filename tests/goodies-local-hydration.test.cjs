const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const file='src/features/Goodies/store.ts',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true),load=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='load').getText(ast);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({pauseCache=false}={}){
 let finishCatalog,finishCache;const catalog=new Promise(resolve=>{finishCatalog=resolve;}),cache=new Promise(resolve=>{finishCache=resolve;});
 const S={accountId:null,pf:{n:'',ph:''},addr:[],gc:[],cc:'w',as:0,cart:{sid:null,lines:[]},orders:[]},events=[],module={exports:{}};
 const context={module,exports:module.exports,S,WKEY:'profile',KEY:'cart',IT:{},STB:{},placeholderStore:()=>({}),
  supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'current-account'}}}}),getUser:async()=>({data:{user:null}})}},
  switchGoodiesAccount:id=>{S.accountId=id;},ownedCache:(raw,id)=>raw?.ownerId===id?raw.data:null,
  WDEF:()=>({pf:{n:'',ph:''},addr:[],gc:[],cc:'w',as:0}),GDEF:()=>({cart:{sid:null,lines:[]},orders:[]}),
  AsyncStorage:{getItem:async key=>{if(key==='profile')return JSON.stringify({ownerId:'current-account',data:{pf:{n:'Owned profile',ph:'2025550100'}}});if(key==='cart')return pauseCache?cache:JSON.stringify({ownerId:'current-account',data:{cart:{sid:'owned-store',lines:[]}}});return null;}},
  recoverShoppingSnapshots:()=>events.push('owned-snapshots'),refreshLiveSchedules:()=>{events.push('remote-catalog');return catalog;},refreshGoodiesAccess:async()=>{},refreshUserAddresses:async()=>{},refreshGoodiesContactNumbers:async()=>{},
  wantissLocale:value=>value,zoneOf:()=>0,defAddr:()=>null,applyZone:()=>{},emit:()=>{}};
 vm.runInNewContext(compile(load+'\nmodule.exports=load;'),context);
 return {S,events,load:module.exports,finishCatalog,finishCache};
}
test('owned local state becomes available before remote profile/catalog loading finishes',async()=>{
 const h=harness();let hydrated=false,finished=false;
 const pending=h.load(()=>{hydrated=true;assert.equal(h.S.accountId,'current-account');assert.equal(h.S.pf.n,'Owned profile');assert.equal(h.S.cart.sid,'owned-store');assert.ok(h.events.includes('owned-snapshots'));}).then(()=>{finished=true;});
 await tick();assert.equal(hydrated,true);assert.equal(finished,false);assert.equal(h.S.catalogLoading,true);
 h.finishCatalog();await pending;assert.equal(finished,true);
});
test('an account change during cache restoration cannot expose old cache or reset the new wallet',async()=>{
 const h=harness({pauseCache:true});let hydrated=false;const pending=h.load(()=>{hydrated=true;});await tick();
 h.S.accountId='different-account';h.S.wallet=42;h.finishCache(JSON.stringify({ownerId:'current-account',data:{cart:{sid:'private-old-store',lines:[]}}}));await pending;
 assert.equal(hydrated,false);assert.notEqual(h.S.cart.sid,'private-old-store');assert.equal(h.S.wallet,42);assert.ok(!h.events.includes('remote-catalog'));
});
test('finishing background refresh does not reset a carousel user back to Home after navigation',async()=>{
 const source=fs.readFileSync('src/features/Goodies/GoodiesApp.tsx','utf8'),app=ts.createSourceFile('GoodiesApp.tsx',source,99,true,ts.ScriptKind.TSX);let effect;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(app)==='useEffect'&&n.arguments[0]?.getText(app).includes('const contentReady = loadContent()'))effect=n.arguments[0].getText(app);ts.forEachChild(n,visit);}visit(app);assert.ok(effect);
 let finish;const remote=new Promise(resolve=>{finish=resolve;}),S={stack:[],orders:[]},resets=[],module={exports:{}};
 const context={module,S,embedded:true,catalogueEntry:false,initialRoute:undefined,Date,
  load:async ready=>{ready();await remote;},loadContent:async()=>{},loadBuilders:async()=>{},startGoodiesSync:()=>()=>{},
  reset:route=>{S.stack=[{r:route}];resets.push(route);},setGoodiesLoaded:()=>{},setStartupError:()=>{},setAccountHydrated:()=>{},
  AppState:{addEventListener:()=>({remove(){}})},setInterval:()=>1,clearInterval:()=>{}};
 vm.runInNewContext(compile('module.exports='+effect),context);module.exports();S.stack=[{r:'catlist',p:'groceries'}];finish();await tick();
 assert.equal(S.stack[0].r,'catlist');assert.equal(resets.length,1);
});
