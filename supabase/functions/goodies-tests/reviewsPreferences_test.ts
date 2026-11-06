import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
Deno.test('Goodies reviews enforce completed-order ownership, isolate participants and deduplicate retries',async()=>{
 const db=new PGlite(),id=(n:number)=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [customer,other,vendor,otherVendor,business,otherBusiness,order]=[1,2,3,4,5,6,7].map(id);
 const check=(ok:boolean,msg:string)=>{if(!ok)throw new Error(msg);};
 const as=async(uid:string)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');};
 const denied=async(sql:string,args:unknown[])=>{let failed=false;try{await db.query(sql,args);}catch{failed=true;}check(failed,'Invalid review operation accepted');};
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  await db.exec('create unique index synthetic_businesses_id_unique on public.businesses(id)');
  // The captured core fixture intentionally omits the existing shared settings table.
  await db.exec("create table if not exists public.user_settings(user_id uuid primary key references auth.users(id),notification_preferences jsonb default '{}'::jsonb,updated_at timestamptz default now());");
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106081225_goodies_reviews_preferences_and_store_link.sql',import.meta.url)));
  for(const uid of [customer,other,vendor,otherVendor])await db.query('insert into auth.users(id) values($1)',[uid]);
  await db.query("insert into public.businesses(id,name) values($1,'Synthetic store'),($2,'Other store')",[business,otherBusiness]);
  await db.query("insert into public.business_members(business_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')",[business,vendor,otherBusiness,otherVendor]);
  await db.query("insert into public.goodies_store_schedules(business_id,store_id,is_live) values($1,'review-store',true),($2,'other-store',true)",[business,otherBusiness]);
  await db.query("update public.goodies_store_schedules set hours=$1::jsonb",[JSON.stringify(Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>[d,{open:'00:00',close:'00:00',closed:false}])))]);
  await db.query("insert into public.goodies_orders(id,order_code,business_id,customer_id,store_id,status,order_type,items,subtotal,delivery_fee,service_fee,discount,tip,total,payment_method,payment_status) values($1,'REVIEW-1',$2,$3,'review-store','placed','pickup','[]',1,0,0,0,0,1,'wallet','paid')",[order,business,customer]);
  const submit="select public.goodies_submit_order_review($1,'store',5,'Synthetic review')";
  await as(customer);await denied(submit,[order]);
  await db.exec('reset role');await db.query("update public.goodies_orders set status='completed' where id=$1",[order]);
  await as(other);await denied(submit,[order]);
  await as(vendor);await denied(submit,[order]);
  await as(customer);await db.query(submit,[order]);await db.query(submit,[order]);
  check((await db.query('select * from public.goodies_order_reviews')).rows.length===1,'Retry must update the existing review');
  await denied("select public.goodies_submit_order_review($1,'driver',5,'')",[order]);
  await denied("select public.goodies_submit_order_review($1,'store',6,'')",[order]);
  await denied("update public.goodies_order_reviews set rating=1 where order_id=$1",[order]);
  await as(otherVendor);check((await db.query('select * from public.goodies_order_reviews')).rows.length===0,'Other vendor cannot read private review records');
  const publicRows=(await db.query<{comment:string;is_mine:boolean}>("select * from public.goodies_store_reviews('review-store',0,20)")).rows;
  check(publicRows.length===1&&!publicRows[0].is_mine&&publicRows[0].comment==='Synthetic review','Public store review exposes safe projection');
  await as(vendor);check((await db.query('select * from public.goodies_order_reviews')).rows.length===1,'Owning vendor can view the review');
  await db.query("select public.update_my_business_info($1,'{\"goodies_store_id\":\"review-store\"}')",[business]);
  await denied("select public.update_my_business_info($1,'{\"goodies_store_id\":\"other-store\"}')",[business]);
  await db.exec('reset role');
  await db.query("insert into public.user_settings(user_id,notification_preferences) values($1,'{\"wallet\":false}')",[customer]);
  await as(customer);
  await db.query("select public.goodies_set_notification_preference('orders',false)");
  await db.query("select public.goodies_set_notification_preference('promos',true)");
  await db.exec('reset role');
  const prefs=(await db.query<{notification_preferences:Record<string,boolean>}>('select notification_preferences from public.user_settings where user_id=$1',[customer])).rows[0].notification_preferences;
  check(prefs.goodies_orders===false&&prefs.goodies_promos===true&&prefs.wallet===false,'Preference merges preserve both values');
  const suppressed=await db.query("insert into public.notifications(user_id,title,body,notification_type,feature_name) values($1,'Order','Synthetic','goodies_order','Goodies') returning id",[customer]);
  check(suppressed.rows.length===0,'Disabled customer order notices are suppressed');
 }finally{await db.close();}
});

Deno.test('review migration failure rolls back partial schema changes and can be retried cleanly',async()=>{
 const db=new PGlite();
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  await db.exec("create unique index synthetic_business_id on public.businesses(id);create table public.user_settings(user_id uuid primary key,notification_preferences jsonb,updated_at timestamptz);");
  const sql=await Deno.readTextFile(new URL('../../migrations/20261106081225_goodies_reviews_preferences_and_store_link.sql',import.meta.url));
  let failed=false;try{await db.exec(sql.replace('commit;','select public.synthetic_migration_failure();\ncommit;'));}catch{failed=true;}
  if(!failed)throw new Error('Injected failure did not abort');
  await db.exec('rollback');
  const absent=(await db.query<{name:string|null}>("select to_regclass('public.goodies_order_reviews')::text as name")).rows[0].name;
  if(absent!==null)throw new Error('Partial review schema survived rollback');
  await db.exec(sql);
  const present=(await db.query<{name:string|null}>("select to_regclass('public.goodies_order_reviews')::text as name")).rows[0].name;
  if(!present)throw new Error('Clean migration retry failed');
 }finally{await db.close();}
});
