type Delivery = {id:string;lease_token:string;operation:'send'|'receipt';ticket_id:string|null;token:string;project_id:string;notification_id:string;user_id:string;title:string;body:string};
type Rpc = {rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const codes=new Set(['DeviceNotRegistered','MessageTooBig','MessageRateExceeded','MismatchSenderId','InvalidCredentials']);
/** Transport errors can hide a successful send. Preserve an uncertain outcome
 * for operations instead of risking duplicate alerts. Inbox records remain. */
export async function processPushDelivery(item:Delivery,service:Rpc,fetcher:typeof fetch=fetch,accessToken?:string):Promise<string>{
 const finish=async(outcome:string,code:string|null=null,ticket:string|null=null)=>{
  const result=await service.rpc('goodies_finish_push_delivery',{p_id:item.id,p_lease:item.lease_token,p_outcome:outcome,p_ticket_id:ticket,p_code:code});
  if(result.error||result.data!==true)throw Error('Push delivery receipt could not be saved');
  return outcome;
 };
 const receipt=item.operation==='receipt';
 let response:Response;
 try{
  response=await fetcher(receipt?'https://exp.host/--/api/v2/push/getReceipts':'https://exp.host/--/api/v2/push/send',{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},
   body:JSON.stringify(receipt?{ids:[item.ticket_id]}:{to:item.token,title:item.title,body:item.body,channelId:'goodies',
    data:{feature:'Goodies',notification_id:item.notification_id,user_id:item.user_id},
    collapseId:item.notification_id,tag:item.notification_id,ttl:3600}),signal:AbortSignal.timeout(10000),
  });
 }catch{return finish(receipt?'retry':'uncertain',receipt?'provider_unavailable':'send_outcome_unknown');}
 if(response.status===429||response.status>=500)return finish('retry','provider_unavailable');
 if(!response.ok)return finish('failed','provider_response_invalid');
 let payload:any;
 try{payload=await response.json();}catch{return finish(receipt?'retry':'uncertain',receipt?'provider_response_invalid':'send_outcome_unknown');}
 const result=receipt?payload?.data?.[item.ticket_id||'']:payload?.data;
 if(receipt&&!result)return finish('retry','receipt_pending');
 if(result?.status==='ok'){
  if(receipt)return finish('delivered');
  if(typeof result.id==='string'&&UUID.test(result.id))return finish('ticket',null,result.id);
 }
 if(result?.status==='error'){
  const code=codes.has(result.details?.error)?result.details.error:'provider_response_invalid';
  return finish(code==='MessageRateExceeded'?'retry':'failed',code);
 }
 return finish(receipt?'retry':'uncertain',receipt?'provider_response_invalid':'send_outcome_unknown');
}

export async function runPushWorker(request:Request,service:Rpc,fetcher:typeof fetch=fetch,accessToken?:string):Promise<Response>{
 const json=(body:unknown,status=200)=>Response.json(body,{status});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const token=request.headers.get('x-goodies-worker-token')||'';
 if(!token||token.length>512)return json({error:'Not authorized'},401);
 try{
  const validation=await service.rpc('validate_goodies_refund_worker_token',{p_token:token});
  if(validation.error||validation.data!==true)return json({error:'Not authorized'},401);
  const claimed=await service.rpc('goodies_claim_push_deliveries',{p_limit:25});
  if(claimed.error||!Array.isArray(claimed.data))throw Error('Queue unavailable');
  const summary:Record<string,number>={scanned:claimed.data.length};
  // Five bounded requests at a time keep a 25-item batch inside its lease even
  // when a provider request takes the full ten-second transport timeout.
  for(let start=0;start<claimed.data.length;start+=5){
   const states=await Promise.all(claimed.data.slice(start,start+5).map(row=>processPushDelivery(row,service,fetcher,accessToken)));
   for(const state of states)summary[state]=(summary[state]||0)+1;
  }
  if(summary.scanned)console.info('Goodies push delivery outcomes',JSON.stringify(summary));
  return json(summary);
 }catch{
  // No tokens, recipient details, provider responses or private SQL in logs.
  console.error('Goodies push delivery processing failed');
  return json({error:'Notification delivery is temporarily unavailable.'},503);
 }
}
