import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
import {processPushDelivery,runPushWorker} from '../process-goodies-push-notifications/pushProcessor.ts';
const user='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',session='20000000-0000-4000-8000-000000000001',otherSession='20000000-0000-4000-8000-000000000002',project='30000000-0000-4000-8000-000000000001',business='40000000-0000-4000-8000-000000000001';
const token='ExponentPushToken[synthetic_token_123456789]',check=(c:unknown,m:string)=>{if(!c)throw Error(m);};
async function harness(){
 const db=new PGlite();
 await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
 await db.exec(`create unique index synthetic_notifications_id on public.notifications(id);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create table public.user_settings(user_id uuid primary key,language text,notification_preferences jsonb default '{}');
 create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
 insert into auth.users(id) values('${user}'),('${other}');insert into auth.sessions values('${session}','${user}',null),('${otherSession}','${other}',null);`);
 await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120173011_goodies_notification_reviewed_english_fallback.sql',import.meta.url)));
 await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120173033_goodies_push_delivery.sql',import.meta.url)));
 await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120174734_goodies_push_message_preferences.sql',import.meta.url)));
 const actor=async(uid=user,sid=session)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid,JSON.stringify({session_id:sid})]);await db.exec('set role authenticated');};
 const root=()=>db.exec('reset role'),enable=async()=>{await root();await db.query('update private.goodies_push_config set enabled=true,eas_project_id=$1',[project]);};
 const register=async()=> (await db.query<{data:{status:string;device_id:string}}>('select public.goodies_register_push_device($1,\'android\',$2) as data',[token,project])).rows[0].data;
 const notice=async(uid=user,type='goodies_order',destination='goodies/orders',metadata={})=>{await root();return (await db.query<{id:string}>("insert into public.notifications(user_id,title,body,feature_name,notification_type,destination,metadata) values($1,'Private order','Private amount','Goodies',$2,$3,$4) returning id",[uid,type,destination,JSON.stringify(metadata)])).rows[0].id;};
 const claim=async()=>{await root();await db.exec('set role service_role');return (await db.query<{data:any[]}>('select public.goodies_claim_push_deliveries() data')).rows[0].data;};
 const finish=async(row:any,outcome:string,ticket:string|null=null,code:string|null=null)=>(await db.query<{done:boolean}>('select public.goodies_finish_push_delivery($1,$2,$3,$4,$5) done',[row.id,row.lease_token,outcome,ticket,code])).rows[0].done;
 return {db,actor,root,enable,register,notice,claim,finish};
}
async function denied(fn:()=>Promise<unknown>){let failed=false;try{await fn();}catch{failed=true;}check(failed,'Unauthorized operation succeeded');}
Deno.test('push devices require the current Auth session and never grant client queue access',async()=>{
 const h=await harness();try{
  await h.actor();check((await h.register()).status==='disabled','Rollout must default off');
  await h.enable();await h.actor(user,otherSession);await denied(h.register);
  await h.actor();check((await h.register()).status==='registered','Current session registration failed');
  await denied(()=>h.db.query('select * from private.wantiss_push_devices'));
  await denied(()=>h.db.query('select public.goodies_claim_push_deliveries()'));
  await denied(()=>h.db.query('select public.goodies_finish_push_delivery($1,$2,\'delivered\')',[session,session]));
  await h.root();await h.db.exec('set role anon');await denied(h.register);
 }finally{await h.db.close();}
});
Deno.test('push claims are unique, contain no private order text and reject stale worker receipts',async()=>{
 const h=await harness();try{
  await h.enable();await h.actor();await h.register();await h.register();const id=await h.notice();
  const rows=await h.claim();check(rows.length===1,'One device/notification must have exactly one work item');
  check(rows[0].notification_id===id&&rows[0].user_id===user,'Wrong recipient reference');
  check(!JSON.stringify(rows).includes('Private'),'Lock-screen content exposed order details');
  check((await h.claim()).length===0,'An active lease was claimed again');
  const ticket='50000000-0000-4000-8000-000000000001';check(await h.finish(rows[0],'ticket',ticket),'Ticket not recorded');
  check(!await h.finish(rows[0],'ticket',ticket),'Old lease can mutate a finished claim');
  await h.root();await h.db.exec("update private.goodies_push_deliveries set next_attempt_at=now()-interval '1 minute'");
  const receipts=await h.claim();check(receipts.length===1&&receipts[0].operation==='receipt','Ticket was resent instead of checked');
  check(await h.finish(receipts[0],'delivered'),'Receipt could not complete');check((await h.claim()).length===0,'Completed push was retried');
 }finally{await h.db.close();}
});
Deno.test('logout, shared-device account switches and expired sessions suppress queued push',async()=>{
 const h=await harness();try{
  await h.enable();await h.actor();await h.register();await h.notice();
  await h.actor(other,otherSession);await h.register();check((await h.claim()).length===0,'Old account push followed a reassigned token');
  await h.notice(other);await h.actor(other,otherSession);await h.db.query('select public.goodies_unregister_push_device($1)',[token]);
  check((await h.claim()).length===0,'Unregistered device received work');
  await h.actor();await h.register();await h.notice();await h.root();await h.db.query('update auth.sessions set not_after=now()-interval \'1 second\' where id=$1',[session]);
  check((await h.claim()).length===0,'Expired Auth session received work');
  await h.db.exec('reset role');await h.db.query('delete from auth.sessions where id=$1',[session]);
  check((await h.db.query<{n:number}>('select count(*)::int n from private.wantiss_push_devices')).rows[0].n===0,'Revoked session retained its push binding');
 }finally{await h.db.close();}
});
Deno.test('push rechecks vendor membership, courier approval and notification preferences',async()=>{
 const h=await harness();try{
  await h.enable();await h.actor();await h.register();await h.root();
  await h.db.query('insert into public.businesses(id,name,verification) values($1,\'Synthetic\',\'verified\')',[business]);
  await h.db.query('insert into public.business_members(business_id,user_id,role) values($1,$2,\'owner\')',[business,user]);
  await h.notice(user,'goodies_vendor_order','business_goodies_orders',{business_id:business});
  await h.db.query('delete from public.business_members where user_id=$1',[user]);check((await h.claim()).length===0,'Revoked vendor received queued push');
  await h.root();await h.db.query('insert into public.goodies_courier_roster(courier_id,is_approved) values($1,true)',[user]);
  await h.notice(user,'order','goodies_courier');await h.db.query('update public.goodies_courier_roster set is_approved=false where courier_id=$1',[user]);check((await h.claim()).length===0,'Suspended courier received queued push');
  await h.root();await h.db.query('insert into public.user_settings(user_id,notification_preferences) values($1,$2)',[user,JSON.stringify({goodies_orders:false})]);
  await h.notice();await h.notice(user,'goodies_admin_alert','admin/goodies');check((await h.claim()).length===0,'Disabled preference/admin-only notice was sent');
  await h.notice(user,'store_message','storechat',{conversation_id:session});check((await h.claim()).length===1,'Disabling order alerts must not suppress customer store messages');
 }finally{await h.db.close();}
});
Deno.test('expired send leases stay uncertain while receipt leases recover without resending',async()=>{
 const h=await harness();try{
  await h.enable();await h.actor();await h.register();await h.notice();const rows=await h.claim();
  await h.root();await h.db.exec("update private.goodies_push_deliveries set lease_until=now()-interval '1 second'");check((await h.claim()).length===0,'Unknown send outcome was resent');
  await h.root();check((await h.db.query<{status:string}>('select status from private.goodies_push_deliveries where id=$1',[rows[0].id])).rows[0].status==='uncertain','Unknown outcome was fabricated as delivered');
 }finally{await h.db.close();}
});

