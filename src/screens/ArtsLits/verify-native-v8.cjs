const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const ts = require('typescript');
const root=__dirname;
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets-manifest.json'),'utf8'));
assert.equal(manifest.sourceSha256,'b4a0f5e1b70aac4cf77cc04a1538f67eadc61018b9bcebfad3a89d8e7ecaed99');
assert.equal(Object.keys(manifest.images).length,22);
assert.equal(new Set(Object.values(manifest.images).map(v=>v.sha256)).size,19);
for(const v of Object.values(manifest.images)){const b=fs.readFileSync(path.join(root,'assets',v.file));assert.equal(b.length,v.bytes,v.file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),v.sha256,v.file);}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'arts-lits-v8-'));
try{
  for(const name of fs.readdirSync(root).filter(n=>/\.tsx?$/.test(n))){const text=fs.readFileSync(path.join(root,name),'utf8');assert.ok(!/react-native-webview|<iframe\b|dangerouslySetInnerHTML/i.test(text),name+' must be native');const r=ts.transpileModule(text,{fileName:name,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(r.diagnostics.length,0,name+' syntax');if(['model.ts','catalog.ts'].includes(name))fs.writeFileSync(path.join(temp,name.replace(/\.ts$/,'.js')),r.outputText);}
  const m=require(path.join(temp,'model.js'));const c=require(path.join(temp,'catalog.js'));
  const ids=c.catalog.map(p=>p[0]);assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);
  for(const p of c.catalog)assert.ok(manifest.images[p[3]]);for(const b of c.BOOKS)assert.ok(manifest.images[b[0]]);
  for(const p of m.profileOptions){for(let i=0;i<7;i++){if(i<4)assert.equal(m.access(i,p[0],false),'Free');assert.equal(m.access(5,p[0],true),'Sponsored · Free');}}
  assert.equal(m.access(4,'museum',false),'Pass active');assert.equal(m.access(4,'member',false),'Included');assert.equal(m.access(5,'member',false),'Included');assert.equal(m.access(6,'member',true),'Ticket');assert.equal(m.access(5,'returning',false),'Ticket');
  const fresh=m.sectionVisibility('new',false,5);assert.equal(fresh.recent,false);assert.equal(fresh.shelf,false);assert.equal(fresh.startShelf,true);assert.equal(fresh.following,false);assert.equal(fresh.sponsor,false);
  assert.equal(m.sectionVisibility('reader',true,1).shelf,true);assert.equal(m.sectionVisibility('collector',true,1).collection,true);assert.equal(m.sectionVisibility('museum',true,1).offer,true);assert.equal(m.sectionVisibility('member',true,1).passes,true);assert.equal(m.sectionVisibility('returning',true,0).following,false);
  assert.equal(m.visibleProducts('All',6).items.length,6);assert.equal(m.visibleProducts('All',12).items.length,12);assert.equal(m.visibleProducts('All',12).hasMore,false);assert.equal(m.visibleProducts('Books',6).items.length,3);assert.ok(m.visibleProducts('Books',6).items.every(p=>p[2]==='Books'));
  assert.ok(m.searchCatalog('Walden').some(r=>r[0]==='Walden'));assert.ok(m.searchCatalog('vermeer').some(r=>r[0]==='Young Woman with a Water Pitcher'));assert.equal(m.searchCatalog('no-such-record').length,0);assert.equal(m.effectiveConnection('live',false),'offline');assert.equal(m.effectiveConnection('live',true),'ready');assert.equal(m.effectiveConnection('error',true),'error');
  assert.equal(m.shelfBooks.filter(b=>b.leaning).length,1);assert.equal(m.shelfBooks.find(b=>b.leaning).title,'Jane Eyre');
  console.log('V8: 19 unique exact assets, 22 logical references, native TS/TSX syntax, profiles, access, finite paging, search and shelf verified.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
