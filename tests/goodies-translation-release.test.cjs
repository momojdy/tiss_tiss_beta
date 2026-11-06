const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepare,sourcePayload,missingRequests,sha}=require('../scripts/prepare-goodies-translations.cjs');
const approval={authorizedBy:'super_admin_user_instruction',reference:'synthetic authorization for tests'};
const payload={v:5,fees:{svc:4,pay:{Card:true}},ages:[{country:'HT',age:18}],ageDef:18,legal:[{id:'legal.terms',st:'Draft',t:{en:{v:'Legal draft',s:'draft'},ht:{v:'Legal HT',s:'draft'}}}],labels:[{id:'lbl.total',t:{en:{v:'Total {amount}',s:'draft'},ht:{v:'Total {amount}',s:'reviewed',reviewer:'owner'},fr:{v:'Total {amount}',s:'draft'}}},{id:'lbl.legalTermsBody',t:{en:{v:'Existing legal text',s:'draft'}}}],modes:[],promos:[],cats:[],lib:[],coupons:[],faq:[],topics:[]};
const translated={'Total {amount}':{fr:'Montant {amount}',es:'Total {amount}','zh-Hans':'总计 {amount}'}};
test('machine publication preparation requires explicit authorization',()=>assert.throws(()=>prepare(payload,translated),/authorization required/));
test('four-locale release preserves fees, legal documents, policy bodies, Haitian Creole and existing manual text',()=>{
 const before=sha(payload),result=prepare(payload,translated,approval);assert.deepEqual(result.errors,[]);assert.equal(sha(payload),before);
 assert.deepEqual(result.payload.fees,payload.fees);assert.deepEqual(result.payload.ages,payload.ages);assert.deepEqual(result.payload.legal,payload.legal);assert.deepEqual(result.payload.labels[1],payload.labels[1]);
 const text=result.payload.labels[0].t;assert.deepEqual(text.ht,payload.labels[0].t.ht);assert.equal(text.fr.v,'Total {amount}');
 for(const locale of ['en','fr','es','zh-Hans']){assert.equal(text[locale].s,'reviewed');assert.equal(text[locale].human_reviewed,false);assert.equal(text[locale].approval_basis,'super_admin_explicit_publication_instruction');}
});
test('missing translations and missing dynamic placeholders prevent a complete release',()=>{
 const result=prepare(payload,{'Total {amount}':{es:'Total','zh-Hans':''}},approval);assert.ok(result.errors.some(x=>x.includes('placeholders differ (es)')));assert.ok(result.errors.some(x=>x.includes('missing zh-Hans')));
});
test('registered fields are added without replacing old copy, non-text configuration or Haitian Creole',()=>{
 const result=sourcePayload(payload,[{id:'lbl.total',text:'Different'},{id:'lbl.new',text:'Add to cart'}],[{id:'rg.consent',text:'I am {age} or older.'}]);
 assert.equal(result.labels[0].t.en.v,'Total {amount}');assert.equal(result.labels[2].t.en.v,'Add to cart');assert.equal(result.rg.texts[0].t.en.v,'I am {age} or older.');assert.deepEqual(result.labels[0].t.ht,payload.labels[0].t.ht);assert.deepEqual(result.fees,payload.fees);
 assert.ok(missingRequests(result).some(row=>row.text==='Add to cart'));assert.ok(!missingRequests(result).some(row=>row.text==='Existing legal text'));
});

test('prepared live-baseline release preserves all existing Creole entries and every registered app field',()=>{
 const fs=require('node:fs'),path=require('node:path'),{fields,placeholders}=require('../scripts/prepare-goodies-translations.cjs');
 const dir=path.resolve(__dirname,'../docs/goodies/localization-release'),before=JSON.parse(fs.readFileSync(path.join(dir,'baseline.json'))).payload,after=JSON.parse(fs.readFileSync(path.join(dir,'publish-payload.json')));
 const at=(root,keys)=>keys.reduce((node,key)=>node[key],root);
 for(const field of fields(before)){assert.deepEqual(at(after,field.path).ht,field.holder[field.key].ht);}
 assert.deepEqual(after.fees,before.fees);assert.deepEqual(after.ages,before.ages);assert.equal(after.ageDef,before.ageDef);assert.deepEqual(after.legal,before.legal);
 for(const field of fields(after)){const text=field.holder[field.key];if(!text.en?.v?.trim())continue;for(const locale of ['en','fr','es','zh-Hans']){assert.ok(text[locale]?.v?.trim(),field.id+': '+locale);assert.equal(text[locale].s,'reviewed');assert.equal(text[locale].human_reviewed,false);assert.deepEqual(placeholders(text[locale].v),placeholders(text.en.v));}}
 const catalog=require('../docs/goodies/cms-field-coverage.json');const ids=new Set(after.labels.map(row=>row.id));for(const row of catalog.entries)assert.ok(ids.has(row.id),row.id);
});
