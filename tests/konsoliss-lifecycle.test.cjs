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
 assert.match(home,/containerHtml\(dark,noCargoLoaded\)/);
 assert.match(home,/if\(EMPTY&&ci>=demoCount\)continue/);
 assert.match(home,/const timer=setInterval\(\(\)=>\{const elapsed=Date\.now\(\)-started/);
 assert.match(home,/<WebView/);
 assert.match(home,/onTouchStart=\{\(\) => setScroll\(false\)\}/);
 assert.doesNotMatch(home,/'Container KS-2048\\n76% filled'/);
});
test('customer metrics are separate from the 68 CBM shared container capacity',()=>{
 assert.match(home,/const progress=loadProgress\.kind==='recorded'\?loadProgress\.progress:null/);
 assert.match(home,/const committedValue=progress\?fmt\(progress\.allocatedCbm\)/);
 assert.match(home,/const fillRatio=progress&&progress\.reservedCbm>0\?progress\.allocatedCbm\/progress\.reservedCbm:0/);
 assert.match(home,/Space reserved/);
 assert.match(home,/Goods sent/);
 assert.match(home,/Loaded in container/);
 assert.match(home,/Inbound to container/);
 assert.match(home,/Sent — not yet allocated/);
 assert.match(home,/Container capacity: 68 CBM/);
 assert.doesNotMatch(home,/const loadAmount=loadKnown\?'51\.7'/);
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
