import {useEffect,useRef,useState} from 'react';
import {Alert,AppState} from 'react-native';
import * as Notifications from 'expo-notifications';
import {supabase} from '../lib/supabase';
import {label} from '../features/Goodies/content';
import {GOODIES_PUSH_RELEASED,isGoodiesPushSupported,registerGoodiesPushDevice} from './goodiesPush';
import {GoodiesPushDestination,GoodiesPushReference,goodiesPushDestination,parseGoodiesPushReference} from './goodiesPushRouting';

export function useGoodiesPush(authenticated:boolean,active:boolean,onOpen:(destination:GoodiesPushDestination)=>void){
 const [pending,setPending]=useState<GoodiesPushReference|null>(null),[attempt,setAttempt]=useState(0);
 const consumed=useRef(''),registering=useRef(false),open=useRef(onOpen);
 useEffect(()=>{open.current=onOpen;},[onOpen]);
 useEffect(()=>{
  if(!GOODIES_PUSH_RELEASED||!isGoodiesPushSupported())return;
  const accept=(response:Notifications.NotificationResponse|null)=>{
   const reference=parseGoodiesPushReference(response?.notification.request.content.data);
   if(reference&&reference.notification_id!==consumed.current)setPending(reference);
  };
  const listener=Notifications.addNotificationResponseReceivedListener(accept);
  void Notifications.getLastNotificationResponseAsync().then(accept).catch(()=>undefined);
  const foreground=AppState.addEventListener('change',state=>{if(state==='active')setAttempt(n=>n+1);});
  return()=>{listener.remove();foreground.remove();};
 },[]);
 useEffect(()=>{
  if(!authenticated||!active)return;
  let current=true;
  const register=()=>{if(registering.current)return;registering.current=true;void registerGoodiesPushDevice(()=>current).finally(()=>{registering.current=false;});};
  register();
  const listener=AppState.addEventListener('change',state=>{if(state==='active')register();});
  const rotated=GOODIES_PUSH_RELEASED&&isGoodiesPushSupported()?Notifications.addPushTokenListener(register):null;
  return()=>{current=false;listener.remove();rotated?.remove();};
 },[authenticated,active]);
 useEffect(()=>{
  if(!authenticated||!pending)return;
  let current=true;
  void(async()=>{
   try{
    const auth=await supabase.auth.getUser();
    if(auth.error)throw auth.error;
    if(!auth.data.user||!current)return;
    if(auth.data.user.id!==pending.user_id){if(current)setPending(null);return;}
    const row=await supabase.from('notifications').select('id,user_id,feature_name,notification_type,destination,metadata').eq('id',pending.notification_id).eq('user_id',auth.data.user.id).maybeSingle();
    if(row.error)throw row.error;
    const latest=await supabase.auth.getSession();
    if(!current||latest.error||latest.data.session?.user.id!==pending.user_id)return;
    const destination=row.data?goodiesPushDestination(row.data,pending.user_id):null;
    if(!destination)throw Error('Notification unavailable');
    open.current(destination);
    consumed.current=pending.notification_id;setPending(null);
    await Notifications.clearLastNotificationResponseAsync().catch(()=>undefined);
   }catch{
    if(current)Alert.alert('Goodies',label('lbl.notification.openFailed','This update could not be opened. Please try again from your notifications.'));
   }
  })();
  return()=>{current=false;};
 },[authenticated,pending,attempt]);
}
