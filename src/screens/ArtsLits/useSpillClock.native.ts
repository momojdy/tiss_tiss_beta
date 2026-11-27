import {useMemo} from 'react';
import {useSharedValue} from 'react-native-reanimated';
import {createSpillClock,type SpillClock} from './spillClock';
export function useSpillClock():SpillClock{
 const motion=useSharedValue(0);
 return useMemo(()=>{
  const clock=createSpillClock();
  return {...clock,motion,set:(progress:number)=>{motion.set(progress);clock.set(progress);}};
 },[motion]);
}
