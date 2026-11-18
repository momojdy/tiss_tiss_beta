import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
export const sbId=(n:number)=>`a0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const sbUsers={host:sbId(1),alice:sbId(2),bob:sbId(3),stranger:sbId(4),vendor:sbId(5),otherVendor:sbId(6),admin:sbId(7),business:sbId(10),otherBusiness:sbId(11),product:sbId(20)};
export const sbCheck=(value:unknown,message:string)=>{if(!value)throw Error(message);};
export async function sharedBillHarness(options:{integrity?:boolean;moderation?:boolean}={}){
 const db=new PGlite();
 await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
 await db.exec("create unique index synthetic_businesses_id_unique on public.businesses(id); create schema storage;grant usage on schema storage to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;create table public.user_settings(user_id uuid primary key references auth.users(id),language text,notification_preferences jsonb default '{}'::jsonb,updated_at timestamptz default now());create table public.exchange_rates(id uuid primary key default gen_random_uuid(),from_currency text,to_currency text,wantiss_rate numeric,market_rate numeric,is_active boolean,expires_at timestamptz,created_at timestamptz default now());create table public.user_friendships(id uuid primary key default gen_random_uuid(),requester_id uuid,recipient_id uuid,status text);");
 await db.exec(await Deno.readTextFile(new URL('./fixtures/help-pay-live.sql',import.meta.url)));
 await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-live-20261116.sql',import.meta.url)));
 const packageSource=await Deno.readTextFile(new URL('./deploymentPackage_test.ts',import.meta.url));
 const files=[...packageSource.matchAll(/'([0-9]{14}_goodies_[a-z_]+\.sql)'/g)].map(match=>match[1]);
 sbCheck(files.length===15,'Expected the original 15-migration package');
 for(const file of [...files,...(options.integrity===false?[]:['20261113101825_goodies_shared_bill_integrity.sql',...(options.moderation===false?[]:['20261117055744_goodies_review_moderation_compatibility.sql'])])])await db.exec(await Deno.readTextFile(new URL('../../migrations/'+file,import.meta.url)));
 await db.exec(await Deno.readTextFile(new URL('../../migrations/20261117155800_goodies_admin_invitation_accepted_server_side.sql',import.meta.url)));
 for(const user of [sbUsers.host,sbUsers.alice,sbUsers.bob,sbUsers.stranger,sbUsers.vendor,sbUsers.otherVendor,sbUsers.admin]){
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[user]);
  await db.query("insert into public.profiles(id,full_name) values($1,'Synthetic member')",[user]);
  await db.query('insert into public.wallets(user_id,balance) values($1,100)',[user]);
 }
 await db.query("insert into public.businesses(id,name,verification) values($1,'Synthetic Shared Bill merchant','verified'),($2,'Other synthetic merchant','verified')",[sbUsers.business,sbUsers.otherBusiness]);
 await db.query("insert into public.business_members(business_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')",[sbUsers.business,sbUsers.vendor,sbUsers.otherBusiness,sbUsers.otherVendor]);
 await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic admin','super_admin','active')",[sbUsers.admin]);
 await db.query("insert into public.goodies_store_schedules(business_id,store_id,category,is_live,min_order,delivery_fee,delivery_modes,hours) values($1,'shared-bill-test','groceries',true,0,2,array['pickup','delivery'],$2::jsonb)",[sbUsers.business,JSON.stringify(Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>[day,{open:'00:00',close:'00:00',closed:false}])))]);
 await db.query("insert into public.goodies_products(id,business_id,name,price,stock,is_available,review_status) values($1,$2,'Synthetic shared product',10,100,true,'approved')",[sbUsers.product,sbUsers.business]);
 await db.query("insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by) values('goodies.content','en',1,'published',$1::jsonb,$2,$2)",[JSON.stringify({v:5,fees:{svc:1,tips:'0',pay:{Wallet:true,Cash:false}},deals:[]}),sbUsers.admin]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[sbUsers.admin]);await db.exec('set role authenticated');
 await db.query("select public.goodies_admin_review_product($1,'approved',null)",[sbUsers.product]);await db.exec('reset role');await db.exec("select set_config('request.jwt.claim.sub','',false)");
 let sequence=0;
 const as=async(user:string|null,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec('set role '+role);};
 const root=()=>as(null,'postgres');
 const enable=async()=>{await root();await db.exec('update private.goodies_shared_bill_config set wallet_enabled=true');};
 const snapshot=(overrides:Record<string,unknown>={})=>({p_store_id:'shared-bill-test',p_order_type:'pickup',p_scheduled_for:null,p_address:null,p_contact_phone:'50937000000',p_items:[{id:sbUsers.product,q:1,p:10,options:{size:null,drink:false,discount_pct:0}}],p_subtotal:10,p_delivery_fee:0,p_service_fee:1,p_discount:0,p_tip:0,p_total:11,p_notes:null,p_promo_code:null,...overrides});
 const create=async(mode='share',checkout=snapshot(),key='synthetic-checkout-'+(++sequence))=>{
  await as(sbUsers.host);const r=await db.query<{id:string}>('select public.help_pay_create_request($1,$2,$3,$4::jsonb) as id',[mode,Math.round(Number(checkout.p_total)*100),key,JSON.stringify(checkout)]);return r.rows[0].id;
 };
 const contribute=async(request:string,user:string,amount:number,key='synthetic-payment-'+(++sequence))=>{await as(user);return (await db.query<{result:any}>('select public.help_pay_contribute_wallet($1,$2,$3) as result',[request,amount,key])).rows[0].result;};
 const balances=async()=>{await root();return (await db.query<{user_id:string;balance:string}>('select user_id,balance from public.wallets order by user_id')).rows.map(r=>[r.user_id,Number(r.balance)]);};
 const denied=async(sql:string,args:unknown[]=[])=>{let failed=false;try{await db.query(sql,args);}catch{failed=true;}sbCheck(failed,'Unauthorized or invalid operation succeeded: '+sql);};
 return{db,as,root,enable,snapshot,create,contribute,balances,denied};
}
