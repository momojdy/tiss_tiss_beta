import {useCallback,useSyncExternalStore} from 'react';
import type {SharedValue} from 'react-native-reanimated';
export type SpillClock={motion?:SharedValue<number>;get:()=>number;set:(progress:number)=>void;subscribe:(listener:()=>void)=>()=>void};
export function createSpillClock():SpillClock{
 let progress=0;const listeners=new Set<()=>void>();
 return {get:()=>progress,set:next=>{if(next===progress)return;progress=next;listeners.forEach(listener=>listener());},subscribe:listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
const noSubscription=()=>()=>{};
export function useSpillProgress(clock:SpillClock|undefined,progress:number){
 const snapshot=useCallback(()=>progress,[progress]);
 return useSyncExternalStore(clock?.subscribe??noSubscription,clock?.get??snapshot,clock?.get??snapshot);
}
