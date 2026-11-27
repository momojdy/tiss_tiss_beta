import React,{useEffect,useRef} from 'react';
import {StyleSheet,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {SPILL_SPREAD_MS,SPILL_REVEAL_MS,advanceSpillElapsed,spillPath,spillProgress} from './themeSpillGeometry';

// No screenshot, image decoder, native mask or opaque foreground paint.
// This clock drives the live palette and has NO native view at all.
// Input is blocked at the existing page wrapper, not by an elevated overlay.
type Props={onFrame:(t:number)=>void;onDone:()=>void;delay?:number};
export default function ThemeSpill({onFrame,onDone,delay=0}:Props){
 const callbacks=useRef({onFrame,onDone});callbacks.current={onFrame,onDone};
 useEffect(()=>{
  let frame=0,first:number|undefined,lastTick:number|undefined,lastPaint=-1,elapsed=0,alive=true;
  const step=(now:number)=>{
   if(!alive)return;
   if(first===undefined)first=now;
   if(now-first<delay){frame=requestAnimationFrame(step);return;}
   if(lastTick!==undefined)elapsed=advanceSpillElapsed(elapsed,now-lastTick);
   lastTick=now;
   const t=spillProgress(elapsed/(SPILL_SPREAD_MS+SPILL_REVEAL_MS));
   // Repaint at roughly 30fps, but never jump over a large part of the front
   // after a busy frame, background/resume, or menu dismissal.
   if(t===1||lastPaint<0||now-lastPaint>=29){lastPaint=now;callbacks.current.onFrame(t);}
   if(t<1)frame=requestAnimationFrame(step);
   else frame=requestAnimationFrame(()=>{if(alive)callbacks.current.onDone();});
  };
  frame=requestAnimationFrame(step);
  return()=>{alive=false;cancelAnimationFrame(frame);};
 },[delay]);
 return null;
}
// Liquid shape is the incoming PAPER BEHIND the real page, not a curtain
// over its artwork, labels, or controls.
export function SpillPaper({width,height,progress,color}:{width:number;height:number;progress:number;color:string}){
 if(progress<=0||width<=0||height<=0)return null;
 return <View testID="arts-lits-spill-paper" collapsable={false} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject,{overflow:'hidden',zIndex:0,elevation:0}]}>
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
   {progress<1&&<><Path d={spillPath(width,height,progress,.12)} fill={color} opacity={.17}/><Path d={spillPath(width,height,progress,.055)} fill={color} opacity={.34}/></>}
   <Path d={spillPath(width,height,progress)} fill={color}/>
  </Svg>
 </View>;
}
