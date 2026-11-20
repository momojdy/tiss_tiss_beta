import {goodiesBusinessNotificationTarget} from '../features/Goodies/notifications';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type GoodiesPushReference={feature:'Goodies';notification_id:string;user_id:string};
export type GoodiesPushDestination=
 |{mode:'buyer';route:'orders'|'notifications'|'messages';conversationId?:string}
 |{mode:'vendor';notice:Record<string,any>}
 |{mode:'courier'};
export function parseGoodiesPushReference(value:unknown):GoodiesPushReference|null{
 if(!value||typeof value!=='object')return null;
 const data=value as Record<string,unknown>;
 if(data.feature!=='Goodies'||typeof data.notification_id!=='string'||!UUID.test(data.notification_id)||typeof data.user_id!=='string'||!UUID.test(data.user_id))return null;
 return {feature:'Goodies',notification_id:data.notification_id,user_id:data.user_id};
}
/** Only a notification fetched under the current account's RLS can choose a
 * destination. The operating-system payload never supplies a page or URL. */
export function goodiesPushDestination(notice:Record<string,any>,userId:string):GoodiesPushDestination|null{
 if(notice.user_id!==userId||String(notice.feature_name||'').toLowerCase()!=='goodies')return null;
 const type=String(notice.notification_type||''),destination=String(notice.destination||'');
 if(type.startsWith('goodies_admin_')||destination.startsWith('admin'))return null;
 if(destination==='goodies_courier'||type.startsWith('goodies_courier_'))return {mode:'courier'};
 if(destination.startsWith('business_')||type.startsWith('goodies_vendor_')||type.startsWith('goodies_ingredient_')||(type==='store_message'&&notice.metadata?.business_id)){
  const business=notice.metadata?.business_id;
  if(typeof business!=='string'||!UUID.test(business)||!goodiesBusinessNotificationTarget(notice,business))return null;
  return {mode:'vendor',notice};
 }
 if(type==='store_message'&&typeof notice.metadata?.conversation_id==='string'&&UUID.test(notice.metadata.conversation_id))return {mode:'buyer',route:'messages',conversationId:notice.metadata.conversation_id};
 if(notice.metadata?.order_id||notice.metadata?.order||destination==='goodies/orders'||type==='goodies_order'||type==='goodies_customer_order')return {mode:'buyer',route:'orders'};
 return {mode:'buyer',route:'notifications'};
}
