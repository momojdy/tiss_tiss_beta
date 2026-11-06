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

Deno.test('forward CMS guard permits unfinished Creole only with reviewed English and preserves every review state',async()=>{
 const db=new PGlite(),admin='60000000-0000-4000-8000-000000000001';
 const check=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
 const denied=async(work:()=>Promise<unknown>)=>{let failed=false;try{await work();}catch{failed=true;}check(failed,'Unsafe publication accepted');};
 const copy=(ht:any)=>({v:5,labels:[{id:'lbl.checkoutReview',t:{en:{v:'Review order',s:'reviewed'},fr:{v:'Vérifier la commande',s:'reviewed'},es:{v:'Revisar pedido',s:'reviewed'},'zh-Hans':{v:'确认订单',s:'reviewed'},ht}}],fees:{svc:3}});
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  const forward=await Deno.readTextFile(new URL('../../migrations/20261106144811_goodies_creole_reviewed_english_fallback.sql',import.meta.url));
  await denied(()=>db.exec(forward));await db.exec('rollback');
  check((await db.query<{missing:boolean}>("select to_regprocedure('private.goodies_assert_reviewed_text(jsonb)') is null as missing")).rows[0].missing,'Missing baseline must not cause a partial deployment');
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106084303_goodies_cms_publication_review_guard.sql',import.meta.url)));
  await db.exec(forward);
  await db.query('insert into auth.users(id) values($1)',[admin]);
  const row=(await db.query<{id:string}>("insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by) values('goodies.content','en',1,'draft','{}',$1,$1) returning id",[admin])).rows[0];
  const publish=(payload:unknown)=>db.query("update public.wantiss_cms_content set payload=$1,status='published' where id=$2",[JSON.stringify(payload),row.id]);
  for(const status of ['draft','missing',undefined,'unknown']){
   const ht={v:'Synthetic Creole pending human review',...(status?{s:status}:{})},payload=copy(ht);
   await publish(payload);
   const saved=(await db.query<{payload:any}>('select payload from public.wantiss_cms_content where id=$1',[row.id])).rows[0].payload;
   check(JSON.stringify(Object.entries(saved.labels[0].t.ht).sort())===JSON.stringify(Object.entries(ht).sort()),'Publishing must not rewrite or approve Creole');
  }
  for(const english of [undefined,{v:'',s:'reviewed'},{v:'Fallback',s:'draft'},{v:'Fallback',s:'missing'},{v:'Legacy fallback'}, {v:123,s:'reviewed'}]){
   const payload:any=copy({v:'Unreviewed Creole',s:'draft'});payload.labels[0].t.en=english;
   await denied(()=>publish(payload));
  }
  for(const locale of ['fr','es','zh-Hans']){
   const payload:any=copy({v:'Unreviewed Creole',s:'draft'});payload.labels[0].t[locale].s='draft';await denied(()=>publish(payload));
  }
  await publish(copy({v:'Human-approved Creole',s:'reviewed'}));
  const placeholder={...copy({v:'Unreviewed Creole',s:'draft'}),faq:[{q:{en:{v:'Question',s:'reviewed'}},a:{en:{v:'Answer coming soon.',s:'reviewed'}}}]};
  await denied(()=>publish(placeholder));
  const legal={...copy({v:'Unreviewed Creole',s:'draft'}),legal:[{id:'legal.terms',st:'Live',t:{en:{v:'Unapproved policy',s:'draft'}}}]};
  await denied(()=>publish(legal));
  await db.query("update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees,svc}','4') where id=$1",[row.id]);
  const final=(await db.query<{payload:any}>('select payload from public.wantiss_cms_content where id=$1',[row.id])).rows[0].payload;
  check(final.fees.svc===4,'Fee-only updates remain compatible');
  check(final.labels[0].t.ht.s==='reviewed','Failed updates must not change the published review state');
  const acl=(await db.query<{permitted:boolean}>("select has_function_privilege('authenticated','private.goodies_assert_reviewed_text(jsonb)','EXECUTE') as permitted")).rows[0];
  check(!acl.permitted,'Helper must not become an exposed RPC');
 }finally{await db.close();}
});
