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
const {parseKonsolissLoadProgress:progress,parseKonsolissHomeSnapshot:parseSnapshot,liveHomeStatus}=load('src/screens/Konsoliss/konsolissLoadModel.ts');
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
 for(const unknown of ['unknown','constructor','__proto__'])assert.equal(featureColor(unknown),'#BD279F');
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

function hookHarness(file,method,args=[],options={}){
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
   then(resolve,reject){if(first){first=false;return pending.then(resolve,reject);}return Promise.resolve({data:table==='konsoliss_container_assignments'?[{container_id:owner,assigned_at:'now'}]:options.missing?[]:[{id:'B',container_number:'B-container',status:'filling'}],error:null}).then(resolve,reject);}};
  return builder;
 },rpc:(name)=>first?(first=false,pending):name==='konsoliss_homepage_snapshot'?Promise.resolve({data:{kind:'recorded',progress:row,status_code:null,warehouse_cbm:.3,transit_cbm:0,containers:[{id:'container',number:'B-container',status:'filling',occupancy:{container_id:'container',container_type:'40HQ',capacity_cbm:68,loaded_cbm:.1,your_loaded_cbm:.1,other_cargo_cbm:0,free_cbm:67.9,your_allocated_cbm:.3}}]},error:null}):Promise.resolve({data:{container_id:'container',container_type:'40HQ',capacity_cbm:68,loaded_cbm:0.02,your_loaded_cbm:0.02,other_cargo_cbm:0,free_cbm:67.98,your_allocated_cbm:0.02},error:null})};
 const source=fs.readFileSync(path.resolve(__dirname,'../src/screens/Konsoliss',file),'utf8');
 const module={exports:{}};
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',output)(name=>{
  if(name==='react')return {useState:initial=>{state=initial;return [initial,next=>{state=next;}];},useRef:value=>({current:value}),useCallback:fn=>fn};
  if(name.endsWith('/supabase'))return {supabase};
  if(name==='./useKonsolissRefresh')return {useKonsolissRefresh:(a,b)=>{refresh=a;invalidate=b;}};
  if(name==='./konsolissLoadModel')return {parseKonsolissLoadProgress:progress,parseKonsolissHomeSnapshot:parseSnapshot};
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

test('a visible assignment with inaccessible container details is unavailable, never confirmed empty',async()=>{
 const hook=hookHarness('useKonsolissAssignedContainers.ts','useKonsolissAssignedContainers',[],{missing:true});const result=hook.refresh();await Promise.resolve();await Promise.resolve();hook.finishOld({data:[{container_id:'assigned'}],error:null});await result;assert.equal(hook.state(),'unavailable');
});

test('atomic homepage projection rejects conflicting snapshots and preserves complete source data',()=>{
 const base={kind:'recorded',progress:row,status_code:null,warehouse_cbm:.3,transit_cbm:0,tracking_due_at:null,containers:[{id:'c',number:'KS-VERIFIED',status:'filling',occupancy:{container_id:'c',container_type:'40HQ',capacity_cbm:68,loaded_cbm:51.7,your_loaded_cbm:.1,other_cargo_cbm:51.6,free_cbm:16.3,your_allocated_cbm:.3}}]};
 const snapshot=parseSnapshot(base);assert.equal(snapshot.kind,'recorded');assert.equal(snapshot.snapshot.containers[0].occupancy.freeCbm,16.3);
 for(const bad of [{...base,warehouse_cbm:0},{...base,transit_cbm:1},{...base,status_code:'unknown'},{...base,status_code:'label_created'},{...base,tracking_due_at:'bad'},{...base,containers:[]},{...base,containers:[...base.containers,...base.containers]},{...base,containers:[{...base.containers[0],occupancy:{...base.containers[0].occupancy,your_allocated_cbm:.2}}]}])assert.equal(parseSnapshot(bad).kind,'unavailable');
 assert.equal(parseSnapshot({...base,containers:[{...base.containers[0],occupancy:null}]}).kind,'recorded');
 assert.equal(parseSnapshot({kind:'unrecorded',containers:[]}).kind,'unrecorded');
 assert.equal(parseSnapshot({kind:'unrecorded',containers:base.containers}).kind,'unavailable');
 const unsent={...base,progress:{reserved_cbm:1,sent_cbm:0,loaded_cbm:0,inbound_to_container_cbm:0,allocated_cbm:0,at_warehouse_or_in_transit_cbm:0,reserved_not_sent_cbm:1,not_allocated_cbm:1,allocated_percent:0},warehouse_cbm:0,containers:[],status_code:'label_created',tracking_due_at:'2026-12-20T00:00:00Z'};
 const label=parseSnapshot(unsent);assert.equal(label.kind,'recorded');assert.equal(label.progress.sentCbm,0);assert.equal(liveHomeStatus(label.snapshot,{}),'Label created');
 assert.equal(label.trackingDueAt,'2026-12-20T00:00:00Z');
});

