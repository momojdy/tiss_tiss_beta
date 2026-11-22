const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const path=require('node:path');
function load(file){
 const full=path.resolve(__dirname,'..',file);
 const source=fs.readFileSync(full,'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',output)(name=>name.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(full),name+'.ts'))):require(name),module,module.exports);
 return module.exports;
}
const {parseCbm}=load('src/screens/Konsoliss/konsolissNumbers.ts');
const {parseKonsolissLoadProgress:progress}=load('src/screens/Konsoliss/konsolissLoadModel.ts');
const {parseKonsolissOccupancy:occupancy}=load('src/screens/Konsoliss/konsolissOccupancyModel.ts');
const {featureColor,aggregateColor,collectPages,createRequestGate}=load('src/shared/inbox/unread.ts');
const row={reserved_cbm:'0.3',sent_cbm:'0.3',loaded_cbm:'0.1',inbound_to_container_cbm:'0.2',allocated_cbm:'0.3',at_warehouse_or_in_transit_cbm:'0',reserved_not_sent_cbm:'0',not_allocated_cbm:'0',allocated_percent:'100'};
test('CBM rejects missing, coercions, negative, nonfinite and unsupported precision',()=>{
 for(const bad of [null,undefined,'',true,false,{},[],NaN,Infinity,-1,'NaN','Infinity',' 0','1e3',0.0001])assert.ok(Number.isNaN(parseCbm(bad)),String(bad));
 assert.equal(parseCbm('0.020'),0.02);assert.equal(parseCbm(0),0);
});
test('customer totals preserve fractional CBM and distinguish missing from zero',()=>{
 assert.ok(progress(row));assert.equal(progress(null),null);
 const zero=Object.fromEntries(Object.keys(row).map(key=>[key,'0']));
 assert.equal(progress(zero).loadedPercent,0);
 assert.equal(progress({...row,loaded_cbm:null}),null);
 assert.equal(progress({...row,allocated_cbm:null}),null);
 assert.equal(progress({...row,allocated_cbm:'0.2'}),null);
 assert.equal(progress({...row,inbound_to_container_cbm:'-1'}),null);
 assert.equal(progress({...row,reserved_cbm:'0.2'}),null);
});
test('verified occupancy arithmetic at tiny, zero, 76%, 99% and 100%',()=>{
 for(const loaded of [0.02,0,51.68,67.32,68]){
  const value={container_id:'a',container_type:'40HQ',capacity_cbm:68,loaded_cbm:loaded,your_loaded_cbm:Math.min(loaded,0.02),other_cargo_cbm:Math.max(0,loaded-0.02),free_cbm:68-loaded,your_allocated_cbm:null};
  const result=occupancy(value,'a');assert.ok(result);assert.ok(Math.abs(result.loadedCbm+result.freeCbm-68)<1e-9);
  assert.equal(occupancy(value,'b'),null);
  assert.equal(occupancy({...value,free_cbm:69},'a'),null);
  assert.equal(occupancy({...value,your_allocated_cbm:'NaN'},'a'),null);
 }
});
test('feature colors and deterministic mixed-origin policy',()=>{
 const expected={Goodies:'#FD802E',Gatherz:'#A36BE8',Flyz:'#4A67B0',Wallet:'#81C56C',Frenzies:'#B3DF4B',Konsoliss:'#DDB52B',Woulib:'#FEC509',Stayz:'#579BC7',Glowz:'#D49E2B'};
 for(const [name,color] of Object.entries(expected))assert.equal(featureColor(name),color);
 assert.equal(featureColor('unknown'),'#BD279F');
 assert.equal(aggregateColor([featureColor('Konsoliss')]),'#DDB52B');
 for(const colors of [['#DDB52B','#FD802E'],['#FD802E','#DDB52B'],[]])assert.equal(aggregateColor(colors),'#BD279F');
});
test('unread pagination reads beyond API limit, handles full final page and propagates failure',async()=>{
 const rows=Array.from({length:1000},(_,i)=>({id:String(i).padStart(4,'0')}));
 let calls=0;
 const found=await collectPages(async after=>{calls++;return {data:rows.filter(row=>after===null||row.id>after).slice(0,250),error:null};});
 assert.equal(found.length,1000);assert.equal(calls,5);
 await assert.rejects(collectPages(async()=>({data:null,error:new Error('offline')})),/offline/);
 await assert.rejects(collectPages(async()=>({data:[{id:'same'}],error:null}),1),/advance/);
});
test('new refresh, account switch and disposal invalidate pending responses',()=>{
 const gate=createRequestGate();const old=gate.begin();const latest=gate.begin();
 assert.equal(gate.current(old),false);assert.equal(gate.current(latest),true);
 gate.invalidate();assert.equal(gate.current(latest),false);
 const accountB=gate.begin();gate.invalidate();assert.equal(gate.current(accountB),false);
});

