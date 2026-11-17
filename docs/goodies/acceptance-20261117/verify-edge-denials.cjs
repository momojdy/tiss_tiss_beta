/* Only empty, unauthenticated requests and invalid Stripe signatures.
 * No customer/order/payment IDs, valid signatures, worker tokens or provider calls.
 * A passing denial is not a sandbox charge/refund/webhook-lifecycle pass. */
const fs=require('node:fs'),path=require('node:path');
const {validateConfig}=require('../../../scripts/verify-goodies-hosted-readonly.cjs');
const config=validateConfig(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
const base='https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/';
const anon={apikey:config.publishableKey,Authorization:'Bearer '+config.anonJwt};
const checks=[
 {name:'webhook_missing_signature',fn:'rapid-api',status:400,error:'Missing Stripe signature.',headers:{}},
 {name:'webhook_invalid_signature',fn:'rapid-api',status:400,error:'Invalid Stripe signature.',headers:{'Stripe-Signature':'t=1,v1='+'0'.repeat(64)}},
 {name:'card_checkout_no_user',fn:'place-goodies-card-order',status:401,error:'Sign in required',headers:anon},
 {name:'card_refund_no_user',fn:'refund-goodies-card-order',status:401,error:'Sign in required',headers:anon},
];
(async()=>{
 const results=await Promise.all(checks.map(async check=>{
  try{
   const response=await fetch(base+check.fn,{method:'POST',headers:{'Content-Type':'application/json',...check.headers},body:'{}',redirect:'error',signal:AbortSignal.timeout(20000)}),body=await response.json().catch(()=>({}));
   const matched=response.status===check.status&&body.error===check.error;
   return{name:check.name,httpStatus:response.status,expectedDenial:matched,classification:matched?'PASS':response.ok?'FAIL':'NOT VERIFIED'};
  }catch{return{name:check.name,classification:'NOT VERIFIED',evidence:'Transport unavailable; response/credential text omitted.'};}
 }));
 const report={scope:'Actual hosted negative-authentication checks with empty bodies only. No valid event, signed-in user, worker token, checkout, charge or refund was dispatched.',observedAt:new Date().toISOString(),results,providerSandboxLifecycle:'NOT VERIFIED'};
 const output=path.join(__dirname,'hosted-edge-denials.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=results.some(row=>row.classification==='FAIL')?1:0;
})().catch(()=>{console.error('Negative-authentication verification unavailable. No private details printed.');process.exitCode=1;});
