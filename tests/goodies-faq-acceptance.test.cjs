const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {repairFaq,isPlaceholder,rebaseCurrentFees}=require('../scripts/prepare-goodies-acceptance-content.cjs');
const source=require('../docs/goodies/localization-release/publish-payload.json'),copy=require('../docs/goodies/content-acceptance-release/faq-copy.json');
test('FAQ repair replaces all five real placeholders without editing other content or Creole',()=>{
 const before=JSON.stringify(source),result=repairFaq(source,copy);assert.equal(result.changed.length,5);assert.equal(JSON.stringify(source),before);
 const expected=structuredClone(source);for(const [i,row]of result.payload.faq.entries()){assert.ok(!isPlaceholder(row.a));assert.deepEqual(row.a.ht,source.faq[i].a.ht);assert.deepEqual(row.q,source.faq[i].q);for(const locale of ['en','fr','es','zh-Hans']){assert.ok(row.a[locale].v.trim());assert.equal(row.a[locale].s,'reviewed');assert.equal(row.a[locale].human_reviewed,false);}expected.faq[i].a=row.a;}
 assert.deepEqual(result.payload,expected);
});
test('FAQ repair preserves manual answers and rejects an unknown or partially translated placeholder',()=>{
 const manual={faq:[{q:{en:{v:'Question'}},a:{en:{v:'An approved manual answer',s:'reviewed'},ht:{v:'Reviewed by owner',s:'reviewed'}}}]};assert.deepEqual(repairFaq(manual,copy),{payload:manual,changed:[]});
 assert.throws(()=>repairFaq({faq:[{q:'Unknown question',a:'Answer coming soon.'}]},copy),/replacement/);
 const incomplete=structuredClone(copy);delete incomplete['How do I track my order?'].fr;assert.throws(()=>repairFaq(source,incomplete),/Incomplete/);
});
test('committed FAQ acceptance package is reproducible and contains no placeholder answer',()=>{
 const old=require('../docs/goodies/localization-release/baseline.json'),current=require('../docs/goodies/content-acceptance-release/baseline.json');
 const result=repairFaq(rebaseCurrentFees(source,old,current),copy),prepared=JSON.parse(fs.readFileSync('docs/goodies/content-acceptance-release/publish-payload.json'));assert.deepEqual(prepared,result.payload);assert.ok(prepared.faq.every(row=>!isPlaceholder(row.a)));
});
test('publication preparation preserves current live fee settings and stops on unrelated concurrent content changes',()=>{
 const old=require('../docs/goodies/localization-release/baseline.json'),current=require('../docs/goodies/content-acceptance-release/baseline.json'),rebased=rebaseCurrentFees(source,old,current);
 assert.deepEqual(rebased.fees,current.payload.fees);assert.deepEqual(rebased.faq,source.faq);assert.deepEqual(source.fees,old.payload.fees);
 const changed=structuredClone(current);changed.payload.faq[0].q.en.v='A newer manually edited question';assert.throws(()=>rebaseCurrentFees(source,old,changed),/changed outside fees/);
 const version=structuredClone(current);version.version++;assert.throws(()=>rebaseCurrentFees(source,old,version),/baseline changed/);
});
