import {sharedBillHarness,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('catalog publication retains RLS and adds only missing Goodies realtime relations',async()=>{
 const h=await sharedBillHarness();try{
  await h.root();await h.db.exec('create publication supabase_realtime for table public.goodies_orders,public.goodies_delivery_assignments');
  const sql=await Deno.readTextFile(new URL('../../migrations/20261118033410_goodies_catalog_realtime.sql',import.meta.url));
  await h.db.exec(sql);
  const tables=(await h.db.query<{tablename:string;rls:boolean}>("select p.tablename,c.relrowsecurity rls from pg_publication_tables p join pg_class c on c.relname=p.tablename join pg_namespace n on n.oid=c.relnamespace and n.nspname=p.schemaname where p.pubname='supabase_realtime' order by p.tablename")).rows;
  const expected=['goodies_orders','goodies_delivery_assignments','goodies_products','goodies_store_schedules','goodies_builder_configs','goodies_order_reviews'].sort();
  check(JSON.stringify(tables.map(x=>x.tablename))===JSON.stringify(expected),'Catalog realtime relations missing or unrelated relations added');check(tables.every(x=>x.rls),'Catalog publication bypassed row-level authorization');
  await h.db.exec(sql);check((await h.db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows.length===6,'Reapplying publication membership duplicated a relation');
 }finally{await h.db.close();}
});
