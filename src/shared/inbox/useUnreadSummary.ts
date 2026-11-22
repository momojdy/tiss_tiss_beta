import {useSyncExternalStore} from 'react';
import {AppState} from 'react-native';
import {supabase} from '../../lib/supabase';
import {aggregateColor,collectPages,createRequestGate,EMPTY_UNREAD,featureColor,type UnreadSummary} from './unread';

type Snapshot = UnreadSummary & {status:'loading'|'ready'|'unavailable';userId:string|null};
let snapshot:Snapshot={...EMPTY_UNREAD,status:'loading',userId:null};
const listeners=new Set<()=>void>();
const gate=createRequestGate();
let stop:(()=>void)|undefined;
let retryUnread=()=>{};
const emit=(value:Snapshot)=>{snapshot=value;listeners.forEach(listener=>listener());};

async function readSummary(userId:string):Promise<UnreadSummary> {
  const [notices,conversations]=await Promise.all([
    collectPages<{id:string;feature_name:string|null}>(async after=>{
      let query=supabase.from('notifications').select('id,feature_name').eq('user_id',userId).eq('read',false)
        .or('vendor_id.is.null,notification_type.in.(friend_request,friend_accepted)')
        .or('notification_type.is.null,notification_type.not.in.(store_message,goodies_ingredient_request)')
        .order('id').limit(250);
      if(after)query=query.gt('id',after);
      return await query;
    }),
    collectPages<{id:string;feature:string|null;unread_customer:number;business_id:string|null;customer_id:string|null}>(async after=>{
      let query=supabase.from('conversations').select('id,feature,unread_customer,business_id,customer_id')
        .contains('participant_ids',[userId]).order('id').limit(250);
      if(after)query=query.gt('id',after);
      return await query;
    }),
  ]);
  let messages=0;
  const messageColors:string[]=[];
  // Business conversations have a server-maintained per-customer counter.
  // Personal/group conversations use per-message read state, not that shared counter.
  for(const conversation of conversations){
    if(conversation.business_id && conversation.customer_id!==userId)continue;
    let count:number;
    if(conversation.business_id){
      count=Number(conversation.unread_customer);
      if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid unread counter');
    }else{
      const result=await supabase.from('messages').select('id',{count:'exact',head:true})
        .eq('conversation_id',conversation.id).is('read_at',null).neq('sender_id',userId);
      if(result.error||result.count===null)throw result.error??new Error('Unread count unavailable');
      count=result.count;
    }
    messages+=count;
    if(count>0)messageColors.push(featureColor(conversation.feature));
  }
  return {notifications:notices.length,messages,
    notificationColors:[...new Set(notices.map(row=>featureColor(row.feature_name)))],
    messageColors:[...new Set(messageColors)]};
}

function start(){
  let active=true;
  let identity:string|null=null;
  let retry:ReturnType<typeof setTimeout>|undefined;
  let attempts=0;
  const refresh=async()=>{
    const request=gate.begin();
    try{
      const {data,error}=await supabase.auth.getUser();
      if(!active||!gate.current(request))return;
      if(error)throw error;
      identity=data.user?.id??null;
      if(!identity){emit({...EMPTY_UNREAD,status:'ready',userId:null});return;}
      const result=await readSummary(identity);
      if(active&&gate.current(request)){attempts=0;emit({...result,status:'ready',userId:identity});}
    }catch{
      if(active&&gate.current(request)){
        emit({...EMPTY_UNREAD,status:'unavailable',userId:identity});
        clearTimeout(retry);
        if(attempts<3)retry=setTimeout(()=>{void refresh();},1000*2**attempts++);
      }
    }
  };
  retryUnread=()=>{attempts=0;void refresh();};
  const auth=supabase.auth.onAuthStateChange((_event,session)=>{
    const next=session?.user.id??null;
    if(next!==identity){
      identity=next;gate.invalidate();clearTimeout(retry);attempts=0;
      emit({...EMPTY_UNREAD,status:next?'loading':'ready',userId:next});
      // Never await another auth operation inside the Supabase auth callback.
      retry=setTimeout(()=>{void refresh();},0);
    }
  });
  const channel=supabase.channel('shared-customer-unread')
    .on('postgres_changes',{event:'*',schema:'public',table:'notifications'},()=>{void refresh();})
    .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},()=>{void refresh();})
    .on('postgres_changes',{event:'*',schema:'public',table:'messages'},()=>{void refresh();})
    .subscribe(status=>{if(status==='SUBSCRIBED')void refresh();});
  const foreground=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  const interval=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30000);
  void refresh();
  return ()=>{active=false;retryUnread=()=>{};gate.invalidate();clearTimeout(retry);clearInterval(interval);auth.data.subscription.unsubscribe();foreground.remove();void supabase.removeChannel(channel);snapshot={...EMPTY_UNREAD,status:'loading',userId:null};};
}
function subscribe(listener:()=>void){
  listeners.add(listener);
  if(!stop)stop=start();
  return ()=>{listeners.delete(listener);if(!listeners.size){stop?.();stop=undefined;}};
}
export function useUnreadSummary(){
  const value=useSyncExternalStore(subscribe,()=>snapshot,()=>snapshot);
  return {...value,retry:()=>retryUnread(),notificationColor:aggregateColor(value.notificationColors),messageColor:aggregateColor(value.messageColors)};
}
