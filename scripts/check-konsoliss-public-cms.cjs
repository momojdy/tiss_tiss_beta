// Read-only release check against the public CMS endpoint. Never creates CMS or operational records.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const {KONSOLISS_COPY_DEFAULTS:defaults,KONSOLISS_LOCALES:locales}=await import(pathToFileURL(path.resolve(__dirname,'../src/screens/Konsoliss/cms/catalog.ts')).href);
 const endpoint='https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/wantiss-public-content';
 const requirePublished=process.argv.includes('--require-published')||process.env.REQUIRE_PUBLISHED==='true';
 const tokens=value=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(m=>m[1]).sort();
 let published=0;
 for(const locale of locales){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale}),signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,'Public CMS HTTP '+locale);
  const data=await response.json();assert.ok(Array.isArray(data.content)&&Array.isArray(data.assets),'Public CMS response shape '+locale);
  const rows=data.content.filter(row=>row.content_key==='konsoliss.content');assert.ok(rows.length<=1,'Duplicate published homepage '+locale);
  if(!rows.length){console.log(locale+': public delivery HTTP 200; no published homepage yet');continue;}
  const row=rows[0];assert.equal(row.locale,locale);assert.ok(Number.isInteger(row.version)&&row.version>0);assert.ok(!row.status||row.status==='published');assert.equal(row.payload.v,2);assert.ok(Array.isArray(row.payload.reviewed));
  for(const [key,source] of Object.entries(defaults)){const value=row.payload.labels[key];assert.ok(typeof value==='string'&&value.trim(),locale+' missing '+key);assert.ok(row.payload.reviewed.includes(key),locale+' unreviewed '+key);assert.deepEqual(tokens(value),tokens(source),locale+' placeholders '+key);}
  published++;console.log(locale+': public delivery HTTP 200; published version '+row.version+'; '+Object.keys(defaults).length+' reviewed labels verified');
 }
 console.log('Konsoliss public CMS: '+published+'/'+locales.length+' locales published.');
 if(requirePublished)assert.equal(published,locales.length,'Authorized review/publication required');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
