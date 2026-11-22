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
