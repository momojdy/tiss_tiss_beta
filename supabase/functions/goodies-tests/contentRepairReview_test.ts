import {sharedBillHarness,sbUsers as u,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('new checkout and vendor copy obey server review without blocking fees or reviewed-English fallback',async()=>{
 const h=await sharedBillHarness(),{db}=h;
 try{
  await h.root();await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120063231_goodies_content_repair_review_coverage.sql',import.meta.url)));
  const aclBefore=(await db.query<{acl:string}>("select proacl::text as acl from pg_proc where oid='private.goodies_guard_content_publication()'::regprocedure")).rows[0].acl;
  const groupCoverage=await Deno.readTextFile(new URL('../../migrations/20261120223000_goodies_group_content_review_coverage.sql',import.meta.url));
  await db.exec(groupCoverage);await db.exec(groupCoverage);
  const guard=(await db.query<{definition:string;acl:string}>("select pg_get_functiondef(oid) as definition,proacl::text as acl from pg_proc where oid='private.goodies_guard_content_publication()'::regprocedure")).rows[0];
  check(guard.acl===aclBefore,'Review coverage changed function privileges');
  check(guard.definition.split("'lbl.page.store.d8aea5db73'").length===2,'Group-cart review key missing or duplicated');
  for(const [position,key] of ['lbl.checkoutCashUnavailable','lbl.vendor.orders.cashEnabled','lbl.page.store.d8aea5db73'].entries()){
   const text:any={en:{v:'Synthetic critical copy',s:'draft'},fr:{v:'Texte synthétique',s:'reviewed'},es:{v:'Texto sintético',s:'reviewed'},'zh-Hans':{v:'测试文本',s:'reviewed'},ht:{v:'Unreviewed owner draft',s:'draft'}};
   const payload={v:5,labels:[{id:key,t:text}],fees:{svc:1},faq:[]};
   const id=(await db.query<{id:string}>("insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by) values('goodies.content','en',$3,'draft',$1::jsonb,$2,$2) returning id",[JSON.stringify(payload),u.admin,100+position])).rows[0].id;
   await h.denied("update public.wantiss_cms_content set status='published' where id=$1",[id]);
   text.en.s='reviewed';await db.query('update public.wantiss_cms_content set payload=$1::jsonb where id=$2',[JSON.stringify(payload),id]);await db.query("update public.wantiss_cms_content set status='published' where id=$1",[id]);
   await db.query("update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees,svc}','2'::jsonb) where id=$1",[id]);
   const after=(await db.query<{payload:any}>('select payload from public.wantiss_cms_content where id=$1',[id])).rows[0].payload;check(after.fees.svc===2&&after.labels[0].t.ht.s==='draft','Fee update changed review metadata or failed');
   await db.query("update public.wantiss_cms_content set status='archived' where id=$1",[id]);
  }
 }finally{await db.close();}
});
