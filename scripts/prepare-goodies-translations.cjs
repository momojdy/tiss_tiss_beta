/* Prepare a translation-only CMS release. No network access, credentials or publishing. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const locales=['en','fr','es','zh-Hans'];
const clone=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const sha=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
const policyBody=id=>/^lbl\.legal(?:Terms|Privacy|Refund)Body$/i.test(id);
function fields(payload){const result=[];
 for(const [list,keys] of Object.entries({labels:['t'],modes:['title','sub'],promos:['title','sub','btn'],cats:['name'],lib:['name'],coupons:['title','desc'],faq:['q','a'],topics:['t']}))for(const [index,row] of (payload[list]||[]).entries())for(const key of keys){if(list==='labels'&&policyBody(row.id))continue;if(row[key]!=null)result.push({path:[list,index,key],id:row.id||`${list}.${index}.${key}`,holder:row,key});}
 for(const [index,row] of (payload.rg?.texts||[]).entries())result.push({path:['rg','texts',index,'t'],id:row.id,holder:row,key:'t'});
 return result;
}
const english=value=>typeof value==='string'?value:value?.en?.v||'';
function sourcePayload(baseline,catalog,restrictions){const payload=clone(baseline),known=new Set((payload.labels||[]).map(row=>row.id));
 payload.labels=payload.labels||[];for(const row of catalog)if(!known.has(row.id))payload.labels.push({id:row.id,t:{en:{v:row.text,s:'draft'}}});
 if(restrictions?.length){payload.rg=payload.rg||{};payload.rg.texts=payload.rg.texts||[];const knownR=new Set(payload.rg.texts.map(row=>row.id));for(const row of restrictions)if(!knownR.has(row.id))payload.rg.texts.push({id:row.id,t:{en:{v:row.text,s:'draft'}}});}
 return payload;
}
function missingRequests(payload){const texts=new Set();for(const field of fields(payload)){const source=english(field.holder[field.key]);if(source.trim())texts.add(source);}return [...texts].sort().map((text,index)=>({id:'K'+String(index).padStart(4,'0'),text}));}
function placeholders(value){return [...value.matchAll(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g)].map(x=>x[0]).sort();}
function prepare(payload,translations,approval){if(approval?.authorizedBy!=='super_admin_user_instruction'||!approval?.reference)throw Error('Explicit super-admin publication authorization required');const next=clone(payload),errors=[];
 for(const field of fields(next)){const before=field.holder[field.key],source=english(before);if(!source.trim())continue;const text=typeof before==='string'?{en:{v:source,s:'draft'}}:clone(before);
  for(const locale of locales){const existing=typeof text[locale]?.v==='string'&&text[locale].v.trim()?text[locale].v:'';const value=locale==='en'?source:existing||translations[source]?.[locale];
   if(!value?.trim()){errors.push(`${field.id}: missing ${locale}`);continue;}
   if(JSON.stringify(placeholders(source))!==JSON.stringify(placeholders(value))){errors.push(`${field.id}: placeholders differ (${locale})`);continue;}
   text[locale]={...(text[locale]||{}),v:value,s:'reviewed',origin:locale==='en'?'existing_english':existing?'existing_cms_translation':'machine_translation',approval_basis:'super_admin_explicit_publication_instruction',human_reviewed:false};
  }
  field.holder[field.key]=text;
 }
 return {payload:next,errors};
}
module.exports={locales,fields,english,sourcePayload,missingRequests,prepare,placeholders,canonical,sha};
if(require.main===module){const [baselineFile,translationsFile,outDir]=process.argv.slice(2);if(!baselineFile||!outDir)throw Error('Usage: node scripts/prepare-goodies-translations.cjs baseline.json translations.json output-directory');
 const records=JSON.parse(fs.readFileSync(baselineFile)),rows=Array.isArray(records)?records:[records],row=rows.find(row=>row.status==='published'&&row.locale==='en'&&row.content_key==='goodies.content');if(!row)throw Error('Published English Goodies baseline required');
 const catalog=require(path.resolve(__dirname,'../../tiss-admin/src/features/admin/goodiesConsumer/customerLabelCatalog.json'));
 const restrictions=require(path.resolve(__dirname,'../../tiss-admin/src/features/admin/goodiesConsumer/customerRestrictionCatalog.json'));
 const source=sourcePayload(row.payload,catalog,restrictions);fs.mkdirSync(outDir,{recursive:true});
 fs.writeFileSync(path.join(outDir,'translation-requests.json'),JSON.stringify(missingRequests(source),null,2)+'\n');
 fs.writeFileSync(path.join(outDir,'baseline.json'),JSON.stringify(row)+'\n');
 if(!fs.existsSync(translationsFile)){console.log('Wrote translation requests; no CMS writes performed.');process.exit(0);}
 if(!process.argv.includes('--publication-authorized-by-user'))throw Error('Use --publication-authorized-by-user only with explicit publication authorization');
 const result=prepare(source,JSON.parse(fs.readFileSync(translationsFile)),{authorizedBy:'super_admin_user_instruction',reference:'User explicitly requested immediate machine translation publication in en/fr/es/zh-Hans; HT remains user-owned'});if(result.errors.length){fs.writeFileSync(path.join(outDir,'translation-errors.json'),JSON.stringify(result.errors,null,2));throw Error(`${result.errors.length} translation validation failures`);}
 fs.writeFileSync(path.join(outDir,'publish-payload.json'),JSON.stringify(result.payload)+'\n');
 fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({status:'PREPARED_NOT_PUBLISHED',contentKey:row.content_key,baselineId:row.id,baselineVersion:row.version,baselinePayloadSha256:sha(row.payload),payloadSha256:sha(result.payload),authorizedLocales:locales,haitianCreole:'Existing entries preserved; super admin owns review',humanReviewClaim:false,provider:'Google Translate public machine translation endpoint; existing CMS translations preserved',fields:fields(result.payload).length},null,2)+'\n');console.log('Prepared translation-only payload; no CMS writes performed.');
}
