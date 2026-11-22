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

test('unassigned customers keep the whole dashboard with a genuinely empty 3D container',()=>{
 const hook=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(hook,/value\.kind === 'unassigned'\) return 'No active load'/);
 assert.doesNotMatch(home,/accessibilityLabel="Current load empty state"/);
 assert.match(home,/const noActiveLoad=currentContainer\.kind==='unassigned'/);
 assert.match(home,/const loadAmount=loadKnown\?'51\.7':noActiveLoad\?'0\.0':'—'/);
 assert.match(home,/const fillPercent=loadKnown\?'76%':noActiveLoad\?'0%':'—'/);
 assert.match(home,/const capacityAmount='68'/);
 assert.match(home,/const availableAmount=loadKnown\?'16\.3':noActiveLoad\?'68\.0':'—'/);
 assert.match(home,/const yourSpace=loadKnown\?'0\.5':noActiveLoad\?'0\.0':'—'/);
 assert.match(home,/const visualMode=loadKnown\?'sample':'empty'/);
 assert.match(home,/containerHtml\(dark,visualMode==='empty'\)/);
 assert.match(home,/const CONTAINER_JS = \[/);
 assert.match(home,/if\(!EMPTY\)for\(let i=0;i<10;i\+\+\)/);
 assert.match(home,/if\(!EMPTY\)\{const top=/);
 assert.match(home,/<WebView/);
 assert.match(home,/onTouchStart=\{\(\) => setScroll\(false\)\}/);
 assert.doesNotMatch(home,/'Container KS-2048\\n76% filled'/);
});
test('empty, loading, and unavailable states are distinct from an assigned container',()=>{
 const hook=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(home,/currentContainer\.kind==='unassigned'/);
 assert.match(home,/Load details unavailable/);
 assert.match(hook,/if \(value\.kind === 'loading'\)/);
 assert.match(hook,/if \(value\.kind === 'unavailable'\)/);
});
