import {supabase} from '../../lib/supabase';
/** A retry reuses the same ticket UUID and never creates a second request. */
export async function sendKonsolissSupport(id:string,subject:string,message:string){
 const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw new Error('Authentication required');
 const user=auth.data.user;
 const inserted=await supabase.from('settings_support_requests').insert({id,user_id:user.id,email:user.email??'',subject:'[Konsoliss] '+subject.trim(),message:message.trim()}).select('id,ticket_code').single();
 if(!inserted.error&&inserted.data?.ticket_code)return String(inserted.data.ticket_code);
 // Read-back also handles an ambiguous transport failure after the insert committed.
 const existing=await supabase.from('settings_support_requests').select('id,ticket_code').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(existing.error||!existing.data?.ticket_code)throw new Error('Support did not confirm the request');
 return String(existing.data.ticket_code);
}
export function supportRequestId(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,key=>{const n=Math.floor(Math.random()*16);return (key==='x'?n:(n&3)|8).toString(16);});}
