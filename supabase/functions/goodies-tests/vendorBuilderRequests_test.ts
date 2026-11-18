import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';

async function harness(){
 const h=await sharedBillHarness();
 if(Deno.env.get('GOODIES_REAUDIT_BASELINE')!=='1') await h.db.exec(await Deno.readTextFile(new URL('../../migrations/20261118033204_goodies_vendor_builder_and_request_contracts.sql',import.meta.url)));
 return h;
}
const configs=[{id:'real-server-builder',name:'Synthetic builder',type:'pizza',base:10,enabled:true,available:true,sizes:[],groups:[]}];

Deno.test('builder writes reject non-manager membership and preserve other merchants',async()=>{
 const h=await harness();try{
  await h.as(u.otherVendor);await h.db.query('select public.goodies_save_builder_configs($1,$2::jsonb)',[u.otherBusiness,JSON.stringify(configs)]);
  await h.as(u.vendor);await h.db.query('select public.goodies_save_builder_configs($1,$2::jsonb)',[u.business,JSON.stringify(configs)]);
  await h.root();await h.db.query("insert into public.business_members(business_id,user_id,role) values($1,$2,'staff')",[u.business,u.alice]);
  await h.as(u.alice);await h.denied("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);
  await h.as(u.otherVendor);await h.denied("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);
  await h.as(u.vendor);check((await h.db.query('select builder_id from public.goodies_builder_configs where business_id=$1',[u.business])).rows.length===1,'Rejected write changed the builder');
  await h.denied("insert into public.goodies_builder_configs(business_id,builder_id,enabled,config) values($1,'forged',true,'{}'::jsonb)",[u.business]);
  await h.db.query("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);await h.root();
  check((await h.db.query('select builder_id from public.goodies_builder_configs where business_id=$1',[u.otherBusiness])).rows.length===1,'Own bulk deletion changed another merchant');
  await h.as(null,'anon');await h.denied("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);
 }finally{await h.db.close();}
});

Deno.test('restricted businesses and restricted merchant accounts cannot alter builders',async()=>{
 const h=await harness();try{
  await h.as(u.vendor);await h.db.query('select public.goodies_save_builder_configs($1,$2::jsonb)',[u.business,JSON.stringify(configs)]);
  await h.root();await h.db.query("update public.businesses set verification='restricted' where id=$1",[u.business]);
  await h.as(u.vendor);await h.denied("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);
  await h.root();await h.db.query("update public.businesses set verification='verified' where id=$1",[u.business]);
  await h.db.query("insert into public.wantiss_admin_account_restrictions(target_user_id,kind,scope,reason,starts_at,created_by) values($1,'Suspension','GoodiesMerchant','Synthetic merchant restriction',now(),$2)",[u.vendor,u.admin]);
  await h.as(u.vendor);await h.denied("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);
  await h.root();await h.db.query("update public.wantiss_admin_account_restrictions set status='lifted' where target_user_id=$1",[u.vendor]);
  await h.as(u.vendor);await h.db.query("select public.goodies_save_builder_configs($1,'[]'::jsonb)",[u.business]);
 }finally{await h.db.close();}
});

Deno.test('ingredient request pagination reaches past 200 with stable ordering and manager-only access',async()=>{
 const h=await harness();try{
  await h.root();await h.db.query("insert into public.goodies_ingredient_requests(business_id,requested_by,name,builder,created_at) select $1,$2,'Synthetic ingredient '||n,'pizza','2026-11-18T00:00:00Z' from generate_series(1,230)n",[u.business,u.vendor]);
  await h.as(u.vendor);const legacy=(await h.db.query('select * from public.goodies_list_ingredient_requests($1)',[u.business])).rows;check(legacy.length===200,'Legacy RPC contract changed');
  const ids:string[]=[];for(let offset=0;offset<250;offset+=50)ids.push(...(await h.db.query<{id:string}>('select * from public.goodies_list_ingredient_requests_page($1,$2,50)',[u.business,offset])).rows.map(x=>x.id));
  check(ids.length===230&&new Set(ids).size===230,'Requests past 200 are truncated or duplicated');check(JSON.stringify(ids)===JSON.stringify([...ids].sort().reverse()),'Equal timestamps make pagination unstable');
  check((await h.db.query('select * from public.goodies_list_ingredient_requests_page($1,-1,1000)',[u.business])).rows.length===100,'Request limit is not bounded');
  for(const user of [u.otherVendor,u.host,u.alice]){await h.as(user);await h.denied('select * from public.goodies_list_ingredient_requests_page($1,0,50)',[u.business]);}
  await h.as(null,'anon');await h.denied('select * from public.goodies_list_ingredient_requests_page($1,0,50)',[u.business]);
 }finally{await h.db.close();}
});

Deno.test('admin ingredient queue reaches every request and filters waiting work before pagination',async()=>{
 const h=await harness();try{
  await h.root();
  const canonical=await Deno.readTextFile(new URL('../../migrations/20261031120000_goodies_ingredient_request_workflow.sql',import.meta.url));
  for(const name of ['wantiss_admin_list_ingredient_requests','wantiss_admin_review_ingredient_request']){
   const definition=canonical.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?end \\$\\$;'))?.[0];
   check(!!definition,'Actual legacy ingredient function is missing');await h.db.exec(definition!);
  }
  // Only the unrelated asset-reference lookup is supplied by this fixture.
  await h.db.exec("create table public.wantiss_cms_assets(asset_key text primary key);revoke all on function public.wantiss_admin_list_ingredient_requests(text),public.wantiss_admin_review_ingredient_request(uuid,text,text,text,text) from public,anon;grant execute on function public.wantiss_admin_list_ingredient_requests(text),public.wantiss_admin_review_ingredient_request(uuid,text,text,text,text) to authenticated;");
  await h.db.exec(await Deno.readTextFile(new URL('../../migrations/20261118033451_goodies_scoped_staff_permissions.sql',import.meta.url)));
  await h.db.query("insert into public.goodies_ingredient_requests(business_id,requested_by,name,builder,status,created_at) select $1,$2,'Synthetic decided ingredient '||n,'pizza','approved','2026-11-18T02:00:00Z' from generate_series(1,230)n",[u.business,u.vendor]);
  await h.db.query("insert into public.goodies_ingredient_requests(business_id,requested_by,name,builder,status,created_at) select $1,$2,'Synthetic waiting ingredient '||n,'pizza',case when n%2=0 then 'needs_info' else 'submitted' end,'2026-11-17T02:00:00Z' from generate_series(1,65)n",[u.business,u.vendor]);
  await h.db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic ingredient viewer','staff','active')",[u.alice]);
  await h.db.query("insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,granted_by,reason) values($1,'goodies.requests','view',$2,'Synthetic ingredient queue acceptance')",[u.alice,u.admin]);
  await h.as(u.alice);
  check((await h.db.query('select * from public.wantiss_admin_list_ingredient_requests()')).rows.length===200,'Legacy ingredient queue contract changed');
  const all:any[]=[];for(let offset=0;offset<300;offset+=50)all.push(...(await h.db.query('select * from public.wantiss_admin_list_ingredient_requests_page($1,50)',[offset])).rows);
  check(all.length===295&&new Set(all.map(row=>row.id)).size===295,'Admin requests after 200 remain truncated or duplicated');
  check(all.slice(0,230).every(row=>row.status==='approved')&&all.slice(230).every(row=>['submitted','needs_info'].includes(row.status)),'Queue order does not preserve dates');
  const waiting=(await h.db.query<{id:string;status:string}>('select * from public.wantiss_admin_list_ingredient_requests_page(0,50,true)')).rows;
  const next=(await h.db.query<{id:string}>('select * from public.wantiss_admin_list_ingredient_requests_page(50,50,true)')).rows;
  check(waiting.length===50&&next.length===15&&!waiting.some(row=>next.some(other=>row.id===other.id)),'Older waiting requests were filtered after the page limit');
  check(waiting.every(row=>['submitted','needs_info'].includes(row.status)),'Waiting queue returned decided work');
  check((await h.db.query('select * from public.wantiss_admin_list_ingredient_requests_page(-1,1000)')).rows.length===100,'Admin queue limit is unbounded');
  await h.denied("select public.wantiss_admin_review_ingredient_request($1,'approved',null,null,null)",[waiting[0].id]);
  for(const user of [u.host,u.vendor,u.otherVendor]){await h.as(user);await h.denied('select * from public.wantiss_admin_list_ingredient_requests_page(0,50)');}
  await h.as(null,'anon');await h.denied('select * from public.wantiss_admin_list_ingredient_requests_page(0,50)');
  await h.root();await h.db.query('update public.wantiss_admin_permission_grants set revoked_at=now() where staff_user_id=$1',[u.alice]);await h.as(u.alice);await h.denied('select * from public.wantiss_admin_list_ingredient_requests_page(0,50)');
  await h.root();await h.db.query('update public.wantiss_admin_permission_grants set revoked_at=null where staff_user_id=$1',[u.alice]);await h.db.query("update public.wantiss_admin_staff set invited_at=now(),invitation_expires_at=now()+interval '1 day' where user_id=$1",[u.alice]);await h.db.query("update auth.users set raw_user_meta_data=jsonb_build_object('wantiss_invite_accepted',true) where id=$1",[u.alice]);await h.as(u.alice);await h.denied('select * from public.wantiss_admin_list_ingredient_requests_page(0,50)');
  await h.root();await h.db.query('update public.wantiss_admin_staff set invitation_expires_at=null where user_id=$1',[u.alice]);await h.db.query("update public.wantiss_admin_permission_grants set access_level='edit' where staff_user_id=$1",[u.alice]);
  await h.as(u.alice);await h.db.query("select public.wantiss_admin_review_ingredient_request($1,'approved',null,null,null)",[waiting[0].id]);
  await h.as(u.vendor);const approved=(await h.db.query<{library_id:string;name:string}>('select * from public.goodies_list_ingredient_requests_page($1,200,100)',[u.business])).rows.find(row=>row.name===all.find(row=>row.id===waiting[0].id)?.name);
  check(!!approved?.library_id,'Approved ingredient request did not reach its vendor');
  check((await h.db.query<{id:string}>('select * from public.goodies_list_library_ingredients()')).rows.some(row=>row.id===approved!.library_id),'Approved ingredient was not published in the real shared library');
 }finally{await h.db.close();}
});
