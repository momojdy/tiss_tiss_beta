import {parseUsdHtgQuote,runUsdHtgRefresh,USD_HTG_SOURCE} from '../refresh-goodies-exchange-rate/refreshProcessor.ts';

const now=()=>new Date('2026-11-22T06:30:00Z');
const rows=()=>[{date:'2026-11-20',base:'USD',quote:'HTG',rate:131.29}];
const id='90000000-0000-4000-8000-000000000001';
const check=(value:unknown,message='Assertion failed')=>{if(!value)throw Error(message);};
const request=(headers:Record<string,string>={'x-goodies-worker-token':'synthetic-worker-token'})=>new Request('https://synthetic.invalid/refresh',{method:'POST',headers,body:JSON.stringify({rate:1,source:'https://attacker.invalid'})});
type Options={disabled?:boolean;validToken?:boolean;authError?:boolean;state?:unknown;writeError?:boolean;receipt?:unknown;status?:string};
function service(options:Options={}){
 const calls:{name:string;args:Record<string,unknown>}[]=[];
 return {calls,rpc:async(name:string,args:Record<string,unknown>)=>{
  calls.push({name,args});
  if(name==='validate_goodies_refund_worker_token')return {data:options.validToken!==false,error:options.authError?{message:'private database connection details'}:null};
  if(name==='goodies_fx_refresh_status')return {data:options.state??{enabled:!options.disabled},error:null};
  if(name==='goodies_publish_usd_htg_quote')return {data:options.receipt??{status:options.status??'updated',quote_id:id,quote_date:'2026-11-20',expires_at:'2026-11-24T00:00:00+00:00'},error:options.writeError?{message:'private SQL/provider details'}:null};
  if(name==='goodies_record_fx_refresh_failure')return {data:null,error:null};
  throw Error('Unexpected RPC '+name);
 }};
}
const source=(body:unknown=rows(),status=200)=>async()=>Response.json(body,{status});