test('all 68,001 physical occupancy values at 0.001 CBM precision display strictly increasing accurate percentages',()=>{
 const {formatContainerFillPercent:format,parseKonsolissOccupancy:parse}=load("src/screens/Konsoliss/konsolissOccupancyModel.ts");
 let previous=-1;
 for(let milli=0;milli<=68000;milli++){
  const loaded=milli/1000,free=(68000-milli)/1000,own=Math.min(milli,20)/1000,other=(milli-Math.min(milli,20))/1000;
  const value=parse({container_id:'verified',container_type:'40HQ',capacity_cbm:68,loaded_cbm:loaded,your_loaded_cbm:own,other_cargo_cbm:other,free_cbm:free,your_allocated_cbm:own},'verified');
  assert.ok(value,'valid '+milli);const label=format(value.loadedCbm,value.capacityCbm),percent=Number(label.slice(0,-1));
  const expected=Number((BigInt(milli)*100000n+34000n)/68000n)/1000;
  assert.equal(percent,expected,'percent '+milli);assert.ok(percent>previous,'strict monotonic '+milli);
  assert.equal(percent===0,milli===0);assert.equal(percent===100,milli===68000);
  assert.ok(Math.abs(percent-loaded/68*100)<=.000500001);
  assert.equal(Math.round((value.loadedCbm+value.freeCbm)*1000),68000);
  previous=percent;
 }
 for(const [loaded,label] of [[0,'0%'],[.001,'0.001%'],[.02,'0.029%'],[34,'50%'],[51.7,'76.029%'],[67.32,'99%'],[67.9,'99.853%'],[67.999,'99.999%'],[68,'100%']])assert.equal(format(loaded,68),label);
 for(const value of [-.001,68.001,NaN,Infinity,.0001])assert.equal(format(value,68),'—');
 assert.equal(format(34,67),'—');
});

test('exact progress bar partitions at all 68,001 container totals and diverse ownership splits',()=>{
 const {containerBarWidths:bar}=load("src/screens/Konsoliss/konsolissLoadModel.ts");
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' != '+b);
 for(let n=0;n<=68000;n++){
  for(const own of new Set([0,Math.min(20,n),Math.floor(n/2),n])){
   const value={containerType:'40HQ',capacityCbm:68,loadedCbm:n/1000,otherCargoCbm:(n-own)/1000,yourSpaceCbm:own/1000,yourAllocatedCbm:own/1000,freeCbm:(68000-n)/1000};
   for(const split of [false,true]){
    const w=bar(value,split);assert.ok(w);
    near(w.first,(split?n:n-own)/68000*100);near(w.second,split?0:own/68000*100);near(w.remaining,(68000-n)/68000*100);near(w.first+w.second+w.remaining,100);
    assert.equal(w.remaining===0,n===68000);assert.equal(w.first+w.second===0,n===0);
   }
  }
 }
 assert.equal(bar(null,false),null);
 assert.equal(bar({capacityCbm:67},false),null);
 assert.equal(bar({capacityCbm:68,loadedCbm:2,otherCargoCbm:1,yourSpaceCbm:0,freeCbm:66},false),null);
});
test('customer partitions preserve every allocation combination for purchases up to .100 CBM, plus large and split boundaries',()=>{
 const {customerBarWidths:bar}=load("src/screens/Konsoliss/konsolissLoadModel.ts");
 let count=0;
 const verify=(p,l,i)=>{const w=bar({reservedCbm:p/1000,loadedCbm:l/1000,inboundCbm:i/1000});assert.ok(w);for(const [x,y] of [[w.first,l/p*100],[w.second,i/p*100],[w.remaining,(p-l-i)/p*100],[w.first+w.second+w.remaining,100]])assert.ok(Math.abs(x-y)<1e-10);assert.equal(w.remaining===0,l+i===p);count++;};
 for(let p=20;p<=100;p++)for(let l=0;l<=p;l++)for(let i=0;i<=p-l;i++)verify(p,l,i);
 for(const p of [101,500,1000,2000,68000,136000,9999999999])for(const l of [0,1,Math.floor(p/2),p-1,p])for(const i of new Set([0,Math.floor((p-l)/2),p-l]))verify(p,l,i);
 assert.ok(count>170000);
 for(const bad of [null,{reservedCbm:0,loadedCbm:0,inboundCbm:0},{reservedCbm:1,loadedCbm:.8,inboundCbm:.201},{reservedCbm:1,loadedCbm:-.001,inboundCbm:0},{reservedCbm:1,loadedCbm:NaN,inboundCbm:0}])assert.equal(bar(bad),null);
 console.log('Customer allocation combinations checked: '+count);
});
