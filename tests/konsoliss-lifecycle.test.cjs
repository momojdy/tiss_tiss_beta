const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.join(__dirname,'../src/screens/Konsoliss');
const home=fs.readFileSync(path.join(root,'konsolissHomeScreen.tsx'),'utf8');
const messages=fs.readFileSync(path.join(root,'konsolissLifecycleMessages.ts'),'utf8');

test('consumer popup code parses as TSX and preserves the original interactive container',()=>{
 const parsed=ts.createSourceFile('konsolissHomeScreen.tsx',home,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(parsed.parseDiagnostics.length,0,parsed.parseDiagnostics.map(d=>d.messageText).join('; '));
 assert.match(home,/const CONTAINER_JS = \[/);
 assert.match(home,/<WebView/);
});
test('all four server-owned lifecycle stages have customer-facing explanations',()=>{
 const converted=ts.transpileModule(messages,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 require('node:vm').runInNewContext(converted,{exports});
 const copy=exports.KONSOLISS_LIFECYCLE_MESSAGES;
 assert.deepEqual(Object.keys(copy).sort(),['arrived','departed','filled','filling']);
 for (const [key,value] of Object.entries(copy)){
   assert.ok(value.title.length>4,key);
   assert.ok(value.description.length>60,key);
 }
 assert.match(copy.filled.description,/no more cargo/i);
 assert.match(copy.departed.description,/left its departure location/i);
 assert.match(copy.arrived.description,/packages may still/i);
});
test('explanatory popup is temporary, closes on request, and does not mutate container records',()=>{
 assert.match(home,/setTimeout\(\(\) => setLifecycleNotice\(null\), 7000\)/);
 assert.match(home,/previousContainerStage\.current === assignedStage/);
 assert.match(home,/currentContainer\.kind === 'assigned'/);
 assert.match(home,/onRequestClose=\{\(\) => setLifecycleNotice\(null\)\}/);
 assert.match(home,/accessibilityLabel=\{'Explain status of '\+item\.number\}/);
 assert.match(home,/KONSOLISS_LIFECYCLE_MESSAGES\[lifecycleNotice\]\.description/);
 assert.doesNotMatch(messages,/supabase|fetch\(|\.rpc\(/);
});

test('every entry into Konsoliss starts a fresh lifecycle notice without status mutation',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
 assert.match(app,/const \[konsolissVisitId, setKonsolissVisitId\] = useState\(0\)/);
 assert.match(app,/KonsolissHomeScreen key=\{konsolissVisitId\}/);
 assert.match(app,/onKonsolissPress=\{\(\) => \{ setKonsolissVisitId\(id => id \+ 1\); setBuyerScreen\('konsoliss'\); \}\}/);
 assert.match(home,/previousContainerStage\.current === assignedStage/);
});


test('3D container loops 4.8s cartons, 3.8s blinking carton, 5s empty',()=>{
 const hook=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(hook,/value\.kind === 'unassigned'\) return 'No active load'/);
 assert.doesNotMatch(home,/accessibilityLabel="Current load empty state"/);
 assert.doesNotMatch(home,/Loading illustration/);
 assert.doesNotMatch(home,/3D layout is illustrative/);
 assert.doesNotMatch(home,/Replay sample container loading animation/);
 assert.match(home,/const noCargoLoaded=!progress\|\|progress\.allocatedCbm===0/);
 assert.match(home,/containerHtml\(dark,!hasCurrentContainer&&noCargoLoaded,containerOccupancy\?\.capacityCbm\?\?0,containerOccupancy\?\.loadedCbm\?\?0/);
 assert.match(home,/const visible=EMPTY\?demoCount:RESERVED>0/);
 assert.match(home,/const cycle=\(Date\.now\(\)-started\)%13600/);
 assert.match(home,/demoCount=cycle<4800/);
 assert.match(home,/cycle\/4800/);
 assert.match(home,/cycle<8600\?cargo\.length:0/);
 assert.match(home,/demoShowLoad=cycle>=4800&&cycle<8600/);
 assert.match(home,/demoBlink=demoShowLoad&&Math\.floor\(\(cycle-4800\)\/500\)%2===0/);
 assert.match(home,/const timer=setInterval\(tick,100\)/);
 assert.match(home,/demoCurrent:i===6&&j===1&&l===nl-1&&q===0/);
 assert.match(home,/highlight=EMPTY&&demoBlink&&c\.demoCurrent/);
 assert.match(home,/if\(EMPTY&&demoShowLoad\)\{const carton=cargo\.find\(c=>c\.demoCurrent\)/);
 assert.match(home,/cx\.fillText\('My current loaded space',labelX,labelY\)/);
 assert.match(home,/highlight\?'#FFE36B':isYours\?'#A90E02':c\.k/);
 assert.doesNotMatch(home,/if\(EMPTY&&demoCount>0&&demoBlink\)\{abox/);
 assert.doesNotMatch(home,/EMPTY\?'Your current load'/);
 assert.match(home,/<WebView/);
 assert.match(home,/onTouchStart=\{\(\) => setScroll\(false\)\}/);
 assert.doesNotMatch(home,/cx\.fillText\('Your space 0\.50 CBM'/);
 assert.doesNotMatch(home,/cx\.fillText\('16\.3 CBM free'/);
});
test('My current load stays based on customer loaded plus inbound versus reserved',()=>{
 assert.match(home,/const committedValue=progress\?fmt\(progress\.allocatedCbm\)/);
 assert.match(home,/const fillRatio=progress&&progress\.reservedCbm>0\?progress\.allocatedCbm\/progress\.reservedCbm:0/);
 assert.match(home,/\{committedValue\}<Tx/);
 assert.match(home,/\/ \{reservedValue\} CBM/);
 assert.match(home,/const fillPercent=progress\?progress\.loadedPercent/);
 assert.match(home,/const stillToSendValue=progress\?fmt\(progress\.reservedNotSentCbm\)/);
 assert.match(home,/\{containerPercent\} filled/);
 assert.match(home,/\{containerAvailable\} CBM/);
 assert.doesNotMatch(home,/containerLoadDisplay/);
 assert.doesNotMatch(home,/containerFillDisplay/);
});
test('right-side circle and available CBM use the 68 CBM shared container, not reserved space',()=>{
 assert.match(home,/const containerRatio=containerOccupancy\?containerOccupancy\.loadedCbm\/containerOccupancy\.capacityCbm:0/);
 assert.match(home,/!hasCurrentContainer&&currentContainer\.kind==='unassigned'\?'0%':'—'/);
 assert.match(home,/!hasCurrentContainer&&currentContainer\.kind==='unassigned'\?'68\.0':'—'/);
 assert.match(home,/strokeDasharray=\{\x60\$\{\(containerRatio\*87\.96\)/);
 assert.match(home,/\{containerPercent\} filled/);
 assert.match(home,/\{containerAvailable\} CBM/);
 assert.doesNotMatch(home,/\{fillPercent\} of your space/);
});
test('short empty-state hint appears only without a container or committed cargo',()=>{
 assert.match(home,/showEmptyLoadHint=currentContainer\.kind==='unassigned'/);
 assert.match(home,/progress\.loadedCbm===0&&progress\.inboundCbm===0/);
 assert.match(home,/\{showEmptyLoadHint\?<Tx/);
 assert.match(home,/No container assigned/);
 assert.doesNotMatch(home,/No goods loaded into a container yet/);
});
test('lower bar alternates every seven seconds only when container selected',()=>{
 assert.match(home,/progressView,setProgressView/);
 assert.match(home,/const hasCurrentContainer=selectedContainer!==null/);
 assert.match(home,/if\(!hasCurrentContainer\)\{setProgressView\('customer'\);return;\}/);
 assert.match(home,/setTimeout\(\(\)=>setProgressView\(view=>view==='customer'\?'container':'customer'\),7000\)/);
 assert.match(home,/\[hasCurrentContainer,selectedContainer\?\.id,progressView\]/);
 assert.match(home,/progressView==='container'&&hasCurrentContainer/);
 assert.match(home,/Loaded <Tx/);
 assert.match(home,/Inbound <Tx/);
 assert.match(home,/Not allocated <Tx/);
 assert.match(home,/containerOccupancy\.otherCargoCbm\.toFixed\(1\)/);
 assert.match(home,/containerOccupancy\.yourSpaceCbm\.toFixed\(1\)/);
 assert.match(home,/containerOccupancy\.freeCbm\.toFixed\(1\)/);
 assert.doesNotMatch(home,/Your loading progress/);
 assert.doesNotMatch(home,/Container progress · 68 CBM/);
 assert.doesNotMatch(home,/Shared container · 68 CBM total capacity/);
 for(const label of ['Space reserved','Goods sent','Loaded in container','Inbound to container','Sent — not yet allocated']){
   assert.doesNotMatch(home,new RegExp("\\['"+label+"'"));
 }
});
test('load progress math does not treat cargo sent as loaded or inbound',()=>{
 const source=fs.readFileSync(path.join(root,'useKonsolissLoadProgress.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 require('node:vm').runInNewContext(js,{module,exports:module.exports,require:()=>({})});
 const parse=module.exports.parseKonsolissLoadProgress;
 const base={reserved_cbm:2,sent_cbm:1,inbound_to_container_cbm:0,loaded_cbm:0.4};
 const result=parse(base);
 assert.equal(result.reservedCbm,2);
 assert.equal(result.sentCbm,1);
 assert.equal(result.loadedCbm,0.4);
 assert.equal(result.inboundCbm,0);
 assert.equal(result.allocatedCbm,0.4);
 assert.equal(result.atWarehouseOrInTransitCbm,0.6);
 assert.equal(result.loadedPercent,20);
 const inbound=parse({...base,inbound_to_container_cbm:0.2});
 assert.ok(Math.abs(inbound.allocatedCbm-0.6)<0.00001);
 assert.equal(inbound.loadedPercent,30);
 assert.equal(parse({...base,inbound_to_container_cbm:0.8}),null);
 assert.equal(parse({...base,loaded_cbm:1.1}),null);
 // 68 CBM is a per-container limit; a customer's total reservation can span several 40HQ containers.
 const multi=parse({reserved_cbm:100,sent_cbm:72,inbound_to_container_cbm:12,loaded_cbm:60});
 assert.ok(multi);
 assert.equal(multi.reservedCbm,100);
 assert.equal(multi.allocatedCbm,72);
 assert.equal(multi.loadedPercent,72);
});

test('3D WebView script remains syntactically valid after animation changes',()=>{
 const parsed=ts.createSourceFile('konsolissHomeScreen.tsx',home,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const decl=parsed.statements.flatMap(stmt=>ts.isVariableStatement(stmt)?Array.from(stmt.declarationList.declarations):[])
   .find(row=>row.name.getText(parsed)==='CONTAINER_JS');
 assert.ok(decl,'Missing 3D engine');
 const call=decl.initializer;
 assert.ok(call&&ts.isCallExpression(call));
 const array=call.expression.expression;
 assert.ok(array&&ts.isArrayLiteralExpression(array));
 const js=array.elements.map(element=>element.text).join('\n');
 assert.doesNotThrow(()=>new (require('node:vm').Script)(js));
 assert.match(js,/demoCount/);
 assert.match(js,/LOADED\/RESERVED/);
 const ast=ts.createSourceFile('container-engine.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0,'Embedded WebView code must parse');
 const draw=ast.statements.find(stmt=>ts.isFunctionDeclaration(stmt)&&stmt.name?.text==='draw');
 assert.ok(draw&&draw.body,'3D draw function must exist');
 assert.match(draw.body.getText(ast),/cx\.fillText\(FREE\.toFixed\(1\)\+' CBM free'/,
   'Free CBM must be drawn inside draw(), not at top-level before fit()');
 assert.doesNotMatch(js.slice(draw.end),/cx\.fillText\(FREE\.toFixed\(1\)\+' CBM free'/);
});

test('rear 3D corner hardware is depth-sorted behind loaded boxes at every rotation',()=>{
 const parsed=ts.createSourceFile('konsolissHomeScreen.tsx',home,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const decl=parsed.statements.flatMap(stmt=>ts.isVariableStatement(stmt)?Array.from(stmt.declarationList.declarations):[])
   .find(row=>row.name.getText(parsed)==='CONTAINER_JS');
 assert.ok(decl);
 const engine=decl.initializer.expression.expression.elements.map(element=>element.text).join('\n');
 assert.match(engine,/layer=far\?\.65:1\.6/);
 assert.match(engine,/const cb=\[xs-\.17,xs\+\.17/);
 assert.match(engine,/if\(xs<0\)abox\(layer,cb/);
 assert.match(engine,/else abox\(layer,cb/);
 assert.match(engine,/it\.sort\(\(a,b\)=>a\.l-b\.l\|\|a\.d-b\.d\)/);
 assert.doesNotThrow(()=>new (require('node:vm').Script)(engine));
});


test('container dropdown selects live or demo entries, five visible rows and scroll for eight samples',()=>{
 const demos=fs.readFileSync(path.join(root,'konsolissDemoContainers.ts'),'utf8');
 const hook=fs.readFileSync(path.join(root,'useKonsolissAssignedContainers.ts'),'utf8');
 assert.match(demos,/KS-DEMO-01/);
 assert.match(demos,/KS-DEMO-08/);
 assert.match(demos,/sample\.map/);
 assert.match(demos,/demo:true/);
 assert.match(hook,/konsoliss_container_assignments/);
 assert.match(hook,/\.eq\('user_id',auth\.user\.id\)/);
 assert.match(hook,/\.from\('konsoliss_containers'\)/);
 assert.match(home,/accessibilityLabel="Choose container"/);
 assert.match(home,/onPress=\{\(\) => setContainerMenuOpen\(true\)\}/);
 assert.match(home,/visible=\{containerMenuOpen\}/);
 assert.match(home,/onRequestClose=\{\(\) => setContainerMenuOpen\(false\)\}/);
 assert.match(home,/maxHeight:5\*59/);
 assert.match(home,/nestedScrollEnabled showsVerticalScrollIndicator/);
 assert.match(home,/KONSOLISS_DEMO_CONTAINERS\.map\(item=>/);
 assert.match(home,/liveContainers\.map\(item=>/);
 assert.match(home,/setSelectedContainerId\(item\.id\)/);
 assert.match(home,/setSelectedContainerId\('live'\)/);
 assert.match(home,/DEMO PREVIEW · NOT LIVE DATA/);
 assert.match(home,/containerHtml\(dark,!hasCurrentContainer&&noCargoLoaded/);
 assert.match(home,/containerOccupancy\?\.capacityCbm\?\?0/);
 assert.match(home,/selectedContainer\?\.id\?\?visualMode/);
 assert.match(home,/containerOccupancy\?\.loadedCbm\?\?0/);
});
test('sample container does not overwrite actual current load or mutate Supabase',()=>{
 const demos=fs.readFileSync(path.join(root,'konsolissDemoContainers.ts'),'utf8');
 assert.doesNotMatch(demos,/supabase|insert\(|update\(|upsert\(/i);
 assert.match(home,/const committedValue=progress\?fmt\(progress\.allocatedCbm\)/);
 assert.match(home,/const containerOccupancy=selectedContainer\?\.demo\?/);
 assert.match(home,/useKonsolissContainerOccupancy\(!isDemo&&selectedContainer\?\.id/);
 assert.match(home,/DEMO · /);
 assert.match(home,/DEMO=document\.documentElement\.dataset\.demo==='true'/);
 assert.doesNotMatch(home,/Sample cargo/);
 assert.match(home,/YOUR_LOADED=Number\(document\.documentElement\.dataset\.yourLoaded\)/);
 assert.match(home,/cx\.fillText\('My current loaded space '\+YOUR_LOADED\.toFixed\(2\)/);
 assert.match(home,/cx\.fillText\(FREE\.toFixed\(1\)\+' CBM free',f\[0\],f\[1\]\)/);
 assert.match(home,/const f=proj\(\[freeRatio>0\?\(freeX0\+innerX1\)\/2:innerX1-\.12,1\.3,0\]\)/);
 assert.match(home,/cx\.font='700 10px -apple-system,Arial,sans-serif'/);
 assert.match(home,/cx\.strokeStyle=C\.halo;cx\.strokeText\(FREE\.toFixed\(1\)\+' CBM free'/);
 assert.match(home,/cx\.fillStyle=C\.fl;cx\.fillText\(FREE\.toFixed\(1\)\+' CBM free'/);
 assert.match(home,/yourPhysicallyLoadedCbm\?\?0,containerOccupancy\?\.freeCbm/);
});


test('eight distinct demo containers stay within the real 68 CBM physical capacity',()=>{
 const file=fs.readFileSync(path.join(root,'konsolissDemoContainers.ts'),'utf8');
 const js=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 require('node:vm').runInNewContext(js,{module,exports:module.exports});
 const items=module.exports.KONSOLISS_DEMO_CONTAINERS;
 assert.equal(items.length,8);
 assert.equal(new Set(items.map(row=>row.id)).size,8);
 assert.equal(new Set(items.map(row=>row.loadedCbm)).size,8);
 assert.deepEqual(Array.from(items,row=>row.loadedCbm),[0,8.4,18.7,31.5,48.2,54.3,62.1,67.2]);
 for(const item of items){
   assert.equal(item.demo,true);
   assert.ok(item.id.startsWith('demo:'));
   assert.ok(item.loadedCbm>=0&&item.loadedCbm<=68);
   assert.ok(item.yourSpaceCbm>=0&&item.yourSpaceCbm<=68);
   assert.ok(item.yourLoadedCbm>=0&&item.yourLoadedCbm<=item.yourSpaceCbm);
   assert.ok(item.yourLoadedCbm<=item.loadedCbm);
   assert.ok(['filling','filled','departed','arrived'].includes(item.status));
 }
});


test('3D loaded cargo and lower My space use physically loaded CBM, not reserved allocation',()=>{
 const file=fs.readFileSync(path.join(root,'konsolissDemoContainers.ts'),'utf8');
 const converted=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 require('node:vm').runInNewContext(converted,{module,exports:module.exports});
 const rows=module.exports.KONSOLISS_DEMO_CONTAINERS;
 assert.equal(rows.length,8);
 assert.equal(rows[1].yourSpaceCbm,2);
 assert.equal(rows[1].yourLoadedCbm,0.6);
 assert.equal(rows[4].loadedCbm,48.2);
 assert.equal(rows[4].yourSpaceCbm,4);
 assert.equal(rows[4].yourLoadedCbm,2);
 assert.match(home,/otherCargoCbm:Math\.max\(0,\(selectedContainer\.loadedCbm\?\?0\)-\(selectedContainer\.yourLoadedCbm\?\?0\)\)/);
 assert.doesNotMatch(home,/yourAllocatedContainerCbm/);
 assert.match(home,/yourSpaceCbm:selectedContainer\.yourLoadedCbm\?\?0/);
 assert.match(home,/yourPhysicallyLoadedCbm=isDemo\?selectedContainer\?\.yourLoadedCbm:verifiedOccupancy\?\.yourSpaceCbm/);
 assert.match(home,/accessibilityLabel="Show other progress bar"/);
 assert.doesNotMatch(home,/Switch ↻/);
 assert.match(home,/M3 5h23/);
});


test('manual arrows restart full seven-second dwell instead of preserving an old interval countdown',()=>{
 assert.match(home,/onPress=\{\(\)=>setProgressView\(view=>view==='customer'\?'container':'customer'\)\}/);
 assert.match(home,/const timeout=setTimeout\(\(\)=>setProgressView\(view=>view==='customer'\?'container':'customer'\),7000\)/);
 assert.match(home,/return\(\)=>clearTimeout\(timeout\)/);
 assert.match(home,/\[hasCurrentContainer,selectedContainer\?\.id,progressView\]/);
 assert.doesNotMatch(home,/setInterval\(\(\)=>setProgressView/);
});


test('two-way progress icon sits in the progress row, not a separate row above it',()=>{
 const start=home.indexOf("<View style={{paddingHorizontal:24,marginTop:12}}>");
 const end=home.indexOf("<View style={{paddingHorizontal: 24, paddingTop: 22",start);
 assert.ok(start>=0&&end>start);
 const layout=home.slice(start,end);
 assert.equal((layout.match(/accessibilityLabel="Show other progress bar"/g)||[]).length,2,
   'both possible bars must provide the same inline icon');
 assert.match(layout,/flex:1,height:10,borderRadius:5/);
 assert.match(layout,/flex:1,flexDirection:'row',height:10/);
 assert.doesNotMatch(layout,/justifyContent:'flex-end',marginBottom:hasCurrentContainer/);
});


test('verified 40HQ backend is the source of truth for selected container 3D volume',()=>{
 const hook=fs.readFileSync(path.join(root,'useKonsolissContainerOccupancy.ts'),'utf8');
 const current=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(hook,/supabase\.rpc\('konsoliss_container_occupancy',\{p_container_id:containerId\}\)/);
 assert.match(hook,/row\.container_type==='40HQ'&&capacityCbm===68/);
 assert.match(hook,/Math\.abs\(loadedCbm\+freeCbm-capacityCbm\)<0\.001/);
 assert.match(hook,/Math\.abs\(otherCargoCbm\+yourSpaceCbm-loadedCbm\)<0\.001/);
 assert.match(hook,/return state\?\.id===containerId\?state\.value:null/);
 assert.match(home,/containerOccupancy\?containerOccupancy\.loadedCbm\/containerOccupancy\.capacityCbm:0/);
 assert.match(home,/containerOccupancy\.otherCargoCbm\/containerOccupancy\.capacityCbm\*100/);
 assert.match(home,/containerOccupancy\.yourSpaceCbm\/containerOccupancy\.capacityCbm\*100/);
 assert.match(home,/containerHtml\(dark,!hasCurrentContainer&&noCargoLoaded,containerOccupancy\?\.capacityCbm\?\?0,containerOccupancy\?\.loadedCbm\?\?0/);
 assert.match(home,/yourPhysicallyLoadedCbm\?\?0,containerOccupancy\?\.freeCbm/);
 assert.match(current,/\.order\('assigned_at',\{ascending:false\}\)/);
 assert.match(current,/\.limit\(1\)/);
});


test('physical 40HQ 3D boxes highlight only the verified customer fraction of loaded cargo',()=>{
 const parsed=ts.createSourceFile('home.tsx',home,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const decl=parsed.statements.flatMap(stmt=>ts.isVariableStatement(stmt)?Array.from(stmt.declarationList.declarations):[])
   .find(d=>d.name.getText(parsed)==='CONTAINER_JS');
 const engine=decl.initializer.expression.expression.elements.map(element=>element.text).join('\n');
 assert.match(engine,/RESERVED>0\?Math\.ceil\(cargo\.length\*Math\.min\(1,LOADED\/RESERVED\)\)/);
 assert.match(engine,/boxCount=cargo\.slice\(0,visible\)\.filter\(c=>!c\.pal\)\.length/);
 assert.match(engine,/Math\.round\(boxCount\*YOUR_LOADED\/LOADED\)/);
 assert.match(engine,/isYours=!EMPTY&&boxIndex>=boxCount-ownCount/);
 assert.match(engine,/isYours\?'#A90E02'/);
 assert.match(engine,/freeRatio=!EMPTY&&RESERVED>0&&Number\.isFinite\(FREE\)\?Math\.max\(0,Math\.min\(1,FREE\/RESERVED\)\):0/);
 assert.match(engine,/innerX0=-HX\+\.12,innerX1=HX-\.12,freeX0=innerX1-\(innerX1-innerX0\)\*freeRatio/);
 assert.match(engine,/if\(freeRatio>0\)\{const fz=\[freeX0,innerX1,\.15,H-\.15,-HZ\+\.12,HZ-\.12\]/);
 assert.match(engine,/abox\(2,fz,'#FFF1A0',C\.fv\)/);
 assert.match(engine,/line\(2\.5,a,b,C\.ac,\.55,\.9,\[3,2\.5\]\)/);
 assert.doesNotMatch(engine,/const fz=\[CE\+\.05,HX-\.05/);
 // The visual marker is decorative; the verified cargo ratio remains source-owned.
 assert.match(engine,/Math\.round\(boxCount\*YOUR_LOADED\/LOADED\)/);
 assert.doesNotThrow(()=>new (require('node:vm').Script)(engine));
});


test('40HQ free-space overlay spans the free fraction of the entire interior, never a fixed corner',()=>{
 const interiorLength=12-0.24;
 const dims=[0,8.4,31.5,51.7,67.2,68].map(loaded=>{
   const free=68-loaded;
   const ratio=free/68;
   const start=6-0.12-interiorLength*ratio;
   return {loaded,free,ratio,width:(6-0.12)-start};
 });
 for(const x of dims){
   assert.ok(Math.abs(x.width/interiorLength-x.free/68)<1e-10);
   assert.ok(x.width>=0&&x.width<=interiorLength);
 }
 assert.ok(dims[0].width>dims[1].width);
 assert.ok(dims[1].width>dims[2].width);
 assert.ok(dims[2].width>dims[3].width);
 assert.ok(dims[3].width>dims[4].width);
 assert.equal(dims[5].width,0);
 assert.match(home,/if\(freeRatio>0\)/);
 assert.match(home,/freeX0=innerX1-\(innerX1-innerX0\)\*freeRatio/);
 assert.match(home,/const f=proj\(\[freeRatio>0\?\(freeX0\+innerX1\)\/2/);
});
