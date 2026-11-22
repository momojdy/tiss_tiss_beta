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
 assert.match(home,/Show current container status explanation/);
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


test('3D container stays interactive and plays a clearly labeled illustrative package-loading sequence',()=>{
 const hook=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(hook,/value\.kind === 'unassigned'\) return 'No active load'/);
 assert.doesNotMatch(home,/accessibilityLabel="Current load empty state"/);
 assert.match(home,/Loading illustration — sample packages only/);
 assert.match(home,/const noCargoLoaded=!progress\|\|progress\.allocatedCbm===0/);
 assert.match(home,/containerHtml\(dark,noCargoLoaded,progress\?\.reservedCbm\?\?0,progress\?\.loadedCbm\?\?0,progress\?\.inboundCbm\?\?0\)/);
 assert.match(home,/const visible=EMPTY\?demoCount:RESERVED>0/);
 assert.match(home,/const timer=setInterval\(\(\)=>\{const elapsed=Date\.now\(\)-started/);
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
 assert.match(home,/currentContainer\.kind==='unassigned'\?'0%':'—'/);
 assert.match(home,/currentContainer\.kind==='unassigned'\?'68\.0':'—'/);
 assert.match(home,/strokeDasharray=\{\x60\$\{\(containerRatio\*87\.96\)/);
 assert.match(home,/\{containerPercent\} filled/);
 assert.match(home,/\{containerAvailable\} CBM/);
 assert.doesNotMatch(home,/\{fillPercent\} of your space/);
});
test('short empty-state hint appears only without a container or committed cargo',()=>{
 assert.match(home,/showEmptyLoadHint=currentContainer\.kind==='unassigned'/);
 assert.match(home,/progress\.loadedCbm===0&&progress\.inboundCbm===0/);
 assert.match(home,/\{showEmptyLoadHint\?<Tx/);
 assert.match(home,/Nothing loaded yet/);
 assert.doesNotMatch(home,/No goods loaded into a container yet/);
});
test('lower bar alternates every fifteen seconds only when container assigned',()=>{
 assert.match(home,/progressView,setProgressView/);
 assert.match(home,/const hasCurrentContainer=currentContainer\.kind==='assigned'/);
 assert.match(home,/if\(!hasCurrentContainer\)\{setProgressView\('customer'\);return;\}/);
 assert.match(home,/setInterval\(\(\)=>setProgressView\(view=>view==='customer'\?'container':'customer'\),15000\)/);
 assert.match(home,/progressView==='container'&&hasCurrentContainer/);
 assert.match(home,/Loaded <Tx/);
 assert.match(home,/Inbound <Tx/);
 assert.match(home,/Not allocated <Tx/);
 assert.match(home,/containerOccupancy\.otherCargoCbm\.toFixed\(1\)/);
 assert.match(home,/containerOccupancy\.yourSpaceCbm\.toFixed\(1\)/);
 assert.match(home,/containerOccupancy\.freeCbm\.toFixed\(1\)/);
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
