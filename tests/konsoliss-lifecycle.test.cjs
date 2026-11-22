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

test('unassigned customers see No active load and no fabricated cargo visualization',()=>{
 const hook=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(hook,/value\.kind === 'unassigned'\) return 'No active load'/);
 assert.match(home,/currentContainer\.kind === 'assigned' \? <>/);
 assert.match(home,/accessibilityLabel="Current load empty state"/);
 assert.match(home,/Your next load starts here/);
 assert.match(home,/No active load yet/);
 assert.match(home,/Explore Book Space below/);
 assert.match(home,/currentContainer\.kind==='unassigned'\?'No active load'/);
 assert.match(home,/currentContainer\.kind==='unassigned'\?'No packages in an active load'/);
 assert.doesNotMatch(home,/'Container KS-2048\\n76% filled'/);
});
test('empty, loading, and unavailable states are distinct from an assigned container',()=>{
 const hook=fs.readFileSync(path.join(root,'useCurrentKonsolissContainer.ts'),'utf8');
 assert.match(home,/currentContainer\.kind==='loading'\?'Checking your current load/);
 assert.match(home,/Load details unavailable/);
 assert.match(hook,/if \(value\.kind === 'loading'\)/);
 assert.match(hook,/if \(value\.kind === 'unavailable'\)/);
});
