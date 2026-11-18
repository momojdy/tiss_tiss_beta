begin;
-- Customer/vendor catalog subscriptions need publication membership in addition
-- to their existing SELECT grants and row-level policies.
do $publication$
declare relation_name text;
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach relation_name in array array['goodies_products','goodies_store_schedules','goodies_builder_configs','goodies_order_reviews'] loop
   if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=relation_name and c.relrowsecurity) then
    raise exception 'Goodies realtime requires row-level authorization' using errcode='55000';
   end if;
   if not exists(select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.schemaname='public' and p.tablename=relation_name) then
    execute format('alter publication supabase_realtime add table public.%I',relation_name);
   end if;
  end loop;
 end if;
end $publication$;
commit;
