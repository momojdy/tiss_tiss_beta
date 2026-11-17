/* Production smoke checks: allowlisted reads only, using public credentials and no customer session. */
const fs=require('node:fs'),path=require('node:path');
const {Buffer}=require('node:buffer');
const {sha}=require('./prepare-goodies-translations.cjs');
const project='ycbirmgppwavorwudlrv',base='https://'+project+'.supabase.co';
function validateConfig(value){
 if(value?.projectRef!==project||typeof value.publishableKey!=='string'||!value.publishableKey.startsWith('sb_publishable_'))throw Error('Use the Wantiss project and a publishable public key. Privileged keys are prohibited.');
 let claims;try{claims=JSON.parse(Buffer.from(String(value.anonJwt).split('.')[1],'base64url').toString());}catch{throw Error('A legacy public anon JWT is required for the existing public content gateway.');}
 if(claims.role!=='anon'||claims.ref!==project)throw Error('Only the same-project public anon JWT is permitted.');
 return {projectRef:project,publishableKey:value.publishableKey,anonJwt:value.anonJwt};
}
function privateRead(status,body){
 if(status===401||status===403)return{classification:'PASS',evidence:'Anonymous request denied.'};
 if(status===200&&Array.isArray(body))return body.length?{classification:'FAIL',evidence:'Anonymous request returned protected rows.',returnedRows:body.length}:{classification:'PASS',evidence:'Anonymous request returned no protected rows. This does not prove access boundaries for signed-in identities.'};
 return{classification:'NOT VERIFIED',evidence:'The endpoint did not return a verifiable read/denial response.'};
}
function contentRead(status,body){
 if(status!==200||!Array.isArray(body?.content)||!Array.isArray(body?.assets))return{classification:'NOT VERIFIED',evidence:'Published-content gateway did not return its expected contract.'};
 if(body.content.some(row=>row.status&&row.status!=='published'))return{classification:'FAIL',evidence:'Public gateway returned a non-published content version.'};
 const records=body.content.filter(row=>['goodies.content','goodies'].includes(row.content_key));
 if(!records.length||records.some(row=>row.payload?.v!==5))return{classification:'FAIL',evidence:'Published Goodies v5 content missing or incompatible.'};
 const placeholders=records.reduce((n,row)=>n+(row.payload.faq||[]).filter(f=>/^\s*answer coming soon[.!]?\s*$/i.test(f.a?.en?.v||'')).length,0);
 return{classification:'PASS',evidence:'Actual public content gateway serves published Goodies v5 content.',versions:records.map(row=>row.version),payloadSha256:records.map(row=>sha(row.payload)),faqPlaceholders:placeholders,publicationAcceptance:'NOT VERIFIED: no draft or publication mutation was performed.'};
}
async function run(config,request=fetch){
 const credentials=validateConfig(config),headers={apikey:credentials.publishableKey,Authorization:'Bearer '+credentials.anonJwt,'Content-Type':'application/json'};
 const checks=['goodies_orders','goodies_delivery_assignments','goodies_card_refund_queue','wallets','user_settings'].map(table=>({name:'anonymous_private_read:'+table,url:base+'/rest/v1/'+table+'?select=id&limit=1',method:'GET',classify:privateRead}));
 // user_settings is keyed by user_id, so select only that protected identifier.
 checks.find(check=>check.name.endsWith(':user_settings')).url=base+'/rest/v1/user_settings?select=user_id&limit=1';
 checks.push({name:'published_goodies_gateway',url:base+'/functions/v1/wantiss-public-content',method:'POST',body:JSON.stringify({locale:'en'}),classify:contentRead});
 const results=await Promise.all(checks.map(async check=>{
  try{
   const response=await request(check.url,{method:check.method,headers,body:check.body,redirect:'error',signal:AbortSignal.timeout(20000)});
   let body;try{body=await response.json();}catch{body=null;}
   return{name:check.name,httpStatus:response.status,...check.classify(response.status,body)};
  }catch{return{name:check.name,classification:'NOT VERIFIED',evidence:'Request unavailable; private response/error text intentionally omitted.'};}
 }));
 return{scope:'Actual Wantiss public HTTP reads only. No sign-in, writes, publication, checkout, provider call, financial RPC or service-role credentials. Empty anonymous results do not verify other roles.',projectRef:project,observedAt:new Date().toISOString(),results};
}
module.exports={validateConfig,privateRead,contentRead,run};
if(require.main===module){
 const args=process.argv.slice(2),get=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];};
 if(args.some((arg,i)=>i%2===0&&!['--config','--output'].includes(arg))||!get('--config')||!get('--output'))throw Error('Usage: --config public-credentials.json --output result.json');
 run(JSON.parse(fs.readFileSync(get('--config'),'utf8'))).then(report=>{
  const output=path.resolve(get('--output'));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=report.results.some(row=>row.classification==='FAIL')?1:0;
 }).catch(()=>{console.error('Could not run the read-only checks. Verify the public credential file; no credential or server details printed.');process.exitCode=1;});
}
