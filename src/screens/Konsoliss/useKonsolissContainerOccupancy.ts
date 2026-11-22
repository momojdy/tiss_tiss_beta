import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {supabase} from '../../lib/supabase';

export type KonsolissContainerOccupancy = {
  containerType:'40HQ';
  capacityCbm:number;
  loadedCbm:number;
  otherCargoCbm:number;
  yourSpaceCbm:number; // physically loaded customer cargo, not reserved space
  yourAllocatedCbm:number|null;
  freeCbm:number;
};

/** The backend owns container type (40HQ) and usable 68 CBM capacity.
 * Only the selected assigned container is queried. Incomplete measurement
 * coverage returns null rather than estimating the customer's cargo. */
export function useKonsolissContainerOccupancy(containerId:string|null):KonsolissContainerOccupancy|null {
  const [state,setState]=useState<{id:string;value:KonsolissContainerOccupancy|null}|null>(null);
  const requestSequence=useRef(0);
  const reload=useCallback(async()=>{
    const sequence=++requestSequence.current;
    const commit=(update:()=>void)=>{if(sequence===requestSequence.current)update();};{
    if(!containerId){commit(()=>setState(null));return;}
    try{
      const {data,error}=await supabase.rpc('konsoliss_container_occupancy',{p_container_id:containerId});
      if(error||!data||typeof data!=='object'){commit(()=>setState({id:containerId,value:null}));return;}
      const row=data as Record<string,unknown>;
      const parse=(v:unknown)=>v===null||v===undefined?NaN:Number(v);
      const capacityCbm=parse(row.capacity_cbm),loadedCbm=parse(row.loaded_cbm);
      const otherCargoCbm=parse(row.other_cargo_cbm),yourSpaceCbm=parse(row.your_loaded_cbm);
      const freeCbm=parse(row.free_cbm),allocated=parse(row.your_allocated_cbm);
      const valid=[capacityCbm,loadedCbm,otherCargoCbm,yourSpaceCbm,freeCbm].every(Number.isFinite)
        &&row.container_type==='40HQ'&&capacityCbm===68
        &&loadedCbm>=0&&loadedCbm<=capacityCbm
        &&yourSpaceCbm>=0&&yourSpaceCbm<=loadedCbm
        &&otherCargoCbm>=0&&freeCbm>=0
        &&Math.abs(otherCargoCbm+yourSpaceCbm-loadedCbm)<0.001
        &&Math.abs(loadedCbm+freeCbm-capacityCbm)<0.001
        &&(Number.isNaN(allocated)||(allocated>=yourSpaceCbm&&allocated<=capacityCbm));
      commit(()=>setState({id:containerId,value:valid?{
        containerType:'40HQ',capacityCbm,loadedCbm,otherCargoCbm,yourSpaceCbm,
        yourAllocatedCbm:Number.isNaN(allocated)?null:allocated,freeCbm,
      }:null}));
    }catch{commit(()=>setState({id:containerId,value:null}));}
  },[containerId]);
  useEffect(()=>{
    if(!containerId){setState(null);return;}
    void reload();
    const sub=AppState.addEventListener('change',state=>{if(state==='active')void reload();});
    const interval=setInterval(()=>{if(AppState.currentState==='active')void reload();},30000);
    return()=>{requestSequence.current++;clearInterval(interval);sub.remove();};
  },[containerId,reload]);
  // Prevent displaying data from the previously selected container while loading.
  return state?.id===containerId?state.value:null;
}
