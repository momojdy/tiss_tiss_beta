import React,{useEffect,useRef} from 'react';
import {StyleSheet,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {type SpillClock,useSpillProgress} from './spillClock';
import {SPILL_SPREAD_MS,SPILL_REVEAL_MS,SPILL_EDGE_LAYERS,advanceSpillElapsed,spillPath,spillProgress} from './themeSpillGeometry';

// Keep the approved frame-by-frame fluid motion. Only SVG surfaces subscribe
// to this clock; the interactive page and the prepared card tree stay stable.
// The decorative paper ignores input, leaving the real page scrollable.
type Props={clock:SpillClock;onDone:()=>void;delay?:number;startedAt?:number};
export default function ThemeSpill({clock,onDone,delay=0,startedAt}:Props){
 const callbacks=useRef({onFrame:clock.set,onDone});callbacks.current={onFrame:clock.set,onDone};
 useEffect(()=>{
  let frame=0,first:number|undefined,lastPaint=-1,elapsed=0,alive=true;
  const step=(now:number)=>{
   if(!alive)return;
   if(first===undefined)first=now;
   if(now-first<delay){frame=requestAnimationFrame(step);return;}
   elapsed=advanceSpillElapsed(0,now-first-delay);
   const t=spillProgress(elapsed/(SPILL_SPREAD_MS+SPILL_REVEAL_MS));
   // Repaint at up to 60fps, using real elapsed time even while scrolling.
   if(t===1||lastPaint<0||now-lastPaint>=15){lastPaint=now;callbacks.current.onFrame(t);}
   if(t<1)frame=requestAnimationFrame(step);
   else frame=requestAnimationFrame(()=>{if(alive)callbacks.current.onDone();});
  };
  frame=requestAnimationFrame(step);
  return()=>{alive=false;cancelAnimationFrame(frame);};
 },[delay,clock,startedAt]);
 return null;
}
// Antialiased cubic curves keep the waterline smooth at any display density.
// The vector surface stays absolutely positioned in the lower background
// sibling, underneath the separately stacked live content and navigation.
export function SpillPaper({width,height,progress:staticProgress,color,clock}:{width:number;height:number;progress:number;color:string;clock?:SpillClock}){
 const progress=useSpillProgress(clock,staticProgress);
 if(progress<=0||width<=0||height<=0)return null;
 const layers=progress<1?SPILL_EDGE_LAYERS:[];
 return <View testID="arts-lits-spill-paper" collapsable={false} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden',zIndex:0,elevation:0,backgroundColor:progress>=1?color:'transparent'}]}>
  {progress<1&&<Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
   {layers.map(({lead,opacity})=><Path key={lead} d={spillPath(width,height,progress,lead)} fill={color} opacity={opacity}/>)}
  </Svg>}
 </View>;
}
