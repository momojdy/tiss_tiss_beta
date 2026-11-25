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
      if(!progress){commit(()=>setState({kind:'unavailable'}));return;}
      // Only display an authoritative deadline for active reservations with nothing sent.
      // A partial shipment needs per-right attribution; do not guess its remaining deadline.
      let trackingDueAt:string|undefined;
      if(progress.reservedCbm>0&&progress.sentCbm===0){
        try{
          const {data:rights,error:rightsError}=await supabase.from('konsoliss_rights_balance')
            .select('order_id,tracking_due_at').eq('customer_id',auth.user.id).gt('active_cbm',0)
            .order('tracking_due_at',{ascending:true});
          if(!rightsError&&rights?.length){
            const ids=[...new Set(rights.map(r=>r.order_id))];
            const {data:orders,error:ordersError}=await supabase.from('konsoliss_booking_orders')
              .select('id').eq('customer_id',auth.user.id).in('id',ids).in('status',['reserved','held','fulfilling','ready']).not('paid_at','is',null);
            if(!ordersError&&orders){
              const active=new Set(orders.map(o=>o.id));
              const deadlines=rights.filter(r=>active.has(r.order_id)&&typeof r.tracking_due_at==='string'&&Number.isFinite(Date.parse(r.tracking_due_at)))
                .map(r=>r.tracking_due_at as string).sort((a,b)=>Date.parse(a)-Date.parse(b));
              trackingDueAt=deadlines[0];
            }
          }
        }catch{/* Missing deadline never fabricates a countdown or hides verified load data. */}
      }
      commit(()=>setState({kind:'recorded',progress,trackingDueAt}));
    }catch{commit(()=>setState({kind:'unavailable'}));}
  },[]);
  const invalidate=useCallback(()=>{requestSequence.current++;setState({kind:'unavailable'});},[]);
  useKonsolissRefresh(refresh,invalidate);
  return state;
}
