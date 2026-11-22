import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {supabase} from '../../lib/supabase';

export type KonsolissContainerOccupancy = {
  capacityCbm:number;
  loadedCbm:number;
  otherCargoCbm:number;
  yourSpaceCbm:number;
  freeCbm:number;
};

/** Aggregated volumes are exposed only to members of the current container.
 * The RPC returns null when any member's volume is not verified. */
export function useKonsolissContainerOccupancy(enabled:boolean):KonsolissContainerOccupancy|null {
  const [value,setValue]=useState<KonsolissContainerOccupancy|null>(null);
  const reload=useCallback(async()=>{
    if(!enabled){setValue(null);return;}
    try{
      const {data,error}=await supabase.rpc('konsoliss_current_container_occupancy');
      if(error||!data||typeof data!=='object'){setValue(null);return;}
      const row=data as Record<string,unknown>;
      const capacityCbm=Number(row.capacity_cbm),loadedCbm=Number(row.loaded_cbm);
      const otherCargoCbm=Number(row.other_cargo_cbm),yourSpaceCbm=Number(row.your_space_cbm);
      const freeCbm=Number(row.free_cbm);
      if(![capacityCbm,loadedCbm,otherCargoCbm,yourSpaceCbm,freeCbm].every(Number.isFinite)
        ||capacityCbm!==68||loadedCbm<0||loadedCbm>68||otherCargoCbm<0
        ||yourSpaceCbm<0||freeCbm<0){setValue(null);return;}
      setValue({capacityCbm,loadedCbm,otherCargoCbm,yourSpaceCbm,freeCbm});
    }catch{setValue(null);}
  },[enabled]);
  useEffect(()=>{
    if(!enabled){setValue(null);return;}
    void reload();
    const sub=AppState.addEventListener('change',state=>{if(state==='active')void reload();});
    const interval=setInterval(()=>{if(AppState.currentState==='active')void reload();},30000);
    return()=>{clearInterval(interval);sub.remove();};
  },[enabled,reload]);
  return enabled?value:null;
}
