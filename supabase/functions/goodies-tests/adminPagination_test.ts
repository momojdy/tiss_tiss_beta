import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
Deno.test('admin paging retains access checks and reaches records beyond legacy caps',async()=>{
 const db=new PGlite(),id=(n:number)=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const admin=id(1),customer=id(2),business=id(3);
 const check=(ok:boolean,msg:string)=>{if(!ok)throw new Error(msg);};
 const as=async(uid:string,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec(`set role ${role}`);};
 const denied=async(sql:string)=>{let rejected=false;try{await db.exec(sql);}catch{rejected=true;}check(rejected,'Unauthorized admin page read');};
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106082226_goodies_admin_operational_pagination.sql',import.meta.url)));
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())',[admin,customer]);
  await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic administrator','super_admin','active')",[admin]);
  for(let n=10;n<215;n++) {await db.query('insert into auth.users(id) values($1)',[id(n)]);await db.query("insert into public.profiles(id,full_name) values($1,'Same synthetic name')",[id(n)]);}
  await db.query("insert into public.businesses(id,name) values($1,'Synthetic store')",[business]);
  await db.query("insert into public.goodies_store_schedules(business_id,store_id,is_live,hours) values($1,'page-store',true,$2)",[business,JSON.stringify(Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>[d,{open:'00:00',close:'00:00',closed:false}])))]);
  await db.query("insert into public.goodies_orders(order_code,business_id,customer_id,store_id,status,order_type,items,subtotal,delivery_fee,service_fee,discount,tip,total,payment_method,payment_status) select 'PAGE-'||i,$1,$2,'page-store','placed','pickup','[]',1,0,0,0,0,1,'wallet','paid' from generate_series(1,151)i",[business,customer]);
  await as(customer);await denied('select public.goodies_admin_orders_page(0,100)');await denied('select * from public.goodies_admin_courier_candidates_page(0,100)');
  await as(admin,'anon');await denied('select public.goodies_admin_orders_page(0,100)');
  await as(admin);
  const first=(await db.query<{courier_id:string}>('select * from public.goodies_admin_courier_candidates_page(0,100)')).rows;
  const second=(await db.query<{courier_id:string}>('select * from public.goodies_admin_courier_candidates_page(100,100)')).rows;
  const third=(await db.query('select * from public.goodies_admin_courier_candidates_page(200,100)')).rows;
  check(first.length===100&&second.length===100&&third.length===5,'All courier candidates can be paged');
  check(!first.some(r=>second.some(x=>x.courier_id===r.courier_id)),'Tie-breaking avoids overlapping pages');
  const page=(await db.query<{rows:any[]}>('select public.goodies_admin_orders_page(100,100) as rows')).rows[0].rows;
  check(page.length===51,'Orders beyond the old first 150 remain reachable');
  await db.exec('reset role');await db.query("update public.wantiss_admin_staff set status='suspended' where user_id=$1",[admin]);
  await as(admin);await denied('select public.goodies_admin_orders_page(0,100)');
 }finally{await db.close();}
});
