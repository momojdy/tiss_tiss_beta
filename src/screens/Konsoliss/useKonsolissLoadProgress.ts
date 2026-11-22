import {useCallback,useRef,useState} from 'react';
import {useKonsolissRefresh} from './useKonsolissRefresh';
import {supabase} from '../../lib/supabase';

import {parseKonsolissLoadProgress,type KonsolissLoadProgressState} from './konsolissLoadModel';
export {parseKonsolissLoadProgress} from './konsolissLoadModel';
export type {KonsolissLoadProgress,KonsolissLoadProgressState} from './konsolissLoadModel';

export function useKonsolissLoadProgress():KonsolissLoadProgressState{
  const [state,setState]=useState<KonsolissLoadProgressState>({kind:'loading'});
  const requestSequence=useRef(0);
  const refresh=useCallback(async()=>{
    const sequence=++requestSequence.current;
    const commit=(update:()=>void)=>{if(sequence===requestSequence.current)update();};
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user){commit(()=>setState({kind:'unavailable'}));return;}
      const {data,error}=await supabase.from('konsoliss_customer_load_breakdown')
        .select('reserved_cbm,sent_cbm,inbound_to_container_cbm,loaded_cbm,allocated_cbm,at_warehouse_or_in_transit_cbm,reserved_not_sent_cbm,not_allocated_cbm,allocated_percent')
        .eq('user_id',auth.user.id).maybeSingle();
      if(error){commit(()=>setState({kind:'unavailable'}));return;}
      if(!data){commit(()=>setState({kind:'unrecorded'}));return;}
      const progress=parseKonsolissLoadProgress(data);
      commit(()=>setState(progress?{kind:'recorded',progress}:{kind:'unavailable'}));
    }catch{commit(()=>setState({kind:'unavailable'}));}
  },[]);
  const invalidate=useCallback(()=>{requestSequence.current++;setState({kind:'unavailable'});},[]);
  useKonsolissRefresh(refresh,invalidate);
  return state;
}
