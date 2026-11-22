type Rpc = {rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>};
export const USD_HTG_SOURCE='https://api.frankfurter.dev/v2/rates?base=USD&quotes=HTG';
const DAY=86400000;
class RateError extends Error {constructor(readonly code:string){super('Exchange rate refresh unavailable');}}

export function parseUsdHtgQuote(payload:unknown,now:Date=new Date()){
 if(!Array.isArray(payload)||payload.length!==1)throw new RateError('provider_invalid');
 const row=payload[0];
 if(!row||row.base!=='USD'||row.quote!=='HTG'||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)
  ||typeof row.rate!=='number'||!Number.isFinite(row.rate)||row.rate<=0||row.rate>1e9)throw new RateError('provider_invalid');
 const published=Date.parse(row.date+'T00:00:00.000Z'),current=now.getTime();
 if(!Number.isFinite(published)||!Number.isFinite(current)||new Date(published).toISOString().slice(0,10)!==row.date)throw new RateError('provider_invalid');
 if(published>Math.floor(current/DAY)*DAY||published+4*DAY<=current)throw new RateError('source_stale');
 return {date:row.date,rate:row.rate.toFixed(10),expiresAt:new Date(published+4*DAY).toISOString()};
}

async function readQuote(response:Response):Promise<unknown>{
 if(!response.ok)throw new RateError('provider_unavailable');
 if(!response.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new RateError('provider_invalid');
 const reader=response.body?.getReader();if(!reader)throw new RateError('provider_invalid');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384)throw new RateError('provider_invalid');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new RateError('provider_invalid');}
}

export async function runUsdHtgRefresh(request:Request,service:Rpc,fetcher:typeof fetch=fetch,now:()=>Date=()=>new Date()):Promise<Response>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=request.headers.get('x-goodies-worker-token')||'';
 if(!token||token.length>512)return Response.json({error:'Not authorized'},{status:401});
 try{
  const authorization=await service.rpc('validate_goodies_refund_worker_token',{p_token:token});
  if(authorization.error)throw new RateError('write_unavailable');
  if(authorization.data!==true)return Response.json({error:'Not authorized'},{status:401});
  const state=await service.rpc('goodies_fx_refresh_status',{});
  if(state.error||!state.data||typeof state.data!=='object'||typeof (state.data as {enabled?:unknown}).enabled!=='boolean')throw new RateError('write_unavailable');
  if(!(state.data as {enabled:boolean}).enabled)return Response.json({status:'disabled'});
 }catch{return Response.json({error:'Exchange rates are temporarily unavailable.'},{status:503});}
 try{
  const response=await fetcher(USD_HTG_SOURCE,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
  const quote=parseUsdHtgQuote(await readQuote(response),now());
  const saved=await service.rpc('goodies_publish_usd_htg_quote',{p_quote_date:quote.date,p_market_rate:quote.rate});
  const receipt=saved.data as {status?:unknown;quote_id?:unknown;quote_date?:unknown;expires_at?:unknown}|null;
  if(saved.error||!receipt||!['updated','unchanged'].includes(String(receipt.status))||typeof receipt.quote_id!=='string'
   ||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(receipt.quote_id)
   ||receipt.quote_date!==quote.date||receipt.expires_at==null||Date.parse(String(receipt.expires_at))!==Date.parse(quote.expiresAt))throw new RateError('write_unavailable');
  return Response.json({status:receipt.status,quote_id:receipt.quote_id,quote_date:receipt.quote_date,expires_at:receipt.expires_at});
 }catch(error){
  const code=error instanceof RateError?error.code:'provider_unavailable';
  try{await service.rpc('goodies_record_fx_refresh_failure',{p_code:code});}catch{/* Keep the public error safe when the database is unavailable. */}
  console.error('Goodies exchange rate refresh failed',code);
  return Response.json({error:'Exchange rates are temporarily unavailable.'},{status:503});
 }
}
