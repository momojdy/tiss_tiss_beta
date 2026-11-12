const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const {fields,locales,placeholders,sha}=require('./prepare-goodies-translations.cjs');
const dir=path.resolve(process.argv[2]||'docs/goodies/localization-release'),base=JSON.parse(fs.readFileSync(path.join(dir,'baseline.json'))),payload=JSON.parse(fs.readFileSync(path.join(dir,'publish-payload.json')));
function load(file,cache=new Map()){
 if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const req=id=>{if(id==='./i18n')return{t:key=>key};if(!id.startsWith('.'))return require(id);const base=path.resolve(path.dirname(file),id),target=[base,base+'.ts',base+'.tsx',base+'.json'].find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());if(!target)throw Error('Missing '+base);return target.endsWith('.json')?JSON.parse(fs.readFileSync(target)):load(target,cache);};
 vm.runInThisContext('(function(require,module,exports){'+code+'})',{filename:file})(req,module,module.exports);return module.exports;
}
const admin=path.resolve(__dirname,'../../tiss-admin/src/features/admin/goodiesConsumer'),{validateGoodiesDraft}=load(path.join(admin,'draft.ts')),{goodiesPublicationErrors}=load(path.join(admin,'publicationReview.ts')),{resolveGoodiesText}=load(path.resolve(__dirname,'../src/features/Goodies/i18n/resolveText.ts'));
const schemaErrors=validateGoodiesDraft(payload,true),publicationErrors=goodiesPublicationErrors(payload),before=JSON.parse(JSON.stringify(base.payload)),after=JSON.parse(JSON.stringify(payload));
assert.deepEqual(schemaErrors,[]);
let checked=0,ht=0;
for(const field of fields(payload).filter(field=>field.holder[field.key]?.en?.v?.trim()))for(const locale of locales){const text=field.holder[field.key][locale];assert.ok(text?.v?.trim(),`${field.id}: ${locale}`);assert.equal(text.s,'reviewed');assert.equal(text.human_reviewed,false);assert.equal(resolveGoodiesText(field.holder[field.key],locale),text.v);assert.deepEqual(placeholders(text.v),placeholders(field.holder[field.key].en.v));checked++;}
function at(root,parts){return parts.reduce((node,key)=>node[key],root);}
for(const field of fields(base.payload)){const old=at(base.payload,field.path),next=at(payload,field.path);assert.deepEqual(next.ht,old.ht,`${field.id}: Haitian Creole changed`);if(old.ht)ht++;
 at(before,field.path.slice(0,-1))[field.key]='__authorized_translation_field__';at(after,field.path.slice(0,-1))[field.key]='__authorized_translation_field__';}
const originalIds=new Set(base.payload.labels.map(row=>row.id));after.labels=after.labels.filter(row=>originalIds.has(row.id));
if(!base.payload.rg)delete after.rg;
assert.deepEqual(after,before,'Non-text configuration or policy content changed');
const result={prepared:true,published:false,fields:fields(payload).length,localeLookupsVerified:checked,existingHaitianFieldsPreserved:ht,feesAndNonTextConfigurationUnchanged:true,policyDocumentsUnchanged:true,schemaErrors,publicationGuardErrors:publicationErrors,payloadSha256:sha(payload),scope:'Local payload/schema/consumer-resolver verification, not live publication or human review'};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,publicationGuardErrors:publicationErrors.length},null,2));
