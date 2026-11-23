import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../../lib/supabase';
import {wantissLocale} from '../../lib/locales';
import {fetchPublishedWantissContent} from '../../lib/wantissCms';
import {KONSOLISS_COPY_DEFAULTS,type KonsolissCopy} from './cms/catalog';
import {resolveHomepage} from './cms/model';
export {KONSOLISS_CONTENT_KEY,KONSOLISS_COPY_DEFAULTS,type KonsolissCopy} from './cms/catalog';

export function useKonsolissHomepageContent(){
 const [state,setState]=useState({copy:{...KONSOLISS_COPY_DEFAULTS},images:{} as Record<string,string>,accountId:null as string|null,locale:'en',status:'loading' as 'loading'|'ready'|'unavailable'});
 const generation=useRef(0);
 useEffect(()=>{
  let hydratedLocale:string|null=null;let active=true;let owner:string|null|undefined;let scheduled:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{
   const request=++generation.current;
   try{
    const auth=await supabase.auth.getUser();if(auth.error)throw auth.error;
    if(!active||request!==generation.current)return;
    owner=auth.data.user?.id??null;
    let locale='en';
    if(owner){const settings=await supabase.from('user_settings').select('language').eq('user_id',owner).maybeSingle();if(settings.error)throw settings.error;locale=wantissLocale(settings.data?.language);}
    if(hydratedLocale!==locale){
     hydratedLocale=locale;
     if(active&&request===generation.current)setState({copy:{...KONSOLISS_COPY_DEFAULTS},images:{},accountId:owner,locale,status:'loading'});
     try{const stored=await AsyncStorage.getItem('konsoliss.copy.'+locale);if(stored&&active&&request===generation.current){const cached=JSON.parse(stored);const resolved=resolveHomepage([{content_key:'konsoliss.content',locale,version:0,payload:{v:1,labels:cached.copy}}],locale);const images=Object.fromEntries(Object.entries(cached.images??{}).filter(([,url])=>typeof url==='string'&&/^https:\/\//.test(url)));setState({copy:resolved.copy,images:images as Record<string,string>,accountId:owner,locale,status:'loading'});}}catch{/* Invalid public cache is ignored. */}
    }
    const result=await fetchPublishedWantissContent(locale);
    const english=locale==='en'?result:await fetchPublishedWantissContent('en');
    if(!active||request!==generation.current)return;
    const resolved=resolveHomepage(locale==='en'?result.content:[...english.content,...result.content],locale);
    const assets=new Map([...english.assets,...result.assets].map(asset=>[asset.asset_key,asset.url]));
    const images=Object.fromEntries(Object.entries(resolved.images).flatMap(([slot,key])=>{const url=assets.get(key);return url&&/^https:\/\//.test(url)?[[slot,url]]:[];}));
    setState({copy:resolved.copy,images,accountId:owner,locale,status:'ready'});
    // Public copy only, keyed by locale. Never cache customer measurements here.
    void AsyncStorage.setItem('konsoliss.copy.'+locale,JSON.stringify({copy:resolved.copy,images})).catch(()=>{});
   }catch{
    if(active&&request===generation.current)setState(previous=>({...previous,status:'unavailable'}));
   }
  };
  const auth=supabase.auth.onAuthStateChange((_event,session)=>{
   const next=session?.user.id??null;if(next===owner)return;owner=next;hydratedLocale=null;generation.current++;
   setState({copy:{...KONSOLISS_COPY_DEFAULTS},images:{},accountId:next,locale:'en',status:'loading'});
   clearTimeout(scheduled);scheduled=setTimeout(()=>{if(active)void load();},0);
  });
  const app=AppState.addEventListener('change',next=>{if(next==='active')void load();});
  const channel=supabase.channel('konsoliss-home-copy').on('postgres_changes',{event:'*',schema:'public',table:'user_settings'},()=>{void load();}).on('postgres_changes',{event:'*',schema:'public',table:'wantiss_cms_content'},()=>{void load();}).subscribe();
  const interval=setInterval(()=>{if(AppState.currentState==='active')void load();},30000);
  void load();
  return()=>{active=false;clearTimeout(scheduled);clearInterval(interval);auth.data.subscription.unsubscribe();app.remove();void supabase.removeChannel(channel);};
 },[]);
 return state;
}
export function useKonsolissCopy():KonsolissCopy{return useKonsolissHomepageContent().copy;}