const item={id:session,lease_token:session,operation:'send' as 'send'|'receipt',ticket_id:null as string|null,token,project_id:project,notification_id:business,user_id:user,title:'Goodies update',body:'Open Wantiss.'};
function processor(){const calls:any[]=[];const service={rpc:(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return Promise.resolve({data:true,error:null});}};return {calls,service};}
Deno.test('Expo push tickets are polled to completion with canonical account references',async()=>{
 const p=processor();let sent:any;const ticket='50000000-0000-4000-8000-000000000001';
 check(await processPushDelivery(item,p.service,async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({data:{status:'ok',id:ticket}});})==='ticket','Successful ticket was not saved');
 check(sent.data.feature==='Goodies'&&sent.data.user_id===user&&sent.data.notification_id===business,'Wrong canonical reference');check(!sent.data.page&&!sent.data.url,'Push can inject navigation');check(sent.collapseId===business&&sent.tag===business,'Provider collapse identity missing');
 check(await processPushDelivery({...item,operation:'receipt',ticket_id:ticket},p.service,async()=>Response.json({data:{[ticket]:{status:'ok'}}}))==='delivered','Provider receipt was not completed');
});
Deno.test('Expo transport failures remain uncertain; explicit rate limits retry safely',async()=>{
 for(const fetcher of [async()=>{throw Error('private token');},async()=>new Response('{invalid',{status:200})]){
  const p=processor();check(await processPushDelivery(item,p.service,fetcher)==='uncertain','Lost/malformed send response must not fabricate success or blindly retry');
 }
 const p=processor();check(await processPushDelivery(item,p.service,async()=>new Response('',{status:429}))==='retry','Known rate limit should back off');
 check(await processPushDelivery(item,p.service,async()=>Response.json({data:{status:'error',details:{error:'DeviceNotRegistered'}}}))==='failed','Invalid device should fail');check(p.calls.at(-1).args.p_code==='DeviceNotRegistered','Invalid token was not disabled');
 check(await processPushDelivery({...item,operation:'receipt',ticket_id:session},p.service,async()=>Response.json({data:{}}))==='retry','Missing receipt should be checked later without resending');
});
Deno.test('push worker authenticates before claiming and never exposes provider or SQL errors',async()=>{
 let claims=0;const service={rpc:(name:string)=>{if(name==='validate_goodies_refund_worker_token')return Promise.resolve({data:false,error:null});claims++;return Promise.resolve({data:null,error:Error('private SQL credentials')});}};
 let result=await runPushWorker(new Request('https://worker.test',{method:'POST',headers:{'x-goodies-worker-token':'invalid'}}),service);
 check(result.status===401&&claims===0,'Unauthenticated worker claimed deliveries');
 const valid={rpc:(name:string)=>Promise.resolve(name==='validate_goodies_refund_worker_token'?{data:true,error:null}:{data:null,error:Error('private SQL credentials')})};
 result=await runPushWorker(new Request('https://worker.test',{method:'POST',headers:{'x-goodies-worker-token':'synthetic'}}),valid);
 check(result.status===503&&!/private|SQL|credentials/.test(await result.text()),'Worker exposed a private server error');
});
Deno.test('push worker bounds provider concurrency and completes all claimed receipts',async()=>{
 let active=0,peak=0,completed=0;
 const service={rpc:(name:string)=>Promise.resolve({data:name==='goodies_claim_push_deliveries'?Array.from({length:12},(_,i)=>({...item,id:'60000000-0000-4000-8000-'+String(i).padStart(12,'0')})):true,error:null})};
 const result=await runPushWorker(new Request('https://worker.test',{method:'POST',headers:{'x-goodies-worker-token':'synthetic'}}),service,async()=>{
  active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;completed++;return Response.json({data:{status:'ok',id:session}});
 });
 check(result.status===200&&completed===12&&peak===5,'Worker did not respect the five-request batch bound');
 const summary=await result.json();check(summary.ticket===12,'Not every claimed delivery saved its ticket');
});
