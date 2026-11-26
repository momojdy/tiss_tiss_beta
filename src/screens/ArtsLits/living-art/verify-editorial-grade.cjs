const assert=require('node:assert/strict');
const {editorialGrade,treatments}=require('./editorial-grade.cjs');
for(const name of Object.keys(treatments)){
 const source=Uint8Array.from([240,233,221,255,217,63,50,255,0,0,0,0,24,40,38,120]);
 const out=editorialGrade(source,4,1,name);
 assert.equal(out.length,source.length);
 for(let i=3;i<source.length;i+=4)assert.equal(out[i],source[i]);
 if(name==='Home')assert.deepEqual(out.slice(0,4),source.slice(0,4));
 assert.ok(Math.max(...out.slice(4,7))-Math.min(...out.slice(4,7))<167);
 assert.deepEqual(out.slice(8,12),source.slice(8,12));
 assert.deepEqual(editorialGrade(source,4,1,name),out);
 const texture=Uint8Array.from(Array.from({length:9},(_,i)=>[120+(i===4?20:0),70+(i===4?20:0),60+(i===4?20:0),255]).flat());
 const flat=editorialGrade(texture,3,3,name);
 assert.ok(flat[16]<editorialGrade(texture.slice(16,20),1,1,name)[0]);
}
console.log('Editorial grade: muted pigments, deterministic edge-aware texture, alpha and cream W preservation verified.');
