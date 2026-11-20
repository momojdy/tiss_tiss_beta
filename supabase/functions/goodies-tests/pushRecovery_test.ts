import {sharedBillHarness,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('scoped notification deployment and recovery restore captured functions without financial writes',async()=>{
 const h=await sharedBillHarness(),{db}=h;
 try{
  await h.root();
  const saved=JSON.parse(await Deno.readTextFile(new URL('../../../docs/goodies/re-audit-20261120/predeployment-functions.json',import.meta.url)));
  for(const entry of saved.functions)await db.exec(entry.definition);
  await db.exec(`create unique index synthetic_push_notifications on public.notifications(id);
   create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
   create schema cron;create table cron.job(jobid bigint primary key,jobname text,command text);
   create function cron.schedule(text,text,text) returns bigint language plpgsql as $$begin insert into cron.job values(1,$1,$3);return 1;end$$;
   create function cron.unschedule(bigint) returns boolean language plpgsql as $$begin delete from cron.job where jobid=$1;return found;end$$;`);
  const before=(await db.query<{n:number}>('select (select count(*) from public.goodies_orders)+(select count(*) from public.wallet_transactions) n')).rows[0].n;
  const bodies=()=>db.query<{name:string;body:string}>("select n.nspname||'.'||p.proname name,p.prosrc body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and p.proname='goodies_guard_content_publication') or (n.nspname='public' and p.proname='goodies_notification_text') order by name");
  const original=(await bodies()).rows;
  for(const file of ['20261120173011_goodies_notification_reviewed_english_fallback.sql','20261120173033_goodies_push_delivery.sql','20261120173052_goodies_push_content_review.sql','20261120174734_goodies_push_message_preferences.sql'])await db.exec(await Deno.readTextFile(new URL('../../migrations/'+file,import.meta.url)));
  check((await db.query<{enabled:boolean}>('select enabled from private.goodies_push_config')).rows[0].enabled===false,'Deployment unexpectedly enabled remote delivery');
  const changed=(await bodies()).rows;check(changed.every(row=>row.body!==original.find(old=>old.name===row.name)?.body),'Target helper changes did not apply');
  await db.exec(await Deno.readTextFile(new URL('../../../docs/goodies/re-audit-20261120/recover-notifications.sql',import.meta.url)));
  check(JSON.stringify((await bodies()).rows)===JSON.stringify(original),'Recovery failed to restore both original function bodies');
  check((await db.query<{n:number}>('select count(*) n from cron.job')).rows[0].n===0,'Recovery left the worker scheduled');
  check((await db.query<{n:number}>('select (select count(*) from public.goodies_orders)+(select count(*) from public.wallet_transactions) n')).rows[0].n===before,'Recovery changed financial records');
  check((await db.query<{n:number}>("select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='goodies_push_registration_status'")).rows[0].n===1,'Recovery broke a paired client contract');
 }finally{await db.close();}
});
