import {useCallback,useRef,useState} from 'react';
import {useKonsolissRefresh} from './useKonsolissRefresh';
import {supabase} from '../../lib/supabase';
import type {KonsolissContainerStatus} from './useCurrentKonsolissContainer';
import type {KonsolissSelectableContainer} from './konsolissDemoContainers';

const validStatuses:KonsolissContainerStatus[]=['filling','filled','departed','arrived'];

/** Read *all* user-owned container assignments; demo selections never reach this hook. */
export function useKonsolissAssignedContainers(enabled=true){
  const [containers,setContainers]=useState<KonsolissSelectableContainer[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'unavailable'>('loading');
  const requestSequence=useRef(0);
  const refresh=useCallback(async()=>{
    const sequence=++requestSequence.current;
    const commit=(update:()=>void)=>{if(sequence===requestSequence.current)update();};
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user){commit(()=>{setContainers([]);setState('unavailable');});return;}
      const {data:assignments,error:assignmentError}=await supabase
        .from('konsoliss_container_assignments')
        .select('container_id,is_current,assigned_at')
        .eq('user_id',auth.user.id)
        .eq('is_current',true)
        .order('assigned_at',{ascending:false});
      if(assignmentError)throw assignmentError;
      const ids=[...new Set((assignments??[]).map(a=>a.container_id).filter((id):id is string=>typeof id==='string'))];
      if(!ids.length){commit(()=>{setContainers([]);setState('ready');});return;}
      const {data:records,error:containerError}=await supabase
        .from('konsoliss_containers').select('id,container_number,status').in('id',ids);
      if(containerError)throw containerError;
      const byId=new Map((records??[]).map(row=>[row.id,row]));
      const list:KonsolissSelectableContainer[]=ids.flatMap(id=>{
        const container=byId.get(id);
        if(!container||typeof container.container_number!=='string'
          ||!validStatuses.includes(container.status as KonsolissContainerStatus))return [];
        return [{id,number:container.container_number,status:container.status as KonsolissContainerStatus,demo:false}];
      });
      if(list.length!==ids.length)throw new Error('Assigned container details unavailable');
      commit(()=>{setContainers(list);setState('ready');});
    }catch{commit(()=>{setContainers([]);setState('unavailable');});}
  },[]);
  const invalidate=useCallback(()=>{requestSequence.current++;setContainers([]);setState('unavailable');},[]);
  useKonsolissRefresh(refresh,invalidate,enabled);
  return {containers,state,refresh};
}
