// Read-only production snapshot, executed exclusively against an in-process synthetic database.
import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
const db=new PGlite();
try {
 await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
 await db.exec(await Deno.readTextFile(new URL('../../../docs/goodies/release-20261112/live-product-moderation.sql',import.meta.url)));
 const admin='30000000-0000-4000-8000-000000000001',business='30000000-0000-4000-8000-000000000002';
 await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[admin]);
 await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic administrator','super_admin','active')",[admin]);
 await db.query("insert into public.businesses(id,name) values($1,'Synthetic merchant')",[business]);
 const product=(await db.query<{id:string}>("insert into public.goodies_products(business_id,name,price,review_status) values($1,'Synthetic product',10,'approved') returning id",[business])).rows[0];
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 await db.exec('set role authenticated');
 await db.query("select public.goodies_admin_review_product($1,'rejected','Synthetic rejection reason')",[product.id]);
 await db.exec('reset role');
 const actual=(await db.query<{review_status:string;review_note:string|null}>('select review_status,review_note from public.goodies_products where id=$1',[product.id])).rows[0];
 if(actual.review_status!=='approved'||actual.review_note!==null)throw new Error('The captured defect was not reproduced; re-investigate the live snapshot.');
 console.log(JSON.stringify({status:'FAIL',area:'Captured live moderation trigger',expected:{review_status:'rejected',review_note:'Synthetic rejection reason'},actual,scope:'Live function captured read-only on 2026-11-12; defect reproduced with synthetic data in PGlite. No production mutation.'}));
}finally{await db.close();}
