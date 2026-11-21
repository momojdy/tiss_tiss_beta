/* Real local Supabase Storage API, backed by private files and its own managed schema. */
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
module.exports=function({actors:a,anonymous,pg,scenario,report}){
 const bucket='goodies-delivery-proofs',image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCwoAAAAASUVORK5CYII=','base64');
 const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const count=()=>Number(pg("select count(*) from storage.objects where bucket_id='goodies-delivery-proofs'"));
 const checks=[];report.storage={classification:'NOT VERIFIED',scope:'Actual local HTTP Storage operations only; no hosted object or physical camera.',checks};
 const target={reference:null};
 const resolver=actor=>{
  const module={exports:{}},source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/goodiesDeliveryProof.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:name=>{assert.equal(name,'../lib/supabase');return {supabase:actor.sdk};}});return module.exports.resolveGoodiesDeliveryProof;
 };
 target.upload=async proof=>{
  const initial=count();
  for(const [role,sdk]of [['anonymous',anonymous],...['customer','otherVendor','vendorStaff','courier'].map(role=>[role,a[role].sdk])]){
   const denied=await sdk.storage.from(bucket).upload(proof,image,{contentType:'image/png',upsert:false});
   assert.ok(denied.error,role+' must not upload this private delivery proof');assert.equal(count(),initial);checks.push({name:role+' upload denied',classification:'PASS'});
  }
  const invalid=await a.vendor.sdk.storage.from(bucket).upload(proof,Buffer.from('{}'),{contentType:'application/json',upsert:false});assert.ok(invalid.error,'Unsupported evidence MIME type was accepted');assert.equal(count(),initial);checks.push({name:'Unsupported MIME type denied',classification:'PASS'});
  const uploaded=await a.vendor.sdk.storage.from(bucket).upload(proof,image,{contentType:'image/png',upsert:false});assert.equal(uploaded.error,null,uploaded.error?.message);assert.equal(uploaded.data.path,proof);assert.equal(count(),initial+1);checks.push({name:'Authorized vendor uploads real PNG bytes',classification:'PASS'});
 };
 target.verify=async()=>{
  const proof=target.reference;assert.ok(proof);
  const expectedHash=hash(image);
  await scenario('Real private Storage returns the original proof bytes through the consumer resolver and authorized admin access',async()=>{
   assert.equal(pg("select public from storage.buckets where id='goodies-delivery-proofs'"),'false');
   const signed=await resolver(a.customer)(proof),url=new URL(signed);assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
   const token=url.searchParams.get('token');assert.ok(token);const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
   assert.ok(claims.exp>Math.floor(Date.now()/1000)+270&&claims.exp<=Math.floor(Date.now()/1000)+310,'The consumer proof capability must expire after approximately five minutes.');
   const response=await fetch(signed);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\/png/);assert.equal(hash(Buffer.from(await response.arrayBuffer())),expectedHash);
   for(const actor of [a.vendor,a.superAdmin]){const downloaded=await actor.sdk.storage.from(bucket).download(proof);assert.equal(downloaded.error,null,downloaded.error?.message);assert.equal(hash(Buffer.from(await downloaded.data.arrayBuffer())),expectedHash);}
   report.storage.originalByteSha256=expectedHash;report.storage.signedCapabilitySeconds=300;checks.push({name:'Owner/customer/admin authorized reads and bounded capability',classification:'PASS'});
  });
  await scenario('Private proof download and signing deny anonymous, unrelated customer/vendor and restricted staff; public URLs stay unavailable',async()=>{
   for(const [role,sdk]of [['anonymous',anonymous],...['otherCustomer','otherVendor','restrictedStaff'].map(role=>[role,a[role].sdk])]){
    const read=await sdk.storage.from(bucket).download(proof),signed=await sdk.storage.from(bucket).createSignedUrl(proof,300);
    assert.ok(read.error,role+' unexpectedly read private evidence');assert.ok(signed.error,role+' unexpectedly signed private evidence');checks.push({name:role+' private read and signing denied',classification:'PASS'});
   }
   const publicUrl=anonymous.storage.from(bucket).getPublicUrl(proof).data.publicUrl,response=await fetch(publicUrl);assert.equal(response.ok,false);await response.arrayBuffer();
   await assert.rejects(()=>resolver(a.customer)('../invalid.png'));checks.push({name:'Public access and invalid path denied',classification:'PASS'});
  });
  await scenario('Delivered private proof cannot be overwritten or supplemented after the merchant handoff',async()=>{
   const before=count(),replacement=Buffer.from('not the original evidence');
   const overwritten=await a.vendor.sdk.storage.from(bucket).upload(proof,replacement,{contentType:'image/png',upsert:true});assert.ok(overwritten.error,'Delivered evidence was overwritten');
   const appended=await a.vendor.sdk.storage.from(bucket).upload(proof.replace(/[^/]+$/,'late-proof.png'),image,{contentType:'image/png',upsert:false});assert.ok(appended.error,'New evidence was appended after delivery');assert.equal(count(),before);
   const original=await a.customer.sdk.storage.from(bucket).download(proof);assert.equal(original.error,null,original.error?.message);assert.equal(hash(Buffer.from(await original.data.arrayBuffer())),expectedHash);checks.push({name:'Post-delivery evidence remains immutable',classification:'PASS'});
  });
  report.storage.classification='PASS';
 };
 return target;
};
