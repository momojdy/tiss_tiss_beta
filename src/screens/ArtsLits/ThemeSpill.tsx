import React,{useEffect,useRef} from 'react';
import {StyleSheet,View} from 'react-native';
import Svg from 'react-native-svg';
import {cancelAnimation,Easing,ReduceMotion,withTiming,type SharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {SpillPath} from './SpillPath';
import {SPILL_SPREAD_MS,SPILL_REVEAL_MS,SPILL_EDGE_LAYERS} from './themeSpillGeometry';

// One UI-thread clock drives both paper and ink masks. React only commits the
// saved theme on completion; scrolling never requires a palette render per frame.
type Props={clock:SharedValue<number>;onDone:()=>void;startedAt:number};
export default function ThemeSpill({clock,onDone,startedAt}:Props){
 const callbacks=useRef(onDone);callbacks.current=onDone;
 useEffect(()=>{
  let alive=true;
  const done=()=>{if(alive)callbacks.current();};
  const duration=Math.max(0,SPILL_SPREAD_MS+SPILL_REVEAL_MS-(performance.now()-startedAt));
  clock.set(0);
  clock.set(withTiming(1,{duration,easing:Easing.linear,reduceMotion:ReduceMotion.Never},finished=>{if(finished)scheduleOnRN(done);}));
  return()=>{alive=false;cancelAnimation(clock);};
 },[clock,startedAt]);
 return null;
}
// Antialiased cubic curves keep the waterline smooth at any display density.
// The vector surface stays absolutely positioned in the lower background
// sibling, underneath the separately stacked live content and navigation.
export function SpillPaper({width,height,progress,color,clock}:{width:number;height:number;progress:number;color:string;clock?:SharedValue<number>}){
 if((!clock&&progress<=0)||width<=0||height<=0)return null;
 const layers=clock||progress<1?SPILL_EDGE_LAYERS:[];
 return <View testID="arts-lits-spill-paper" collapsable={false} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden',zIndex:0,elevation:0,backgroundColor:progress>=1?color:'transparent'}]}>
  {(clock||progress<1)&&<Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
   {layers.map(({lead,opacity})=><SpillPath key={lead} width={width} height={height} progress={progress} clock={clock} lead={lead} fill={color} opacity={opacity}/>)}
  </Svg>}
 </View>;
}
