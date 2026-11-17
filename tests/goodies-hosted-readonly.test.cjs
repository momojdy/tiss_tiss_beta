const {test}=require('node:test'),assert=require('node:assert/strict');
const {Buffer}=require('node:buffer');
const {validateConfig,privateRead,contentRead,run}=require('../scripts/verify-goodies-hosted-readonly.cjs');
const jwt=role=>'public.'+Buffer.from(JSON.stringify({role,ref:'ycbirmgppwavorwudlrv'})).toString('base64url')+'.synthetic';
const config={projectRef:'ycbirmgppwavorwudlrv',publishableKey:'sb_publishable_synthetic_test',anonJwt:jwt('anon')};
test('hosted read-only tooling refuses privileged keys, privileged claims and foreign projects',()=>{
 assert.equal(validateConfig(config).projectRef,config.projectRef);for(const bad of [{...config,publishableKey:'sb_secret_prohibited'},{...config,anonJwt:jwt('service_role')},{...config,projectRef:'another-project'}])assert.throws(()=>validateConfig(bad));
});
test('hosted read checks distinguish protected rows, explicit denial and an unverifiable server failure',()=>{
 assert.equal(privateRead(200,[{id:'sensitive'}]).classification,'FAIL');assert.equal(privateRead(200,[]).classification,'PASS');assert.equal(privateRead(403,{message:'private SQL'}).classification,'PASS');assert.equal(privateRead(500,{message:'private SQL'}).classification,'NOT VERIFIED');assert.ok(!JSON.stringify(privateRead(500,{message:'private SQL'})).includes('private SQL'));
});
test('public CMS checks reject missing/draft content without claiming publication acceptance',()=>{
 assert.equal(contentRead(200,{content:[],assets:[]}).classification,'FAIL');assert.equal(contentRead(200,{content:[{content_key:'goodies.content',status:'draft',payload:{v:5}}],assets:[]}).classification,'FAIL');
 const result=contentRead(200,{content:[{content_key:'goodies.content',status:'published',version:1,payload:{v:5,faq:[]}}],assets:[]});assert.equal(result.classification,'PASS');assert.match(result.publicationAcceptance,/NOT VERIFIED/);
});
test('hosted probe dispatches only the fixed public read endpoints and never leaks error bodies or credentials',async()=>{
 const calls=[],report=await run(config,async(url,options)=>{calls.push({url,options});return{status:500,json:async()=>({message:'private details'})};});
 assert.equal(calls.length,6);assert.ok(calls.every(x=>x.url.startsWith('https://ycbirmgppwavorwudlrv.supabase.co/')));assert.equal(calls.filter(x=>x.options.method==='POST').length,1);assert.ok(calls.find(x=>x.options.method==='POST').url.endsWith('/functions/v1/wantiss-public-content'));assert.ok(!JSON.stringify(report).includes(config.publishableKey));assert.ok(!JSON.stringify(report).includes('private details'));
});
