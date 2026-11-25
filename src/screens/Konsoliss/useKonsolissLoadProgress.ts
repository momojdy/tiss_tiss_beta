import {useCallback,useRef,useState} from 'react';
import {useKonsolissRefresh} from './useKonsolissRefresh';
import {supabase} from '../../lib/supabase';
import {parseKonsolissHomeSnapshot,type KonsolissLoadProgressState} from './konsolissLoadModel';
export {parseKonsolissLoadProgress} from './konsolissLoadModel';
export type {KonsolissLoadProgress,KonsolissLoadProgressState} from './konsolissLoadModel';

/** One owner-scoped PostgreSQL snapshot; never combine independently timed measurements. */
export function useKonsolissLoadProgress():KonsolissLoadProgressState{
 const [state,setState]=useState<KonsolissLoadProgressState>({kind:'loading',snapshot:null});
 const requestSequence=useRef(0);
 const refresh=useCallback(async()=>{
  const sequence=++requestSequence.current;
  const commit=(next:KonsolissLoadProgressState)=>{if(sequence===requestSequence.current)setState(next);};
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){commit({kind:'unavailable',snapshot:null});return;}
   const {data,error}=await supabase.rpc('konsoliss_homepage_snapshot');
   if(error){commit({kind:'unavailable',snapshot:null});return;}
   commit(parseKonsolissHomeSnapshot(data));
  }catch{commit({kind:'unavailable',snapshot:null});}
 },[]);
 const invalidate=useCallback(()=>{requestSequence.current++;setState({kind:'unavailable',snapshot:null});},[]);
 useKonsolissRefresh(refresh,invalidate);
 return state;
}
