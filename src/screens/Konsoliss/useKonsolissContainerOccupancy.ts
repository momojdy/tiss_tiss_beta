import {useCallback,useRef,useState} from 'react';
import {useKonsolissRefresh} from './useKonsolissRefresh';
import {supabase} from '../../lib/supabase';

import {parseKonsolissOccupancy,type KonsolissContainerOccupancy} from './konsolissOccupancyModel';
export type {KonsolissContainerOccupancy} from './konsolissOccupancyModel';

/** The backend owns container type (40HQ) and usable 68 CBM capacity.
 * Only the selected assigned container is queried. Incomplete measurement
 * coverage returns null rather than estimating the customer's cargo. */
export function useKonsolissContainerOccupancy(containerId:string|null):KonsolissContainerOccupancy|null {
  const [state,setState]=useState<{id:string;value:KonsolissContainerOccupancy|null}|null>(null);
  const requestSequence=useRef(0);
  const reload=useCallback(async()=>{
    const sequence=++requestSequence.current;
    const commit=(update:()=>void)=>{if(sequence===requestSequence.current)update();};
    if(!containerId){commit(()=>setState(null));return;}
    try{
      const {data,error}=await supabase.rpc('konsoliss_container_occupancy',{p_container_id:containerId});
      if(error||!data||typeof data!=='object'){commit(()=>setState({id:containerId,value:null}));return;}
      commit(()=>setState({id:containerId,value:parseKonsolissOccupancy(data,containerId)}));
    }catch{commit(()=>setState({id:containerId,value:null}));}
  },[containerId]);
  const invalidate=useCallback(()=>{requestSequence.current++;setState(null);},[]);
  useKonsolissRefresh(reload,invalidate,containerId!==null);
  // Prevent displaying data from the previously selected container while loading.
  return state?.id===containerId?state.value:null;
}
