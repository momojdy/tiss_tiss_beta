const assert=require('node:assert/strict');
module.exports=async({sql,race,request})=>{
 const user='90000000-0000-4000-8000-000000000001',session='90000000-0000-4000-8000-000000000002',project='90000000-0000-4000-8000-000000000003';
 sql(`insert into auth.users(id) values('${user}');insert into auth.sessions(id,user_id) values('${session}','${user}');update private.goodies_push_config set enabled=true,eas_project_id='${project}';`);
 const register=`select set_config('request.jwt.claims','{"session_id":"${session}"}',true);select public.goodies_register_push_device('ExponentPushToken[synthetic_pg_token_123456]','android','${project}')`;
 const registrations=await race(register,register,'pushregistration',[user,user]);assert.equal(registrations.filter(r=>r.code===0).length,2,JSON.stringify(registrations));
 assert.equal(Number(sql(`select count(*) from private.wantiss_push_devices where user_id='${user}'`)),1);
 console.log('PASS: concurrent device registration retries preserve one current account/session binding.');
 sql(`insert into public.notifications(user_id,title,body,feature_name,notification_type,destination) values('${user}','Synthetic','Synthetic','Goodies','goodies_order','goodies/orders');`);
 const first=request('select public.goodies_claim_push_deliveries()','pushclaim1',{role:'service_role'});
 let held=false;for(let attempt=0;attempt<60;attempt++){
  if(Number(sql("select count(*) from pg_stat_activity where application_name='goodies_concurrency_pushclaim1' and wait_event='PgSleep'"))>0){held=true;break;}
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.ok(held,'First push worker never held its uncommitted claim');
 const second=request('select public.goodies_claim_push_deliveries()','pushclaim2',{role:'service_role'}),claims=await Promise.all([first,second]);
 for(const row of claims)assert.equal(row.code,0,JSON.stringify(row));
 const arrays=claims.map(row=>row.stdout.trim().split('\n').filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{return null;}}).find(Array.isArray));
 assert.deepEqual(arrays.map(rows=>rows.length).sort(),[0,1]);
 assert.equal(Number(sql("select count(*) from private.goodies_push_deliveries where status='sending'")),1);
 console.log('PASS: overlapping SKIP LOCKED push workers claim a notification once without blocking or duplicate delivery work.');
 sql('update private.goodies_push_config set enabled=false');
};
