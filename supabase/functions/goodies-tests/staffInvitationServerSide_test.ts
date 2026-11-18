import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('merged staff invitation hardening preserves RBAC levels and requires database-recorded acceptance',async t=>{
 const h=await sharedBillHarness(),{db}=h;
 const allowed=async(level='view')=>(await db.query<{allowed:boolean}>("select public.wantiss_has_permission('operations',$1) allowed",[level])).rows[0].allowed;
 try{
  await h.root();
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261024111506_accept_verified_staff_invitation.sql',import.meta.url)));
  await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status,invited_at,invitation_expires_at) values($1,'Synthetic invited viewer','staff','active',now(),now()+interval '1 day'),($2,'Synthetic invited administrator','super_admin','active',now(),now()+interval '1 day')",[u.alice,u.bob]);
  await db.query("insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,granted_by,reason) values($1,'operations','view',$2,'Synthetic shared RBAC acceptance')",[u.alice,u.admin]);
  await db.query("update auth.users set raw_user_meta_data=jsonb_build_object('wantiss_invite_accepted',true) where id in ($1,$2)",[u.alice,u.bob]);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({user_metadata:{wantiss_invite_accepted:true}})]);
  await t.step('forged user metadata cannot activate ordinary staff or a pending super admin',async()=>{
   for(const actor of [u.alice,u.bob]){
    await h.as(actor);check(!(await allowed()),'User metadata activated a pending invitation');await h.denied('select public.goodies_admin_orders_page(0,10)');
   }
  });
  await t.step('the actual verified invitation RPC records acceptance and audits it once',async()=>{
   for(const actor of [u.alice,u.bob]){await h.as(actor);await db.query('select public.wantiss_admin_accept_invitation()');check(await allowed(),'Database-accepted invitation did not enable its actual grants');await h.denied('select public.wantiss_admin_accept_invitation()');}
   await h.as(u.bob);await db.query('select public.goodies_admin_orders_page(0,10)');
   await h.root();check((await db.query<{n:number}>("select count(*)::int n from public.wantiss_admin_audit_log where action='staff_invitation_accepted' and actor_user_id in ($1,$2)",[u.alice,u.bob])).rows[0].n===2,'Invitation retry duplicated or lost audit records');
  });
  await t.step('accepted staff retain view/edit/manage grant boundaries without metadata dependence',async()=>{
   await h.root();await db.query("update auth.users set raw_user_meta_data='{}'::jsonb where id=$1",[u.alice]);await db.query("select set_config('request.jwt.claims','{}',false)");
   const levels=['view','edit','manage'];
   for(let index=0;index<levels.length;index++){
    await h.root();await db.query('update public.wantiss_admin_permission_grants set access_level=$2 where staff_user_id=$1',[u.alice,levels[index]]);await h.as(u.alice);
    for(let required=0;required<levels.length;required++)check(await allowed(levels[required])===(required<=index),'Shared RBAC grant level changed');
   }
  });
  await t.step('grant revocation, expiry, suspension and unverified email still revoke shared access',async()=>{
   for(const statement of [
    'update public.wantiss_admin_permission_grants set revoked_at=now() where staff_user_id=$1',
    "update public.wantiss_admin_permission_grants set expires_at=now()-interval '1 minute' where staff_user_id=$1",
    "update public.wantiss_admin_staff set status='suspended' where user_id=$1",
    'update auth.users set email_confirmed_at=null where id=$1',
   ]){
    await h.root();await db.query(statement,[u.alice]);await h.as(u.alice);check(!(await allowed()),'Revoked or invalid staff retained shared access');
    await h.root();await db.query('update public.wantiss_admin_permission_grants set revoked_at=null,expires_at=null where staff_user_id=$1',[u.alice]);await db.query("update public.wantiss_admin_staff set status='active' where user_id=$1",[u.alice]);await db.query('update auth.users set email_confirmed_at=now() where id=$1',[u.alice]);
   }
   await h.root();await db.query("update public.wantiss_admin_staff set invitation_expires_at=now()-interval '1 minute' where user_id=$1",[u.bob]);await h.as(u.bob);check(!(await allowed()),'Expired super admin invitation retained access');await h.denied('select public.goodies_admin_orders_page(0,10)');await h.denied('select public.wantiss_admin_accept_invitation()');
   await h.as(null,'anon');await h.denied('select public.goodies_admin_orders_page(0,10)');
  });
 }finally{await db.close();}
});
