-- Read-only postdeployment contract verification. This file never deploys or enables a feature.
begin read only;
with expected(signature) as (values
 ('public.goodies_courier_orders()'),
 ('public.goodies_courier_delivery_details(uuid)'),
 ('public.goodies_delivery_eligible_stores(text[])'),
 ('private.goodies_store_accepts_orders(uuid)'),
 ('private.goodies_assert_store_admission(uuid)'),
 ('public.goodies_private_delivery_proof_uploads_enabled()'),
 ('public.goodies_vendor_settlement_summary(uuid)'),
 ('public.goodies_request_vendor_payout(uuid,numeric,text,uuid,text,numeric)'),
 ('public.help_pay_create_for_account(text,bigint,text,jsonb,uuid)'),
 ('public.help_pay_contribute_for_account(uuid,bigint,text,uuid)'),
 ('public.help_pay_request_for_checkout(text)'),
 ('public.goodies_admin_orders_page(integer,integer)'),
 ('public.wantiss_admin_save_cms_draft(text,text,jsonb)'),
 ('public.wantiss_admin_publish_cms_version(uuid)')
)
select signature,to_regprocedure(signature) is not null as present,
 case when to_regprocedure(signature) is not null then has_function_privilege('anon',to_regprocedure(signature),'execute') end as anon_execute,
 case when to_regprocedure(signature) is not null then has_function_privilege('authenticated',to_regprocedure(signature),'execute') end as authenticated_execute
from expected order by signature;

select id,public,file_size_limit,allowed_mime_types
from storage.buckets where id='goodies-delivery-proofs';

select schemaname,tablename,policyname,roles,cmd
from pg_policies where (schemaname='storage' and tablename='objects' and policyname like '%goodies%')
 or (schemaname='public' and tablename in ('goodies_orders','goodies_delivery_assignments','goodies_order_reviews'))
order by schemaname,tablename,policyname;

select version,name from supabase_migrations.schema_migrations order by version desc limit 25;
select schemaname,tablename from pg_publication_tables where pubname='supabase_realtime' and tablename in ('goodies_store_schedules','goodies_products','goodies_builder_configs','goodies_builder_visuals') order by tablename;

select n.nspname,c.relname,t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and t.tgname in ('aa_goodies_store_publication','aa_goodies_new_order_admission') order by t.tgname;
rollback;
