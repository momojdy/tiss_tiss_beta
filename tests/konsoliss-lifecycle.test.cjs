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
 assert.match(home,/containerHtml\(dark,isDemo\?false:isSelectedCurrent\?/);
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
 assert.match(home,/cx\.fillText\('My current load',labelX,labelY\)/);
 assert.match(home,/highlight\?'#FFE36B':c\.k/);
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
 assert.match(home,/const containerRatio=containerOccupancy\?containerOccupancy\.loadedCbm\/68:0/);
 assert.match(home,/!hasCurrentContainer&&currentContainer\.kind==='unassigned'\?'0%':'—'/);
 assert.match(home,/!hasCurrentContainer&&currentContainer\.kind==='unassigned'\?'68\.0':'—'/);
 assert.match(home,/strokeDasharray=\{\x60\$\{\(containerRatio\*87\.96\)/);
 assert.match(home,/\{containerPercent\} filled/);
 assert.match(home,/\{containerAvailable\} CBM/);
 assert.doesNotMatch(home,/\{fillPercent\} of your space/);
});
test('short empty-state hint appears only without a container or committed cargo',()=>{
 assert.match(home,/showEmptyLoadHint=!hasCurrentContainer&&currentContainer\.kind==='unassigned'/);
 assert.match(home,/progress\.loadedCbm===0&&progress\.inboundCbm===0/);
 assert.match(home,/\{showEmptyLoadHint\?<Tx/);
 assert.match(home,/No container assigned/);
 assert.doesNotMatch(home,/No goods loaded into a container yet/);
});
test('lower bar alternates every fifteen seconds only when container assigned',()=>{
 assert.match(home,/progressView,setProgressView/);
 assert.match(home,/const hasCurrentContainer=selectedContainer!==null/);
 assert.match(home,/if\(!hasCurrentContainer\)\{setProgressView\('customer'\);return;\}/);
 assert.match(home,/setInterval\(\(\)=>setProgressView\(view=>view==='customer'\?'container':'customer'\),15000\)/);
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
 assert.match(home,/containerHtml\(dark,isDemo\?false/);
 assert.match(home,/isDemo\?68:isSelectedCurrent\?/);
 assert.match(home,/selectedContainer\?\.id\?\?visualMode/);
 assert.match(home,/selectedContainer\?\.loadedCbm\?\?0/);
});
test('sample container does not overwrite actual current load or mutate Supabase',()=>{
 const demos=fs.readFileSync(path.join(root,'konsolissDemoContainers.ts'),'utf8');
 assert.doesNotMatch(demos,/supabase|insert\(|update\(|upsert\(/i);
 assert.match(home,/const committedValue=progress\?fmt\(progress\.allocatedCbm\)/);
 assert.match(home,/const containerOccupancy=selectedContainer\?\.demo\?/);
 assert.match(home,/useKonsolissContainerOccupancy\(isSelectedCurrent\)/);
 assert.match(home,/DEMO · /);
 assert.match(home,/DEMO=document\.documentElement\.dataset\.demo==='true'/);
 assert.match(home,/DEMO\?'Sample cargo ':'Your loaded '/);
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
 assert.deepEqual(items.map(row=>row.loadedCbm),[0,8.4,18.7,31.5,48.2,54.3,62.1,67.2]);
 for(const item of items){
   assert.equal(item.demo,true);
   assert.ok(item.id.startsWith('demo:'));
   assert.ok(item.loadedCbm>=0&&item.loadedCbm<=68);
   assert.ok(item.yourSpaceCbm>=0&&item.yourSpaceCbm<=item.loadedCbm);
   assert.ok(['filling','filled','departed','arrived'].includes(item.status));
 }
});
