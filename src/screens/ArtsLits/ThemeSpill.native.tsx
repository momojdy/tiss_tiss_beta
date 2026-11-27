import React,{useCallback,useEffect,useRef} from 'react';
import {StyleSheet,View} from 'react-native';
import Svg from 'react-native-svg';
import {cancelAnimation,Easing,ReduceMotion,withDelay,withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {SpillPath} from './SpillPath';
import {SPILL_EDGE_LAYERS,SPILL_REVEAL_MS,SPILL_SPREAD_MS} from './themeSpillGeometry';
import type {ThemeSpillProps,SpillPaperProps} from './ThemeSpill';
// Scroll events and JS rendering cannot hold up this clock. React runs once at
// completion; full coverage stays on screen until the saved theme has committed.
export default function ThemeSpill({clock,onDone,delay=0,startedAt}:ThemeSpillProps){
 const done=useRef(onDone),alive=useRef(false);
 useEffect(()=>{done.current=onDone;},[onDone]);
 const finish=useCallback(()=>{if(alive.current)done.current();},[]);
 const motion=clock.motion;
 useEffect(()=>{
  if(!motion)return;
  alive.current=true;
  motion.set(withDelay(delay,withTiming(1,{duration:SPILL_SPREAD_MS+SPILL_REVEAL_MS,easing:Easing.linear,reduceMotion:ReduceMotion.Never},finished=>{
   if(finished)scheduleOnRN(finish);
  }),ReduceMotion.Never));
  return()=>{alive.current=false;cancelAnimation(motion);};
 },[motion,delay,startedAt,finish]);
 return null;
}
export function SpillPaper({width,height,progress,color,clock}:SpillPaperProps){
 if(width<=0||height<=0)return null;
 return <View testID="arts-lits-spill-paper" collapsable={false} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden',zIndex:0,elevation:0}]}>
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
   {SPILL_EDGE_LAYERS.map(({lead,opacity})=><SpillPath key={lead} width={width} height={height} progress={progress} clock={clock} lead={lead} color={color} opacity={opacity}/>)}
  </Svg>
 </View>;
}
