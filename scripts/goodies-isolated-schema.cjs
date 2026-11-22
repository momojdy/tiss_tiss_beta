/* Reviewed Goodies-only SQL target for disposable local tests. No connection is opened here.
 * The captured domain fixture deliberately omits unrelated feature foreign keys.
 * managedAuth retains real GoTrue users/sessions and uses observed production JWT helpers.
 * managedStorage preserves the real local Storage schema; otherwise Storage/Cron are test boundaries.
 * This is not a full production reconstruction or backup restore.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
module.exports=function buildGoodiesIsolatedSchema({reaudit=false,sharedBill=reaudit,courierBaseline=false,managedAuth=false,managedStorage=false,cmsLifecycle=false}={}){
const files=[...fs.readFileSync(path.join(root,'supabase/functions/goodies-tests/deploymentPackage_test.ts'),'utf8').matchAll(/'([0-9]{14}_goodies_[a-z_]+\.sql)'/g)].map(match=>match[1]);assert.equal(files.length,15,'Unexpected reviewed migration package');
const storage=managedStorage?'grant usage on schema storage to anon,authenticated,service_role;':"create schema storage;grant usage on schema storage to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;";
let shared="create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';create unique index synthetic_notifications_id on public.notifications(id);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);create unique index synthetic_business_id on public.businesses(id);create table public.user_settings(user_id uuid primary key references auth.users(id),language text,notification_preferences jsonb default '{}'::jsonb,updated_at timestamptz default now());create table public.exchange_rates(id uuid primary key default gen_random_uuid(),from_currency text,to_currency text,wantiss_rate numeric,market_rate numeric,is_active boolean,expires_at timestamptz,created_at timestamptz default now());";
let fixture=fs.readFileSync(path.join(root,'supabase/functions/goodies-tests/fixtures/goodies-core.sql'),'utf8').replace('create role anon; create role authenticated; create role service_role bypassrls;',()=>"do $$declare role_name text;begin foreach role_name in array array['anon','authenticated','service_role'] loop if not exists(select 1 from pg_roles where rolname=role_name) then execute format('create role %I %s',role_name,case when role_name='service_role' then 'bypassrls' else '' end);end if;if exists(select 1 from pg_roles where rolname=role_name and (rolsuper or rolcreaterole or rolcreatedb or rolbypassrls is distinct from (role_name='service_role'))) then raise exception 'Unexpected synthetic role capabilities';end if;end loop;end $$;");
if(managedAuth){
 const users="create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');";
 assert.ok(fixture.includes(users),'Captured Auth fixture changed; reconcile before starting the API test.');
 fixture=fixture.replace('create schema auth;','').replace(users,'');
 fixture=fixture.replace(/create function auth\.(uid|role|jwt)\(\)[\s\S]*?\$\$;/g,'');
 // Actual hosted helper semantics: PostgREST uses one JSON claims GUC in current versions.
 fixture+=`
create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create or replace function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim',true),''),nullif(current_setting('request.jwt.claims',true),''))::jsonb$$;`;
 const sessions='create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);';
 assert.ok(shared.includes(sessions),'Captured session fixture changed.');
 shared=shared.replace(sessions,'');
}
const helpPay=sharedBill?"create table public.user_friendships(id uuid primary key default gen_random_uuid(),requester_id uuid,recipient_id uuid,status text);\n"+fs.readFileSync(path.join(root,'supabase/functions/goodies-tests/fixtures/help-pay-live.sql'),'utf8'):'';
const liveOverlay=sharedBill?fs.readFileSync(path.join(root,'supabase/functions/goodies-tests/fixtures/goodies-live-20261116.sql'),'utf8'):'';
let storagePrerequisites='';
if(managedStorage){
 assert.ok(managedAuth,'Real local Storage requires the real local Auth schema.');
 const roles=fixture.match(/do \$\$declare role_name text;[\s\S]*?end \$\$;/)?.[0];
 const helpers=fixture.match(/create or replace function auth\.uid\(\)[\s\S]*?create or replace function auth\.jwt\(\)[\s\S]*?\$\$;/)?.[0];
 assert.ok(roles&&helpers,'Reconcile local Auth prerequisites before Storage migrations.');
 storagePrerequisites=roles+'\ncreate schema if not exists extensions;grant usage on schema auth,extensions to anon,authenticated,service_role;\n'+helpers;
 fixture=fixture.replace('create schema extensions;','create schema if not exists extensions;');
}
let cmsBaseline='';
const cmsBaselineFiles=['20261031191833_protect_goodies_financial_settings_from_cms_publish.sql','20261024110844_fix_cms_archive_visibility.sql'];
if(cmsLifecycle){
 const lifecycle=fs.readFileSync(path.join(root,'supabase/migrations/20261024111421_wantiss_invite_cms_lifecycle_security.sql'),'utf8');
 const wrapper=lifecycle.match(/create or replace function public\.wantiss_admin_save_cms_draft\b[\s\S]*?grant execute on function public\.wantiss_admin_save_cms_draft\(text,text,jsonb\) to authenticated;/)?.[0];
 const foundation=fs.readFileSync(path.join(root,'supabase/migrations/20261024000600_wantiss_admin_cms_security_foundation.sql'),'utf8');
 const assets=foundation.match(/create table if not exists public\.wantiss_cms_assets[\s\S]*?\n\);/)?.[0];
 assert.ok(wrapper&&assets,'Reconcile the shared CMS baseline before running API acceptance.');
 cmsBaseline='\n'+wrapper+'\n'+cmsBaselineFiles.map(file=>fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')).join('\n')+'\n'+assets+'\nalter table public.wantiss_cms_assets enable row level security;grant select on public.wantiss_cms_assets to service_role;grant execute on function public.wantiss_cms_published_content(text) to service_role;\n';
}
const upstreamFiles=reaudit?['20261117155800_goodies_admin_invitation_accepted_server_side.sql']:[];
const forwardFiles=reaudit?['20261118032703_goodies_courier_mutation_integrity.sql','20261118033204_goodies_vendor_builder_and_request_contracts.sql','20261118033410_goodies_catalog_realtime.sql','20261118033451_goodies_scoped_staff_permissions.sql','20261120061607_goodies_restricted_store_admission.sql','20261120063231_goodies_content_repair_review_coverage.sql','20261120194000_goodies_backfill_verified_delivery_routes.sql','20261120200500_goodies_group_checkout_estimate_usd.sql','20261120214000_goodies_group_store_and_product_admission.sql','20261120222000_goodies_group_expiry_worker.sql','20261120173011_goodies_notification_reviewed_english_fallback.sql','20261120173033_goodies_push_delivery.sql','20261120173052_goodies_push_content_review.sql','20261120174734_goodies_push_message_preferences.sql'].filter(file=>!courierBaseline||!file.endsWith('_goodies_courier_mutation_integrity.sql')):[];
if(reaudit)forwardFiles.push('20261121162019_goodies_card_checkout_attempt_identifier.sql','20261121162035_goodies_preserve_card_refund_queue_leases.sql','20261121162650_goodies_server_owned_stripe_customer_bindings.sql');
if(reaudit)forwardFiles.push('20261122022142_goodies_keep_delivery_proofs_private_when_paused.sql');
const sharedPayments=reaudit?fs.readFileSync(path.join(root,'supabase/functions/goodies-tests/fixtures/goodies-shared-payment-access-20261121.sql'),'utf8'):'';
const bootstrap=fixture+'\n'+storage+shared+'\n'+helpPay+'\n'+liveOverlay+'\n'+files.map(file=>fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')).join('\n')+(sharedBill?'\n'+['20261113101825_goodies_shared_bill_integrity.sql','20261117055744_goodies_review_moderation_compatibility.sql'].map(file=>fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')).join('\n'):'')+'\n'+sharedPayments+'\n'+upstreamFiles.map(file=>fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')).join('\n')+cmsBaseline+(reaudit?'\n'+fs.readFileSync(path.join(root,'supabase/functions/goodies-tests/fixtures/goodies-shared-profile-access-20261117.sql'),'utf8')+'\ncreate publication supabase_realtime for table public.goodies_orders,public.goodies_delivery_assignments;\n'+forwardFiles.map(file=>fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')).join('\n'):'');
return {bootstrap,files,upstreamFiles,forwardFiles,cmsBaselineFiles:cmsLifecycle?cmsBaselineFiles:[],storagePrerequisites};
};
