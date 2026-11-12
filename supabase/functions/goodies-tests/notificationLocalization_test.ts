import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';
import {wantissLocale,WANTISS_LANGUAGES} from '../../../src/lib/locales.ts';

Deno.test('shared Wantiss settings map to the five existing Goodies locales',()=>{
  const expected=['en','fr','ht','es','zh-Hans'];
  if(JSON.stringify(WANTISS_LANGUAGES.map(entry=>wantissLocale(entry.label)))!==JSON.stringify(expected))throw new Error('Account and Goodies language choices differ');
  if(wantissLocale('unknown')!=='en')throw new Error('Invalid locale must fall back to English');
});
Deno.test('notifications use reviewed CMS translations and preserve truthful English fallbacks',async()=>{
  const db=new PGlite();const user='10000000-0000-4000-8000-000000000001';
  const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  try{
    await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
    await db.exec('create table public.user_settings(user_id uuid primary key,language text)');
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106030151_goodies_role_notifications.sql',import.meta.url)));
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106031210_goodies_notification_localization.sql',import.meta.url)));
    await db.query("insert into public.user_settings values($1,'Kreyòl Ayisyen')",[user]);
    const payload={labels:[{id:'lbl.notification.orderAccepted.body',t:{en:{v:'Order {order_code} accepted',s:'reviewed'},ht:{v:'Draft Kreyòl {order_code}',s:'draft'},fr:{v:'Commande {order_code} acceptée',s:'reviewed'}}}]};
    await db.query("insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by) values('goodies.content','en',1,'published',$1::jsonb,$2,$2)",[JSON.stringify(payload),user]);
    const call="select public.goodies_notification_text('lbl.notification.orderAccepted.body','Truthful fallback',$1,$2::jsonb) as body";
    let result=(await db.query<{body:string}>(call,[user,JSON.stringify({order_code:'SYNTHETIC'})])).rows[0].body;
    check(result==='Truthful fallback','Unreviewed Creole must not be sent as approved');
    await db.query("update public.user_settings set language='Français' where user_id=$1",[user]);
    result=(await db.query<{body:string}>(call,[user,JSON.stringify({order_code:'SYNTHETIC'})])).rows[0].body;
    check(result==='Commande SYNTHETIC acceptée','Reviewed account-locale translation is delivered with substitutions');
    await db.query("insert into public.notifications(user_id,title,body,feature_name,notification_type,metadata) values($1,'Goodies order accepted','Truthful fallback','Goodies','goodies_order',$2::jsonb)",[user,JSON.stringify({order_code:'SYNTHETIC'})]);
    check((await db.query<{body:string}>('select body from public.notifications where user_id=$1',[user])).rows[0].body==='Commande SYNTHETIC acceptée','The real notification insert trigger localizes every source of Goodies events');
    await db.exec('set role authenticated');
    let denied=false;try{await db.query(call,[user,'{}']);}catch{denied=true;}
    check(denied,'Clients cannot invoke the privileged localization helper for other users');
  }finally{await db.close();}
});
