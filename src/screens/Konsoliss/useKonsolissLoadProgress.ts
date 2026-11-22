import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {supabase} from '../../lib/supabase';

/** Only verified, server-written cargo volumes. A missing row is not a zero balance. */
export type KonsolissLoadProgress={
  reservedCbm:number;
  sentCbm:number;
  loadedCbm:number;
  sentNotLoadedCbm:number;
  reservedNotSentCbm:number;
  loadedPercent:number;
};
export type KonsolissLoadProgressState=
  | {kind:'loading'}
  | {kind:'unrecorded'}
  | {kind:'unavailable'}
  | {kind:'recorded';progress:KonsolissLoadProgress};

export function parseKonsolissLoadProgress(row:unknown):KonsolissLoadProgress|null{
  if(!row||typeof row!=='object')return null;
  const data=row as Record<string,unknown>;
  const parse=(value:unknown)=>value==null?NaN:Number(value);
  const reservedCbm=parse(data.reserved_cbm);
  const sentCbm=parse(data.sent_cbm);
  const loadedCbm=parse(data.loaded_cbm);
  if(![reservedCbm,sentCbm,loadedCbm].every(Number.isFinite)
    ||reservedCbm<0||reservedCbm>68||sentCbm<0||loadedCbm<0
    ||loadedCbm>sentCbm||loadedCbm>reservedCbm)return null;
  return {reservedCbm,sentCbm,loadedCbm,
    sentNotLoadedCbm:Math.max(0,sentCbm-loadedCbm),
    reservedNotSentCbm:Math.max(0,reservedCbm-sentCbm),
    loadedPercent:reservedCbm>0?Math.round(loadedCbm/reservedCbm*100):0};
}

export function useKonsolissLoadProgress():KonsolissLoadProgressState{
  const [state,setState]=useState<KonsolissLoadProgressState>({kind:'loading'});
  const refresh=useCallback(async()=>{
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user){setState({kind:'unavailable'});return;}
      const {data,error}=await supabase.from('konsoliss_customer_load_progress')
        .select('reserved_cbm,sent_cbm,loaded_cbm')
        .eq('user_id',auth.user.id).maybeSingle();
      if(error){setState({kind:'unavailable'});return;}
      if(!data){setState({kind:'unrecorded'});return;}
      const progress=parseKonsolissLoadProgress(data);
      setState(progress?{kind:'recorded',progress}:{kind:'unavailable'});
    }catch{setState({kind:'unavailable'});}
  },[]);
  useEffect(()=>{
    void refresh();
    const sub=AppState.addEventListener('change',next=>{if(next==='active')void refresh();});
    const interval=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30000);
    return()=>{sub.remove();clearInterval(interval);};
  },[refresh]);
  return state;
}
