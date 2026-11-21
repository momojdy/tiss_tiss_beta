const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
module.exports=async function({actors,anonymous,pg,scenario,report}){
 const root=path.resolve(__dirname,'..'),q=value=>"'"+String(value).replaceAll("'","''")+"'";
 const call=async(actor,name,args)=>{const response=await actor.sdk.rpc(name,args);assert.equal(response.error,null,name+': '+response.error?.message);return response.data;};
 const denied=async(actor,name,args)=>{const response=await actor.sdk.rpc(name,args);assert.ok(response.error,name+' unexpectedly succeeded');assert.ok(['42501','P0001','22023'].includes(response.error.code),JSON.stringify(response.error));};
 function compile(file,ports){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Map,Set,console,require:name=>{assert.ok(name in ports,'Unexpected consumer dependency: '+name);return ports[name];}});return module.exports;}
 const cache=new Map(),published=compile('src/lib/wantissCms.ts',{'./supabase':{supabase:anonymous}});
 const resolver=compile('src/features/Goodies/i18n/resolveText.ts',{}).resolveGoodiesText;
 const interfaceContent=compile('src/features/Goodies/i18n/interfaceContent.ts',{'./resolveText':{resolveGoodiesText:resolver}});
 const consumer=compile('src/features/Goodies/content.ts',{'../../lib/wantissCms':published,'@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async key=>cache.get(key)||null,setItem:async(key,value)=>{cache.set(key,value);},removeItem:async key=>{cache.delete(key);}}},'./i18n/interfaceContent':interfaceContent,'./i18n':{tx:value=>resolver(value,'en')},'./store':{contentHooks:{}}});
 const payload=JSON.parse(fs.readFileSync(path.join(root,'docs/goodies/content-acceptance-release/publish-payload.json'),'utf8'));
 const fees=JSON.parse(pg("select payload->'fees' from public.wantiss_cms_content where content_key='goodies.content' and locale='en' and status='published' order by version desc limit 1"));payload.fees=fees;
 // Full approved candidate is a local baseline only. No hosted content is changed.
 pg(`update public.wantiss_cms_content set payload=${q(JSON.stringify(payload))}::jsonb where content_key='goodies.content' and locale='en' and status='published';`);
 const original=payload.labels.find(row=>row.id==='lbl.coupons').t.en.v,edited=structuredClone(payload),editedRow=edited.labels.find(row=>row.id==='lbl.coupons');
 editedRow.t.en={v:'Local CMS acceptance heading',s:'reviewed',human_reviewed:false};edited.fees={...fees,svc:999};
 let draft;
 await scenario('The real public Edge handler loads published Goodies into the actual consumer content module',async()=>{
  await consumer.loadContent();assert.equal(consumer.contentStatus,'ready');assert.equal(consumer.label('lbl.coupons','Missing'),original);
  assert.equal(consumer.C.labels.length,payload.labels.length);
 });
 await scenario('CMS editing is permission-controlled and cannot change protected fee policy',async()=>{
  const args={p_content_key:'goodies.content',p_locale:'en',p_payload:edited};
  await denied(actors.customer,'wantiss_admin_save_cms_draft',args);
  pg(`insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,granted_by,reason) values(${q(actors.restrictedStaff.id)},'content.manage','edit',${q(actors.superAdmin.id)},'Synthetic local content acceptance');`);
  draft=await call(actors.restrictedStaff,'wantiss_admin_save_cms_draft',args);
  await denied(actors.restrictedStaff,'wantiss_admin_publish_cms_version',{p_content_id:draft});
  const saved=JSON.parse(pg(`select payload from public.wantiss_cms_content where id=${q(draft)}`));assert.deepEqual(saved.fees,fees);
  assert.equal(resolver(saved.labels.find(row=>row.id==='lbl.coupons').t,'en',true),'Local CMS acceptance heading');
  await consumer.loadContent();assert.equal(consumer.C.labels.find(row=>row.id==='lbl.coupons').t.en.v,original);
 });
 await scenario('Authorized CMS publication reaches a consumer reload through real Edge and PostgREST calls',async()=>{
  await call(actors.superAdmin,'wantiss_admin_publish_cms_version',{p_content_id:draft});
  await consumer.loadContent();assert.equal(consumer.contentStatus,'ready');assert.equal(consumer.label('lbl.coupons','Missing'),'Local CMS acceptance heading');
  assert.equal(consumer.C.labels.length,payload.labels.length);assert.equal(consumer.C.fees.svc,fees.svc);
  const cached=JSON.parse(cache.get('goodies-published-content-v5'));assert.equal(cached.labels.find(row=>row.id==='lbl.coupons').t.en.v,'Local CMS acceptance heading');
  assert.equal(Number(pg(`select count(*) from public.wantiss_admin_audit_log where action='cms_content_published' and resource_id=${q(draft)}`)),1);
 });
 report.cms={classification:'PASS',scope:'Real local Edge + PostgREST + consumer loadContent, with an in-memory AsyncStorage port. Not a physical installed-app reload or production publication.',labels:payload.labels.length,productionPublished:false,installedApp:'NOT VERIFIED'};
};
