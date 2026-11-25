import {useEffect} from 'react';
import {AppState} from 'react-native';
import {supabase} from '../../lib/supabase';

/** Clears sensitive data synchronously when the authenticated identity changes. */
export function useKonsolissRefresh(refresh:()=>Promise<void>,invalidate:()=>void,enabled=true){
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let identity:string|null|undefined;
    const auth=supabase.auth.onAuthStateChange((_event,session)=>{
      const next=session?.user.id??null;
      if(identity===next)return;
      identity=next;
      invalidate();
      clearTimeout(timer);
      if(next)timer=setTimeout(()=>{if(active)void refresh();},0);
    });
    void refresh();
    const app=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
    const interval=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30000);
    const channel=supabase.channel('konsoliss-resource-'+Math.random().toString(36).slice(2))
      .on('postgres_changes',{event:'*',schema:'public',table:'konsoliss_container_assignments'},()=>{void refresh();})
      .on('postgres_changes',{event:'*',schema:'public',table:'konsoliss_containers'},()=>{void refresh();})
      .on('postgres_changes',{event:'*',schema:'public',table:'konsoliss_customer_load_progress'},()=>{void refresh();})
      .subscribe(status=>{if(status==='SUBSCRIBED')void refresh();});
    return ()=>{active=false;invalidate();clearTimeout(timer);clearInterval(interval);app.remove();auth.data.subscription.unsubscribe();void supabase.removeChannel(channel);};
  },[refresh,invalidate,enabled]);
}
