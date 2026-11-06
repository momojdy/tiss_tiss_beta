import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
Deno.test('CMS publication rejects unreviewed critical English/Creole and placeholder FAQs without blocking fee-only updates',async()=>{
 const db=new PGlite(),admin='60000000-0000-4000-8000-000000000001';
 const key='lbl.checkoutReview';
 const payload=(status:string)=>({v:5,labels:[{id:key,t:{en:{v:'Review order',s:'reviewed'},ht:{v:'Synthetic translation requiring a reviewer',s:status}}}],fees:{svc:3}});
 const denied=async(sql:string,args:unknown[])=>{let failed=false;try{await db.query(sql,args);}catch{failed=true;}if(!failed)throw new Error('Unsafe publication accepted');};
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106084303_goodies_cms_publication_review_guard.sql',import.meta.url)));
  await db.query('insert into auth.users(id) values($1)',[admin]);
  const row=(await db.query<{id:string}>("insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by) values('goodies.content','en',1,'draft',$1,$2,$2) returning id",[JSON.stringify(payload('draft')),admin])).rows[0];
  await denied("update public.wantiss_cms_content set status='published' where id=$1",[row.id]);
  const rejected=(await db.query<{status:string;payload:any}>('select status,payload from public.wantiss_cms_content where id=$1',[row.id])).rows[0];
  if(rejected.status!=='draft'||rejected.payload.labels[0].t.ht.s!=='draft')throw new Error('Review metadata was promoted');
  const english=payload('reviewed');english.labels[0].t.en.s='draft';
  await db.query('update public.wantiss_cms_content set payload=$1 where id=$2',[JSON.stringify(english),row.id]);
  await denied("update public.wantiss_cms_content set status='published' where id=$1",[row.id]);
  await db.query("update public.wantiss_cms_content set payload=$1,status='published' where id=$2",[JSON.stringify(payload('reviewed')),row.id]);
  await db.query("update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees,svc}','4') where id=$1",[row.id]);
  const placeholder={...payload('reviewed'),faq:[{q:{en:{v:'Question',s:'reviewed'}},a:{en:{v:'Answer coming soon.',s:'reviewed'}}}]};
  await denied('update public.wantiss_cms_content set payload=$1 where id=$2',[JSON.stringify(placeholder),row.id]);
  const final=(await db.query<{payload:any}>('select payload from public.wantiss_cms_content where id=$1',[row.id])).rows[0].payload;
  if(final.fees.svc!==4)throw new Error('Fee-only update was lost');
 }finally{await db.close();}
});
