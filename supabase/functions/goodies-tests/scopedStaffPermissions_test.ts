import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('Goodies delegated staff use server-owned roles without gaining financial or other-feature authority',async t=>{
 const h=await sharedBillHarness(),{db}=h;
 const denied=async(sql:string,args:unknown[]=[],code='42501')=>{
  let actual='';try{await db.query(sql,args);}catch(error){actual=(error as {code:string}).code;}
  check(actual===code,'Expected '+code+' but received '+(actual||'success')+' for '+sql);
 };
 const grant=async(user:string,key:string,level:string)=>{
  await h.root();await db.query("insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,granted_by,reason) values($1,$2,$3,$4,'Synthetic Goodies authorization acceptance')",[user,key,level,u.admin]);
 };
 try{
  await h.root();await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic viewer','staff','active'),($2,'Synthetic operator','staff','active')",[u.alice,u.bob]);
  await grant(u.alice,'goodies.ops','view');await grant(u.bob,'goodies.ops','manage');
  await h.as(u.alice);await denied('select public.goodies_admin_orders_page(0,10)');
  await h.root();await db.exec(await Deno.readTextFile(new URL('../../migrations/20261118033451_goodies_scoped_staff_permissions.sql',import.meta.url)));
  await t.step('a viewer can read Goodies operations but cannot mutate them',async()=>{
   await h.as(u.alice);await db.query('select public.goodies_admin_orders_page(0,10)');await db.query('select * from public.goodies_admin_courier_candidates_page(0,10)');await db.query('select public.goodies_admin_list_reviews(0,10)');
   await denied('select public.goodies_admin_review_product($1,\'approved\',null)',[u.product]);
   await denied('select public.goodies_admin_set_merchant_status($1,false)',[u.business]);
  });
  await t.step('an operations manager can moderate but cannot change fees or resolve money disputes',async()=>{
   await h.as(u.bob);await db.query("select public.goodies_admin_review_product($1,'approved',null)",[u.product]);
   await denied('select public.goodies_admin_update_fee_policy(2,false,true,false,false,array[0,5]::numeric[])');
   await denied('select public.goodies_admin_update_delivery_surcharge_policy(true,1,1)');
   await denied('select public.goodies_admin_update_multi_store_policy(true,1,1,3)');
   await denied("select public.goodies_admin_resolve_delivery_dispute($1,'refund')",[u.product]);
   await denied("select public.goodies_admin_resolve_delivery_dispute($1,'release')",[u.product]);
  });
  await t.step('a separately granted financial approver can update the protected policy',async()=>{
   await grant(u.bob,'finance.approve','manage');await h.as(u.bob);
   await db.query('select public.goodies_admin_update_fee_policy(2,false,true,false,false,array[0,5]::numeric[])');
   await db.query('select public.goodies_admin_update_multi_store_policy(true,1,1,3)');
   await h.root();check((await db.query<{fee:string}>("select payload#>>'{fees,svc}' as fee from public.wantiss_cms_content where status='published'")).rows[0].fee==='2','Authorized fee policy was not persisted');
  });
  await t.step('a Goodies grant cannot operate on another feature or bypass a business restriction',async()=>{
   await h.as(u.bob);await denied('select public.goodies_admin_set_merchant_status($1,false)',[u.otherBusiness],'P0002');
   // This legacy verification RPC intentionally has no authenticated EXECUTE.
   // Preserve that server-only boundary and exercise its scope as its owner.
   await denied("select public.goodies_admin_set_merchant_verification($1,'verified')",[u.otherBusiness]);
   await h.as(u.bob,'postgres');await denied("select public.goodies_admin_set_merchant_verification($1,'verified')",[u.otherBusiness],'P0002');
   await h.root();await db.query("update public.businesses set verification='restricted' where id=$1",[u.business]);
   await h.as(u.bob);await denied('select public.goodies_admin_set_merchant_status($1,true)',[u.business]);await denied("select public.goodies_admin_set_merchant_verification($1,'verified')",[u.business]);
   await h.root();check((await db.query<{verification:string}>('select verification from public.businesses where id=$1',[u.business])).rows[0].verification==='restricted','Ordinary approval lifted a business restriction');
  });
  await t.step('user-editable invitation metadata cannot activate an unaccepted staff invitation',async()=>{
   await h.root();await db.query("update public.wantiss_admin_staff set invited_at=now(),invitation_expires_at=now()+interval '1 day' where user_id=$1",[u.bob]);
   await db.query("update auth.users set raw_user_meta_data=jsonb_build_object('wantiss_invite_accepted',true) where id=$1",[u.bob]);
   await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({user_metadata:{wantiss_invite_accepted:true}})]);
   await h.as(u.bob);await denied('select public.goodies_admin_orders_page(0,10)');await denied('select public.goodies_admin_settlement_queue(0,10)');
   await h.root();await db.query('update public.wantiss_admin_staff set invitation_expires_at=null where user_id=$1',[u.bob]);
   await h.as(u.bob);await db.query('select public.goodies_admin_orders_page(0,10)');
  });
  await t.step('revocation, expiry, suspension, unverified email and anonymous calls deny access',async()=>{
   for(const change of ["update public.wantiss_admin_permission_grants set revoked_at=now() where staff_user_id=$1","update public.wantiss_admin_permission_grants set expires_at=now()-interval '1 minute' where staff_user_id=$1","update public.wantiss_admin_staff set status='suspended' where user_id=$1","update auth.users set email_confirmed_at=null where id=$1"]){
    await h.root();await db.query(change,[u.alice]);await h.as(u.alice);await denied('select public.goodies_admin_orders_page(0,10)');
    await h.root();await db.query('update public.wantiss_admin_permission_grants set revoked_at=null,expires_at=null where staff_user_id=$1',[u.alice]);await db.query("update public.wantiss_admin_staff set status='active' where user_id=$1",[u.alice]);await db.query('update auth.users set email_confirmed_at=now() where id=$1',[u.alice]);
   }
   await h.as(null,'anon');await denied('select public.goodies_admin_orders_page(0,10)');
   await h.root();const acl=(await db.query<{anon:boolean;authenticated:boolean}>("select has_function_privilege('anon','private.goodies_has_staff_permission(text,text)','execute') anon,has_function_privilege('authenticated','private.goodies_has_staff_permission(text,text)','execute') authenticated")).rows[0];check(!acl.anon&&!acl.authenticated,'Private permission helper is directly exposed');
  });
 }finally{await db.close();}
});