function hookHarness(file,method,args=[]){
 let state,refresh,invalidate;
 let authUser='A';
 let finishOld;
 const pending=new Promise(resolve=>{finishOld=resolve;});
 let first=true;
 const supabase={auth:{getUser:async()=>({data:{user:{id:authUser}},error:null})},from:table=>{
  let owner;
  const builder={select(){return this;},eq(key,value){if(key==='user_id')owner=value;return this;},order(){return this;},limit(){return this;},in(){return this;},
   maybeSingle(){return this.read();},single(){return this.read();},
   read(){if(first){first=false;return pending;}return Promise.resolve({data:table==='konsoliss_customer_load_breakdown'?row:table==='konsoliss_container_assignments'?{container_id:owner}: {container_number:'B-container',status:'filling'},error:null});},
   then(resolve,reject){if(first){first=false;return pending.then(resolve,reject);}return Promise.resolve({data:table==='konsoliss_container_assignments'?[{container_id:owner,assigned_at:'now'}]:[{id:'B',container_number:'B-container',status:'filling'}],error:null}).then(resolve,reject);}};
  return builder;
 },rpc:()=>first?(first=false,pending):Promise.resolve({data:{container_id:'container',container_type:'40HQ',capacity_cbm:68,loaded_cbm:0.02,your_loaded_cbm:0.02,other_cargo_cbm:0,free_cbm:67.98,your_allocated_cbm:0.02},error:null})};
 const source=fs.readFileSync(path.resolve(__dirname,'../src/screens/Konsoliss',file),'utf8');
 const module={exports:{}};
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',output)(name=>{
  if(name==='react')return {useState:initial=>{state=initial;return [initial,next=>{state=next;}];},useRef:value=>({current:value}),useCallback:fn=>fn};
  if(name.endsWith('/supabase'))return {supabase};
  if(name==='./useKonsolissRefresh')return {useKonsolissRefresh:(a,b)=>{refresh=a;invalidate=b;}};
  if(name==='./konsolissLoadModel')return {parseKonsolissLoadProgress:progress};
  if(name==='./konsolissOccupancyModel')return {parseKonsolissOccupancy:occupancy};
  throw new Error('Unexpected hook import '+name);
 },module,module.exports);
 module.exports[method](...args);
 return {refresh,invalidate,state:()=>state,setUser:user=>{authUser=user;},finishOld};
}
for(const [file,method,args] of [
 ['useCurrentKonsolissContainer.ts','useCurrentKonsolissContainer',[]],
 ['useKonsolissAssignedContainers.ts','useKonsolissAssignedContainers',[]],
 ['useKonsolissLoadProgress.ts','useKonsolissLoadProgress',[]],
 ['useKonsolissContainerOccupancy.ts','useKonsolissContainerOccupancy',['container']],
])test(method+' rejects pending responses after account invalidation and cleanup',async()=>{
 const hook=hookHarness(file,method,args);
 const old=hook.refresh();await Promise.resolve();await Promise.resolve();
 hook.setUser('B');hook.invalidate();await hook.refresh();
 const current=JSON.stringify(hook.state());
 hook.finishOld({data:file.includes('Assigned')?[{container_id:'A'}]:file.includes('LoadProgress')?{...row,reserved_cbm:999}:file.includes('Occupancy')?{container_id:'container',capacity_cbm:68,loaded_cbm:68}: {container_id:'A'},error:null});
 await old;assert.equal(JSON.stringify(hook.state()),current);
 hook.invalidate();const cleared=JSON.stringify(hook.state());
 assert.notEqual(cleared,current); // clearing removes the previous customer's visible result
});
