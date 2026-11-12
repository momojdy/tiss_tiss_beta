import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('vendors can maintain their catalog while administrator rejection remains authoritative',async()=>{
  const db=new PGlite();const id=(n:number)=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const vendor=id(1),otherVendor=id(2),customer=id(3),admin=id(4),business=id(5),otherBusiness=id(6);
  const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  async function as(uid:string,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec(`set role ${role}`);}
  async function denied(sql:string,params:unknown[]){let failed=false;try{await db.query(sql,params);}catch{failed=true;}check(failed,'Unauthorized catalog write succeeded');}
  try{
    await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106025454_goodies_product_moderation_enforcement.sql',import.meta.url)));
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106030151_goodies_role_notifications.sql',import.meta.url)));
    for(const uid of [vendor,otherVendor,customer,admin])await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[uid]);
    await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic administrator','super_admin','active')",[admin]);
    await db.query("insert into public.businesses(id,name) values($1,'Synthetic merchant'),($2,'Other synthetic merchant')",[business,otherBusiness]);
    await db.query("insert into public.business_members(business_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')",[business,vendor,otherBusiness,otherVendor]);
    await db.query("insert into public.goodies_store_schedules(business_id,store_id,category,is_live) values($1,'synthetic-store','groceries',true)",[business]);
    await as(vendor);
    const created=(await db.query<{id:string}>("insert into public.goodies_products(business_id,name,price,stock,is_available,photo_urls) values($1,'Synthetic product',10,10,true,'[]'::jsonb) returning id",[business])).rows[0];
    const own=(await db.query<{review_status:string}>('select review_status from public.goodies_products where id=$1',[created.id])).rows[0];
    check(own.review_status==='pending','New products await review');
    check(!(await db.query<{is_available:boolean}>('select is_available from public.goodies_products where id=$1',[created.id])).rows[0].is_available,'Pending products cannot be offered');
    await db.query("update public.goodies_products set photo_urls='[]'::jsonb where id=$1",[created.id]);
    await db.query('update public.goodies_products set price=12,stock=20 where id=$1',[created.id]);
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({iss:'https://ycbirmgppwavorwudlrv.supabase.co/auth/v1'})]);
    const photo=`https://ycbirmgppwavorwudlrv.supabase.co/storage/v1/object/public/listing-photos/${business}/goodies/products/synthetic.jpg`;
    await db.query('update public.goodies_products set photo_url=$1,photo_urls=$2::jsonb where id=$3',[photo,JSON.stringify([photo]),created.id]);
    await denied('update public.goodies_products set photo_urls=$1::jsonb where id=$2',[JSON.stringify([photo.replace(business,otherBusiness)]),created.id]);
    await denied('update public.goodies_products set photo_urls=$1::jsonb where id=$2',[JSON.stringify(['https://untrusted.example/photo.jpg']),created.id]);

    await denied("update public.goodies_products set review_status='approved' where id=$1",[created.id]);
    await denied("insert into public.goodies_products(business_id,name,price) values($1,'Cross merchant',10)",[otherBusiness]);
    await as(customer);
    check((await db.query('select id from public.goodies_products where id=$1',[created.id])).rows.length===0,'Customers cannot browse pending products');
    check((await db.query('update public.goodies_products set price=0 where id=$1 returning id',[created.id])).rows.length===0,'Customers cannot change merchant pricing');
    await as(admin);await db.query("select public.goodies_admin_review_product($1,'approved','Synthetic approval')",[created.id]);
    await as(customer);check((await db.query('select id from public.goodies_products where id=$1',[created.id])).rows.length===1,'Approval reaches the real customer catalog');
    await as(admin);await db.query("select public.goodies_admin_review_product($1,'rejected','Synthetic rejection')",[created.id]);
    await db.query("select public.goodies_admin_review_product($1,'rejected','Synthetic rejection')",[created.id]);
    await as(vendor);
    let rejected=(await db.query<{review_status:string;review_note:string;is_available:boolean}>('select review_status,review_note,is_available from public.goodies_products where id=$1',[created.id])).rows[0];
    check(rejected.review_status==='rejected' && rejected.review_note==='Synthetic rejection' && !rejected.is_available,'The admin decision and reason survive its trigger');
    await db.query('update public.goodies_products set is_available=true where id=$1',[created.id]);
    rejected=(await db.query<{review_status:string;review_note:string;is_available:boolean}>('select review_status,review_note,is_available from public.goodies_products where id=$1',[created.id])).rows[0];
    check(!rejected.is_available && rejected.review_status==='rejected','Availability changes cannot undo rejection');
    await db.query("update public.goodies_products set description='Revised synthetic description' where id=$1",[created.id]);
    check((await db.query<{review_status:string}>('select review_status from public.goodies_products where id=$1',[created.id])).rows[0].review_status==='pending','Revised content returns to review');
    await db.exec('reset role');
    check((await db.query("select id from public.wantiss_admin_audit_log where action like 'goodies_product_%'")).rows.length===2,'Moderation decisions are audited once despite retries');
    check((await db.query("select id from public.notifications where user_id=$1 and notification_type='goodies_vendor_product_review'",[vendor])).rows.length===2,'Vendor receives one notice for each decision');
    check((await db.query("select id from public.notifications where user_id=$1 and notification_type='goodies_admin_product_submission'",[admin])).rows.length===2,'Admin receives new and revised submissions');
    await db.query("insert into public.wantiss_admin_account_restrictions(target_user_id,kind,scope,reason,starts_at,created_by) values($1,'Suspension','GoodiesMerchant','Synthetic restriction',now(),$2)",[vendor,admin]);
    await as(vendor);
    check((await db.query('update public.goodies_products set stock=99 where id=$1 returning id',[created.id])).rows.length===0,'Restricted merchants cannot alter inventory');
    await denied("insert into public.goodies_products(business_id,name,price) values($1,'Blocked product',10)",[business]);
  }finally{await db.close();}
});
