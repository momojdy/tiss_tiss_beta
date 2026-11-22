import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {supabase} from '../../lib/supabase';
import type {KonsolissContainerStatus} from './useCurrentKonsolissContainer';
import type {KonsolissSelectableContainer} from './konsolissDemoContainers';

const validStatuses:KonsolissContainerStatus[]=['filling','filled','departed','arrived'];

/** Read *all* user-owned container assignments; demo selections never reach this hook. */
export function useKonsolissAssignedContainers(){
  const [containers,setContainers]=useState<KonsolissSelectableContainer[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'unavailable'>('loading');
  const refresh=useCallback(async()=>{
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user){setContainers([]);setState('unavailable');return;}
      const {data:assignments,error:assignmentError}=await supabase
        .from('konsoliss_container_assignments')
        .select('container_id,is_current,assigned_at')
        .eq('user_id',auth.user.id)
        .order('assigned_at',{ascending:false});
      if(assignmentError)throw assignmentError;
      const ids=[...new Set((assignments??[]).map(a=>a.container_id).filter((id):id is string=>typeof id==='string'))];
      if(!ids.length){setContainers([]);setState('ready');return;}
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
      setContainers(list);setState('ready');
    }catch{setContainers([]);setState('unavailable');}
  },[]);
  useEffect(()=>{
    void refresh();
    const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
    const interval=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30000);
    return()=>{sub.remove();clearInterval(interval);};
  },[refresh]);
  return {containers,state,refresh};
}
