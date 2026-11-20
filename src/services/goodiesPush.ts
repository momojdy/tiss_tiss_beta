import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {AndroidImportance} from 'expo-notifications';
import {Platform} from 'react-native';
import {supabase} from '../lib/supabase';

export const GOODIES_PUSH_RELEASED=process.env.EXPO_PUBLIC_GOODIES_PUSH_RELEASED==='true';
const TOKEN_KEY='wantiss.goodies.push.token';
function withPushTimeout<T>(request:PromiseLike<T>):Promise<T>{
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Notification connection unavailable')),10000);
  Promise.resolve(request).then(value=>{clearTimeout(timer);resolve(value);},()=>{clearTimeout(timer);reject(Error('Notification connection unavailable'));});
 });
}
export type GoodiesPushRegistration='registered'|'disabled'|'unsupported'|'permission-denied'|'unavailable';
export function isGoodiesPushSupported(){return Platform.OS!=='web'&&Constants.executionEnvironment!=='storeClient';}
export async function registerGoodiesPushDevice(current:()=>boolean):Promise<GoodiesPushRegistration>{
 if(!GOODIES_PUSH_RELEASED)return 'disabled';
 if(!isGoodiesPushSupported())return 'unsupported';
 const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
 if(typeof projectId!=='string')return 'unavailable';
 try{
  const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
  const account=sessionData.session?.user.id,access=sessionData.session?.access_token;
  if(sessionError||!account||!access||!current())return 'unavailable';
  const config=await withPushTimeout(supabase.rpc('goodies_push_registration_status'));
  if(config.error)return 'unavailable';
  if(config.data?.enabled!==true)return 'disabled';
  if(config.data.project_id!==projectId||!current())return 'unavailable';
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('goodies',{name:'Goodies',importance:AndroidImportance.HIGH});
  let permission=await Notifications.getPermissionsAsync();
  if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();
  if(permission.status!=='granted')return 'permission-denied';
  const token=(await withPushTimeout(Notifications.getExpoPushTokenAsync({projectId}))).data;
  const latest=await supabase.auth.getSession();
  if(!current()||latest.error||latest.data.session?.user.id!==account)return 'unavailable';
  const saved=await withPushTimeout(supabase.rpc('goodies_register_push_device',{p_token:token,p_platform:Platform.OS,p_project_id:projectId}));
  if(saved.error)return 'unavailable';
  if(saved.data?.status==='disabled')return 'disabled';
  if(saved.data?.status!=='registered')return 'unavailable';
  await AsyncStorage.setItem(TOKEN_KEY,token);
  return 'registered';
 }catch{return 'unavailable';}
}
export async function unregisterGoodiesPushDevice():Promise<void>{
 if(!GOODIES_PUSH_RELEASED)return;
 const token=await AsyncStorage.getItem(TOKEN_KEY);
 if(!token)return;
 const result=await withPushTimeout(supabase.rpc('goodies_unregister_push_device',{p_token:token}));
 if(result.error)throw Error('Device notifications could not be disconnected');
 await AsyncStorage.removeItem(TOKEN_KEY);
}