Deno.test('USD/HTG parser accepts a published weekend reference with a fixed publication-based expiry',()=>{
 const quote=parseUsdHtgQuote(rows(),now());
 check(quote.rate==='131.2900000000'&&quote.date==='2026-11-20'&&quote.expiresAt==='2026-11-24T00:00:00.000Z');
 check(parseUsdHtgQuote(rows(),new Date('2026-11-23T23:59:00Z')).expiresAt===quote.expiresAt,'Fetching again must not extend expiry');
});
Deno.test('USD/HTG parser rejects stale, future, impossible or ambiguous publication dates',()=>{
 for(const bad of [[],[...rows(),...rows()],[{...rows()[0],date:'2026-11-18'}],[{...rows()[0],date:'2026-11-23'}],[{...rows()[0],date:'2026-02-30'}],[{...rows()[0],date:'2026-11-20T00:00:00Z'}]]){
  let rejected=false;try{parseUsdHtgQuote(bad,now());}catch{rejected=true;}check(rejected);
 }
});
Deno.test('USD/HTG parser refuses other pairs and non-finite, string or invalid rates',()=>{
 for(const rate of [null,undefined,'131.29',0,-1,NaN,Infinity,-Infinity,1e10]){let rejected=false;try{parseUsdHtgQuote([{...rows()[0],rate}],now());}catch{rejected=true;}check(rejected);}
 for(const change of [{base:'HTG'},{quote:'USD'},{base:'usd'}]){let rejected=false;try{parseUsdHtgQuote([{...rows()[0],...change}],now());}catch{rejected=true;}check(rejected);}
});
Deno.test('Refresh worker rejects wrong methods and missing/forged tokens before fetching or writing',async()=>{
 for(const req of [new Request('https://synthetic.invalid/refresh'),request({}),request({'x-goodies-worker-token':'x'.repeat(513)})]){
  const db=service();let fetched=false;const result=await runUsdHtgRefresh(req,db,async()=>{fetched=true;return Response.json(rows());},now);
  check([401,405].includes(result.status)&&!fetched&&db.calls.length===0);
 }
 const db=service({validToken:false});const result=await runUsdHtgRefresh(request(),db,async()=>{throw Error('Must not fetch');},now);
 check(result.status===401&&db.calls.length===1);
});
Deno.test('Refresh worker remains inert when the approved rollout is disabled',async()=>{
 const db=service({disabled:true});const result=await runUsdHtgRefresh(request(),db,async()=>{throw Error('Must not fetch');},now);
 check(result.status===200&&(await result.json()).status==='disabled'&&db.calls.length===2);
});
Deno.test('Refresh worker fetches only the configured public feed and publishes validated values rather than request data',async()=>{
 const db=service();const result=await runUsdHtgRefresh(request(),db,async(input,init)=>{
  check(input===USD_HTG_SOURCE&&init?.redirect==='error');
  const headers=new Headers(init?.headers);check(headers.get('accept')==='application/json'&&!headers.has('authorization')&&!headers.has('x-goodies-worker-token'));
  return Response.json(rows());
 },now);
 const saved=db.calls.find(call=>call.name==='goodies_publish_usd_htg_quote');check(saved?.args.p_market_rate==='131.2900000000'&&saved.args.p_quote_date==='2026-11-20');
 const text=await result.text();check(result.status===200&&JSON.parse(text).quote_id===id&&!text.includes('synthetic-worker-token'));
});
Deno.test('Refresh retries accept the server unchanged receipt without fabricating another quote',async()=>{
 const db=service({status:'unchanged'});const result=await runUsdHtgRefresh(request(),db,source(),now);
 check(result.status===200&&(await result.json()).status==='unchanged');
});
Deno.test('Provider failures preserve cached quotes and record safe operational outcomes',async()=>{
 for(const status of [429,500,503]){
  const db=service();const result=await runUsdHtgRefresh(request(),db,source({error:'private provider response'},status),now);
  const text=await result.text();check(result.status===503&&!text.includes('private'));
  check(!db.calls.some(call=>call.name==='goodies_publish_usd_htg_quote'));
  check(db.calls.at(-1)?.args.p_code==='provider_unavailable');
 }
});
Deno.test('Malformed, HTML and oversized provider bodies cannot update financial configuration',async()=>{
 for(const response of [new Response('private HTML',{headers:{'content-type':'text/html'}}),new Response('{broken',{headers:{'content-type':'application/json'}}),new Response(' '.repeat(16385),{headers:{'content-type':'application/json'}}),Response.json({rates:{HTG:1}})]){
  const db=service();const result=await runUsdHtgRefresh(request(),db,async()=>response,now);
  check(result.status===503&&!db.calls.some(call=>call.name==='goodies_publish_usd_htg_quote'));
  check(db.calls.at(-1)?.args.p_code==='provider_invalid');
 }
});
Deno.test('Stale source data cannot be made fresh by polling it again',async()=>{
 const db=service();const result=await runUsdHtgRefresh(request(),db,source([{...rows()[0],date:'2026-11-17'}]),now);
 check(result.status===503&&!db.calls.some(call=>call.name==='goodies_publish_usd_htg_quote')&&db.calls.at(-1)?.args.p_code==='source_stale');
});
Deno.test('Database failures and malformed acknowledgements never become a successful refresh',async()=>{
 for(const options of [{writeError:true},{receipt:{}},{receipt:{status:'updated',quote_id:id,quote_date:'2026-11-20',expires_at:'2099-01-01T00:00:00Z'}}]){
  const db=service(options);const result=await runUsdHtgRefresh(request(),db,source(),now);const text=await result.text();
  check(result.status===503&&!text.includes('private')&&db.calls.at(-1)?.args.p_code==='write_unavailable');
 }
});
Deno.test('Authorization or configuration outages fail closed before external requests',async()=>{
 for(const options of [{authError:true},{state:{enabled:'true'}}]){
  const db=service(options);const result=await runUsdHtgRefresh(request(),db,async()=>{throw Error('Must not fetch');},now);
  check(result.status===503&&!db.calls.some(call=>call.name==='goodies_publish_usd_htg_quote'));
 }
});
