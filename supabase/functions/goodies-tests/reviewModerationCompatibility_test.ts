import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';
Deno.test('the merged review contract uses one table, approved public feedback, private access and audited moderation',async()=>{
 const h=await sharedBillHarness(),{db}=h;try{
  await h.enable();const request=await h.create('full'),paid=await h.contribute(request,u.alice,1100),order=paid.order_id;
  await h.as(u.host);await h.denied("select public.goodies_submit_order_review($1,'store',5,'Synthetic feedback')",[order]);await h.root();await db.query("update public.goodies_orders set status='completed' where id=$1",[order]);
  await h.as(u.stranger);await h.denied("select public.goodies_submit_order_review($1,'store',5,'Synthetic forged feedback')",[order]);
  await h.as(u.host);await db.query("select public.goodies_submit_order_review($1,'store',5,'Synthetic verified feedback')",[order]);await db.query("select public.goodies_submit_order_review($1,'store',5,'Synthetic verified feedback')",[order]);
  const review=(await db.query<{id:string;review_status:string}>('select id,review_status from public.goodies_order_reviews where order_id=$1',[order])).rows[0];check(review.review_status==='pending','Submitted review bypassed moderation');
  await h.as(null,'anon');check((await db.query("select * from public.goodies_public_store_reviews('shared-bill-test')")).rows.length===0,'Pending review became public');await h.denied('select * from public.goodies_order_reviews');
  await h.as(u.vendor);await h.denied("select public.goodies_admin_review_order_review($1,'approved',null)",[review.id]);
  await h.as(u.admin);await h.denied("select public.goodies_admin_review_order_review($1,'rejected',' ')",[review.id]);await db.query("select public.goodies_admin_review_order_review($1,'approved',null)",[review.id]);await db.query("select public.goodies_admin_review_order_review($1,'approved',null)",[review.id]);
  await h.as(null,'anon');const visible=(await db.query<Record<string,unknown>>("select * from public.goodies_public_store_reviews('shared-bill-test')")).rows;check(visible.length===1&&Object.keys(visible[0]).every(key=>['rating','comment','created_at','author_label'].includes(key)),'Public review leaked private identity');
  await h.as(u.stranger);check((await db.query('select * from public.goodies_order_reviews where order_id=$1',[order])).rows.length===0,'Another customer read private review');
  await h.as(u.host);await db.query("select public.goodies_submit_order_review($1,'store',5,'Synthetic verified feedback')",[order]);check((await db.query<{review_status:string}>('select review_status from public.goodies_order_reviews where id=$1',[review.id])).rows[0].review_status==='approved','Replay undid moderator decision');
  await db.query("select public.goodies_submit_order_review($1,'store',4,'Synthetic revised feedback')",[order]);check((await db.query<{review_status:string}>('select review_status from public.goodies_order_reviews where id=$1',[review.id])).rows[0].review_status==='pending','Revised feedback bypassed re-review');
  await h.denied("select public.goodies_submit_order_review($1,'courier',5,'Synthetic driver')",[order]);await h.root();await db.query("update public.goodies_orders set order_type='delivery',courier_id=$2,self_delivery=false where id=$1",[order,u.alice]);
  await h.as(u.host);await db.query("select public.goodies_submit_order_review($1,'courier',5,'Synthetic assigned courier')",[order]);
  await h.root();check(Number((await db.query<{n:string}>('select count(*) n from public.goodies_order_reviews where order_id=$1',[order])).rows[0].n)===2,'Duplicate review rows were created');check(Number((await db.query<{n:string}>("select count(*) n from public.wantiss_admin_audit_log where action='goodies_review_approved' and resource_id=$1",[review.id])).rows[0].n)===1,'Moderation replay duplicated audit log');
  await h.as(u.admin);const list=(await db.query<{value:unknown[]}>('select public.goodies_admin_list_reviews(0,1) value')).rows[0].value;check(list.length===1,'Review operations paging ignored limit');await db.query("select public.goodies_admin_review_order_review($1,'rejected','Synthetic reviewed rejection')",[review.id]);
  await h.as(null,'anon');check((await db.query("select * from public.goodies_public_store_reviews('shared-bill-test')")).rows.length===0,'Rejected review stayed public');
 }finally{await db.close();}
});
Deno.test('review moderation migration failure rolls back without altering the existing review contract',async()=>{
 const h=await sharedBillHarness({moderation:false});try{
  const sql=await Deno.readTextFile(new URL('../../migrations/20261117055744_goodies_review_moderation_compatibility.sql',import.meta.url)),before=(await h.db.query<{definition:string}>("select pg_get_functiondef('public.goodies_submit_order_review(uuid,text,integer,text)'::regprocedure) definition")).rows[0].definition;let failed=false;
  try{await h.db.exec(sql.replace('commit;','select public.synthetic_deliberate_review_migration_failure();\ncommit;'));}catch{failed=true;}check(failed,'Injected review migration failure was missed');await h.db.exec('rollback');
  check((await h.db.query<{definition:string}>("select pg_get_functiondef('public.goodies_submit_order_review(uuid,text,integer,text)'::regprocedure) definition")).rows[0].definition===before,'Failed migration altered the existing review API');await h.db.exec(sql);
  check((await h.db.query("select column_name from information_schema.columns where table_schema='public' and table_name='goodies_order_reviews' and column_name='review_status'")).rows.length===1,'Review migration could not be retried');
 }finally{await h.db.close();}
});
