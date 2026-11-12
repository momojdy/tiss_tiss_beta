import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('approved Goodies deployment package applies in documented order and preserves final guards',async()=>{
 const db=new PGlite();
 const check=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
 const files=[
 '20261106015226_goodies_courier_scoped_order_read.sql',
 '20261106020705_goodies_private_delivery_proofs.sql',
 '20261106021033_goodies_truthful_dispute_refund_notification.sql',
 '20261106022200_goodies_builder_selection_contract.sql',
 '20261106024100_goodies_admin_restriction_appeals.sql',
 '20261106025454_goodies_product_moderation_enforcement.sql',
 '20261106030151_goodies_role_notifications.sql',
 '20261106030829_goodies_private_proof_rollout.sql',
 '20261106031210_goodies_notification_localization.sql',
 '20261106081225_goodies_reviews_preferences_and_store_link.sql',
 '20261106082226_goodies_admin_operational_pagination.sql',
 '20261106084303_goodies_cms_publication_review_guard.sql',
 '20261106144811_goodies_creole_reviewed_english_fallback.sql',
 '20261107014239_goodies_failure_state_content_review.sql',
 '20261107021612_goodies_vendor_settlement.sql',
 ];
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  // Storage is omitted by the domain-only fixture, but these objects exist on main.
  await db.exec("create schema storage; grant usage on schema storage to anon,authenticated,service_role; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(bucket_id text,name text,primary key(bucket_id,name)); alter table storage.objects enable row level security; grant select,insert,update,delete on storage.objects to authenticated;");
  // Shared baseline objects omitted by the domain-only captured fixture.
  await db.exec("create unique index synthetic_businesses_id_unique on public.businesses(id); create table public.user_settings(user_id uuid primary key references auth.users(id),language text,notification_preferences jsonb default '{}'::jsonb,updated_at timestamptz default now());");
  await db.exec('create table public.exchange_rates(id uuid primary key default gen_random_uuid(),from_currency text,to_currency text,wantiss_rate numeric,market_rate numeric,is_active boolean,expires_at timestamptz,created_at timestamptz default now());');
  for(const file of files){try{await db.exec(await Deno.readTextFile(new URL('../../migrations/'+file,import.meta.url)));}catch(error){throw new Error(file+': '+String(error));}}
  const result=(await db.query<{private_bucket:boolean;reviews_rls:boolean;private_uploads:boolean;fallback_rule:boolean;builder_rule:boolean;dispute_rule:boolean;helper_public:boolean}>(`select
   exists(select 1 from storage.buckets where id='goodies-delivery-proofs' and not public) as private_bucket,
   (select relrowsecurity from pg_class where oid='public.goodies_order_reviews'::regclass) as reviews_rls,
   public.goodies_private_delivery_proof_uploads_enabled() as private_uploads,
   position('Haitian Creole fallback' in pg_get_functiondef('private.goodies_assert_reviewed_text(jsonb)'::regprocedure))>0 as fallback_rule,
   position('Unknown custom builder group' in pg_get_functiondef('public.validate_goodies_builder_line(uuid,text,jsonb)'::regprocedure))>0 as builder_rule,
   position('Your card refund is being processed' in pg_get_functiondef('public.goodies_admin_resolve_delivery_dispute(uuid,text)'::regprocedure))>0 as dispute_rule,
   has_function_privilege('anon','private.goodies_assert_reviewed_text(jsonb)','execute') as helper_public`)).rows[0];
  check(result.private_bucket&&result.reviews_rls&&result.fallback_rule&&result.builder_rule&&result.dispute_rule,'Final package contracts missing');
  check(!result.private_uploads&&!result.helper_public,'Rollout or private helper was incorrectly enabled');
 }finally{await db.close();}
});
