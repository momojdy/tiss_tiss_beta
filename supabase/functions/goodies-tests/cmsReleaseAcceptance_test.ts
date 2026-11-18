import {sharedBillHarness, sbUsers as u, sbCheck as check} from './sharedBillHarness.ts';
import {resolveGoodiesText} from '../../../src/features/Goodies/i18n/resolveText.ts';
import type {LangCode} from '../../../src/features/Goodies/data/types.ts';

// Actual repository CMS RPCs and the full candidate package; isolated PostgreSQL only.
// This verifies publication semantics, not an installed device or hosted publication.
Deno.test('Goodies FAQ content passes real draft/publication permissions and consumer reload semantics',async t=>{
 const h=await sharedBillHarness(),{db}=h;
 const payload=JSON.parse(await Deno.readTextFile(new URL('../../../docs/goodies/content-acceptance-release/publish-payload.json',import.meta.url)));
 const published=async()=>{await h.as(null,'anon');return (await db.query<{payload:any;version:number}>("select payload,version from public.wantiss_cms_published_content('en') where content_key='goodies.content'")).rows[0];};
 const save=async(value:any)=>(await db.query<{id:string}>("select public.wantiss_admin_save_cms_draft('goodies.content','en',$1::jsonb) id",[JSON.stringify(value)])).rows[0].id;
 try{
  await h.root();
  const lifecycle=await Deno.readTextFile(new URL('../../migrations/20261024111421_wantiss_invite_cms_lifecycle_security.sql',import.meta.url));
  const wrapper=lifecycle.match(/create or replace function public\.wantiss_admin_save_cms_draft\b[\s\S]*?grant execute on function public\.wantiss_admin_save_cms_draft\(text,text,jsonb\) to authenticated;/)?.[0];
  check(!!wrapper,'Actual CMS draft wrapper not found');await db.exec(wrapper!);
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261031191833_protect_goodies_financial_settings_from_cms_publish.sql',import.meta.url)));
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261024110844_fix_cms_archive_visibility.sql',import.meta.url)));
  const archive=lifecycle.match(/create or replace function public\.wantiss_admin_archive_cms_version\b[\s\S]*?grant execute on function public\.wantiss_admin_archive_cms_version\(uuid\) to authenticated;/)?.[0];
  check(!!archive,'Actual CMS archive RPC not found');await db.exec(archive!);
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261118033451_goodies_scoped_staff_permissions.sql',import.meta.url)));
  await db.query("update public.wantiss_cms_content set payload=$1::jsonb where content_key='goodies.content' and locale='en' and status='published'",[JSON.stringify(payload)]);
  let draftId='';
  const edited=structuredClone(payload),label=edited.labels.find((row:any)=>row.id==='lbl.coupons');
  label.t.en={v:'Acceptance draft heading',s:'reviewed',human_reviewed:false};
  edited.fees={...edited.fees,svc:999};
  await t.step('customers and anonymous callers cannot save or publish',async()=>{
   await h.as(u.host);await h.denied("select public.wantiss_admin_save_cms_draft('goodies.content','en',$1::jsonb)",[JSON.stringify(edited)]);
   await h.as(null,'anon');await h.denied("select public.wantiss_admin_save_cms_draft('goodies.content','en',$1::jsonb)",[JSON.stringify(edited)]);
  });
  await t.step('an editor can save a draft but cannot publish or alter financial settings',async()=>{
   await h.root();await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic content editor','staff','active')",[u.alice]);
   await db.query("insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,granted_by,reason) values($1,'content.manage','edit',$2,'Synthetic content acceptance')",[u.alice,u.admin]);
   await h.as(u.alice);draftId=await save(edited);await h.denied('select public.wantiss_admin_publish_cms_version($1)',[draftId]);
   await h.root();const clean=(await db.query<{same:boolean}>("select payload->'fees'=$1::jsonb same from public.wantiss_cms_content where id=$2",[JSON.stringify(payload.fees),draftId])).rows[0];check(clean.same,'Ordinary content save changed financial settings');
  });
  await t.step('draft preview can show edits while a consumer reload still sees published content',async()=>{
   check(resolveGoodiesText({...label.t,en:{v:'Acceptance draft heading',s:'draft'}},'en',true)==='Acceptance draft heading','Draft preview cannot show the edit');
   const current=await published();check(current.payload.labels.find((row:any)=>row.id==='lbl.coupons').t.en.v!=='Acceptance draft heading','Draft leaked before publication');
  });
  await t.step('an authorized publish changes the actual public projection and writes an audit record',async()=>{
   await h.as(u.admin);await db.query('select public.wantiss_admin_publish_cms_version($1)',[draftId]);
   const current=await published();check(current.payload.labels.find((row:any)=>row.id==='lbl.coupons').t.en.v==='Acceptance draft heading','Consumer reload missed the published edit');
   for(const row of current.payload.faq)for(const locale of ['en','fr','es','zh-Hans','ht'] as LangCode[]){
    const expected=locale==='ht'&&row.a.ht?.s!=='reviewed'?row.a.en.v:row.a[locale]?.v;check(resolveGoodiesText(row.a,locale)===expected,'FAQ translation/fallback does not match publication');
   }
   await h.root();check((await db.query('select id from public.wantiss_admin_audit_log where action=\'cms_content_published\' and resource_id=$1',[draftId])).rows.length===1,'Publication audit missing or duplicated');
  });
  await t.step('failed critical publication rolls back and preserves the prior consumer version',async()=>{
   const before=await published(),invalid=structuredClone(payload);invalid.faq[0].a.en.s='draft';
   await h.as(u.admin);const bad=await save(invalid);await h.denied('select public.wantiss_admin_publish_cms_version($1)',[bad]);
   const after=await published();check(after.version===before.version,'Failed publication changed the consumer version');
   check(after.payload.labels.find((row:any)=>row.id==='lbl.coupons').t.en.v==='Acceptance draft heading','Failed publication removed the previous public content');
  });
  await t.step('Goodies CMS uses server acceptance while other-feature authorization stays unchanged',async()=>{
   await h.root();await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status,invited_at,invitation_expires_at) values($1,'Synthetic pending publisher','staff','active',now(),now()+interval '1 day')",[u.bob]);
   for(const [key,level]of [['content.manage','edit'],['content.publish','manage'],['content.archive','manage']])await db.query("insert into public.wantiss_admin_permission_grants(staff_user_id,permission_key,access_level,granted_by,reason) values($1,$2,$3,$4,'Synthetic scoped CMS acceptance')",[u.bob,key,level,u.admin]);
   await db.query("update auth.users set raw_user_meta_data=jsonb_build_object('wantiss_invite_accepted',true) where id=$1",[u.bob]);
   await h.as(u.bob);await h.denied("select public.wantiss_admin_save_cms_draft('goodies.content','en',$1::jsonb)",[JSON.stringify(payload)]);
   await h.denied('select public.wantiss_admin_publish_cms_version($1)',[draftId]);await h.denied('select public.wantiss_admin_archive_cms_version($1)',[draftId]);
   // The newer shared authorization migration also requires server acceptance
   // for other features; the Goodies-specific patch must preserve that denial.
   await h.denied("select public.wantiss_admin_save_cms_draft('other.synthetic.feature','en','{}'::jsonb)");
   await h.root();await db.query("update public.wantiss_admin_staff set invitation_expires_at=null where user_id=$1",[u.bob]);await db.query("update auth.users set raw_user_meta_data='{}'::jsonb where id=$1",[u.bob]);
   await h.as(u.bob);const accepted=await save(payload);check(!!accepted,'Server-accepted staff still depended on editable metadata');
   const other=(await db.query<{id:string}>("select public.wantiss_admin_save_cms_draft('other.synthetic.feature','en','{}'::jsonb) id")).rows[0].id;
   check(!!other,'Accepted staff lost existing other-feature content access');
   await db.query('select public.wantiss_admin_publish_cms_version($1)',[accepted]);await db.query('select public.wantiss_admin_archive_cms_version($1)',[accepted]);
  });
 }finally{await db.close();}
});
