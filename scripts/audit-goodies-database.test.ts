import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

/** Synthetic local replay of captured main definitions. No remote writes. */
Deno.test('CONFIRMED DEFECT: deployed moderation trigger erases an authorized rejection and reason',async()=>{
 const db=new PGlite();const admin='30000000-0000-4000-8000-000000000001',business='30000000-0000-4000-8000-000000000002',product='30000000-0000-4000-8000-000000000003';
 try{
  await db.exec(await Deno.readTextFile(new URL('../supabase/functions/goodies-tests/fixtures/goodies-core.sql',import.meta.url)));
  const live=JSON.parse(await Deno.readTextFile(new URL('../docs/goodies/audit-live-moderation.json',import.meta.url)));
  await db.exec(live.moderation);await db.exec(live.review_product);
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[admin]);
  await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic administrator','super_admin','active')",[admin]);
  await db.query("insert into public.businesses(id,name) values($1,'Synthetic store')",[business]);
  await db.query("insert into public.goodies_store_schedules(business_id,store_id,category,is_live) values($1,'audit-synthetic-store','groceries',true)",[business]);
  await db.query("insert into public.goodies_products(id,business_id,name,price,stock,is_available) values($1,$2,'Synthetic product',1,5,true)",[product,business]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);await db.exec('set role authenticated');
  await db.query("select public.goodies_admin_review_product($1,'rejected','Synthetic rejection reason')",[product]);
  await db.exec('reset role');
  const row=(await db.query<{review_status:string;review_note:string|null;is_available:boolean}>('select review_status,review_note,is_available from public.goodies_products where id=$1',[product])).rows[0];
  if(row.review_status!=='approved'||row.review_note!==null)throw new Error('Captured defect did not reproduce');
  console.log('Confirmed: rejected product becomes approved; rejection reason is erased. Availability alone remains false.');
 }finally{await db.close();}
});
