import {supabase} from '../lib/supabase';
import {isGoodiesOnlyBusiness} from './goodiesSettlement';

async function result<T>(request:PromiseLike<{data:T|null;error:any}>):Promise<T>{const response=await request;if(response.error)throw response.error;return response.data as T;}
const legacy=(name:string,args:Record<string,unknown>)=>result<any[]>(supabase.rpc(name,args));
export async function businessActions(app:any){
 if(!isGoodiesOnlyBusiness(app))return legacy('action_required',{p_business:app.biz.id});
 const [orders,products,messages]=await Promise.all([
  result<any[]>(supabase.from('goodies_orders').select('id').eq('business_id',app.biz.id).eq('status','placed').limit(1)),
  result<any[]>(supabase.from('goodies_products').select('id').eq('business_id',app.biz.id).eq('review_status','rejected').limit(1)),
  result<any[]>(supabase.from('conversations').select('id').eq('business_id',app.biz.id).eq('feature','goodies').eq('status','pending_vendor').limit(1)),
 ]);
 return [...(orders.length?[{label:'Review incoming orders',feature:'goodies',target:'goodiesOrders'}]:[]),...(products.length?[{label:'Review rejected products',feature:'goodies',target:'goodiesProducts'}]:[]),...(messages.length?[{label:'Reply to customer messages',target:'messages'}]:[])];
}
function activityKind(type:string){return /refund/.test(type)?'refund':/payout/.test(type)?'payout':/settlement|commission/.test(type)?'earn':'order';}
export async function businessActivity(app:any,limit=30,before:string|null=null,kind:string|null=null){
 if(!isGoodiesOnlyBusiness(app))return legacy('activity_feed',{p_business:app.biz.id,p_days:120,p_before:before,p_limit:limit,p_kind:kind});
 let request=supabase.from('notifications').select('id,title,created_at,notification_type,metadata').eq('user_id',app.userId).contains('metadata',{business_id:app.biz.id}).gte('created_at',new Date(Date.now()-120*86400000).toISOString()).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit);
 if(before){const [at,id]=before.split('|');if(!Number.isFinite(Date.parse(at))||!/^[\da-f-]{36}$/i.test(id||''))throw Error('Invalid activity cursor');request=request.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`);}
 if(kind==='refund')request=request.like('notification_type','%refund%');
 else if(kind==='payout')request=request.like('notification_type','%payout%');
 else if(kind==='earn')request=request.or('notification_type.like.%settlement%,notification_type.like.%commission%').not('notification_type','like','%payout%');
 else if(kind==='order')request=request.like('notification_type','%order%').not('notification_type','like','%refund%');
 const rows=await result<any[]>(request);
 return rows.map(row=>({id:row.id,title:row.title,kind:activityKind(row.notification_type||''),feature:'goodies',at:row.created_at,cursor:row.created_at+'|'+row.id}));
}
export async function businessSearch(app:any,query:string){
 if(!isGoodiesOnlyBusiness(app))return legacy('search_business',{p_business:app.biz.id,p_q:query});
 const pattern='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
 const [products,orders]=await Promise.all([
  result<any[]>(supabase.from('goodies_products').select('id,name,review_status').eq('business_id',app.biz.id).ilike('name',pattern).order('id').limit(30)),
  result<any[]>(supabase.from('goodies_orders').select('id,order_code,status').eq('business_id',app.biz.id).ilike('order_code',pattern).order('created_at',{ascending:false}).limit(30)),
 ]);
 return [...products.map(row=>({rec_id:row.id,feature:'goodies',scope:'Listings',title:row.name,sub:row.review_status,page:'goodiesProducts'})),...orders.map(row=>({rec_id:row.id,feature:'goodies',scope:'Orders',title:row.order_code,sub:row.status,page:'goodiesOrders'}))];
}
export type BusinessPreferences={push:boolean;email:boolean};
export async function loadBusinessPreferences(user:string):Promise<BusinessPreferences>{
 const row=await result<any>(supabase.from('user_settings').select('notification_preferences').eq('user_id',user).maybeSingle());
 const prefs=row?.notification_preferences||{};return {push:prefs.goodies_vendor_push!==false,email:prefs.goodies_vendor_email===true};
}
export async function saveBusinessPreferences(user:string,prefs:BusinessPreferences){
 const {data,error}=await supabase.auth.getUser();if(error||data.user?.id!==user)throw Error('Session unavailable');
 // Merge atomically on the server, retaining customer and Wallet choices.
 await result(supabase.rpc('goodies_set_vendor_notification_preferences',{p_push:prefs.push,p_email:prefs.email}));
}
export async function requestBusinessData(app:any,kind:'export'|'delete'|'close_business'){
 const {data,error}=await supabase.auth.getUser();if(error||data.user?.id!==app.userId)throw Error('Session unavailable');
 await result(supabase.from('settings_support_requests').insert({user_id:app.userId,email:data.user.email||app.email,subject:kind==='export'?'Business data export request':kind==='close_business'?'Business closure request':'Business account deletion request',message:`Please review my ${kind==='export'?'data export':kind==='close_business'?'business closure':'account deletion'} request. Business reference: ${app.biz.id}`}));
}
