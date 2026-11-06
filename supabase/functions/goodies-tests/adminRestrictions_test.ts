import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('restriction appeals persist and scoped staff cannot lift permanent Goodies bans',async()=>{
  const db=new PGlite();
  const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const admin=id(1),staff=id(2),customer=id(3),restricted=id(4),unconfirmed=id(5),expired=id(6);
  const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  async function as(uid:string,role='authenticated'){
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec(`set role ${role}`);
  }
  async function denied(call:string,args:unknown[]){try{await db.query(call,args);}catch(error){check((error as {code:string}).code==='42501','Expected permission rejection');return;}throw new Error('Unauthorized restriction action succeeded');}
  try{
    await db.exec(`
      create role anon;create role authenticated;create schema auth;
      grant usage on schema auth to anon,authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create table public.wantiss_admin_staff(user_id uuid primary key,role text,status text,invitation_expires_at timestamptz,invited_at timestamptz);
      create table public.wantiss_admin_permission_grants(staff_user_id uuid,permission_key text,access_level text,revoked_at timestamptz,expires_at timestamptz);
      create table public.wantiss_admin_audit_log(actor_user_id uuid,action text,resource_type text,resource_id text,reason text,before_state jsonb,after_state jsonb);
    `);
    // Execute the existing deployed permission function, including expiry, status
    // and verified-email checks, rather than mocking its authorization result.
    const permissions=await Deno.readTextFile(new URL('../../migrations/20261024111421_wantiss_invite_cms_lifecycle_security.sql',import.meta.url));
    await db.exec(permissions.slice(0,permissions.indexOf('create or replace function public.wantiss_admin_save_cms_draft')));
    const restrictions=await Deno.readTextFile(new URL('../../migrations/20261024112351_server_account_restrictions.sql',import.meta.url));
    await db.exec(restrictions.slice(0,restrictions.indexOf('create or replace function public.wantiss_admin_apply_account_restriction')));
    for(const uid of [admin,staff,customer,restricted,unconfirmed,expired])await db.query('insert into auth.users(id,email_confirmed_at) values($1,$2)',[uid,uid===unconfirmed?null:new Date().toISOString()]);
    for(const [uid,role,status] of [[admin,'super_admin','active'],[staff,'staff','active'],[restricted,'super_admin','revoked'],[unconfirmed,'super_admin','active'],[expired,'staff','active']]){
      await db.query('insert into public.wantiss_admin_staff(user_id,role,status) values($1,$2,$3)',[uid,role,status]);
    }
    await db.query("insert into public.wantiss_admin_permission_grants values($1,'accounts.restrict','manage',null,null),($2,'accounts.restrict','manage',null,now()-interval '1 minute')",[staff,expired]);
    for(const [key,kind] of [[id(10),'Ban'],[id(11),'Suspension']])await db.query("insert into public.wantiss_admin_account_restrictions(id,target_user_id,kind,scope,reason,starts_at,created_by) values($1,$2,$3,'GoodiesCustomer','Synthetic policy test',now(),$4)",[key,customer,kind,admin]);
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106024100_goodies_admin_restriction_appeals.sql',import.meta.url)));
    for(const uid of [customer,restricted,unconfirmed,expired]){
      await as(uid);await denied('select public.wantiss_admin_lift_account_restriction($1,$2)',[id(10),'Synthetic review']);
      await denied('select public.wantiss_admin_record_restriction_appeal($1,$2,$3)',[id(10),'receive','Synthetic appeal']);
    }
    await as(staff);
    await denied('select public.wantiss_admin_lift_account_restriction($1,$2)',[id(10),'Synthetic review']);
    await denied('select public.wantiss_admin_record_restriction_appeal($1,$2,$3)',[id(10),'receive','Synthetic appeal']);
    await db.query('select public.wantiss_admin_lift_account_restriction($1,$2)',[id(11),'Synthetic suspension review']);
    await as(admin);
    await db.query('select public.wantiss_admin_record_restriction_appeal($1,$2,$3)',[id(10),'receive','Synthetic appeal']);
    await db.query('select public.wantiss_admin_record_restriction_appeal($1,$2,$3)',[id(10),'receive','Synthetic appeal retry']);
    check((await db.query<{appeal_status:string}>('select appeal_status from public.wantiss_admin_account_restrictions where id=$1',[id(10)])).rows[0].appeal_status==='open','Appeal survives reloading server state');
    await db.query('select public.wantiss_admin_record_restriction_appeal($1,$2,$3)',[id(10),'uphold','Synthetic review']);
    await db.query('select public.wantiss_admin_record_restriction_appeal($1,$2,$3)',[id(10),'uphold','Synthetic retry']);
    await db.query('select public.wantiss_admin_lift_account_restriction($1,$2)',[id(10),'Synthetic reinstatement']);
    await as('', 'anon');await denied('select public.wantiss_admin_lift_account_restriction($1,$2)',[id(10),'Unauthorized']);
    await db.exec('reset role');
    check((await db.query('select * from public.wantiss_admin_audit_log')).rows.length===4,'Retries must not duplicate appeal audit records');
    check((await db.query<{status:string}>('select status from public.wantiss_admin_account_restrictions where id=$1',[id(10)])).rows[0].status==='lifted','Authorized Super Admin can reinstate the account');
  }finally{await db.close();}
});
