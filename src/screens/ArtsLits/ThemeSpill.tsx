import React,{useEffect,useRef} from 'react';
import {StyleSheet,View} from 'react-native';
import {SPILL_SPREAD_MS,SPILL_REVEAL_MS,advanceSpillElapsed,spillBands,spillProgress} from './themeSpillGeometry';

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
// The animation consists solely of ordinary native background rectangles.
// It is mounted in a separate, lower native sibling of the foreground, never
// in the ScrollView or above text, artwork, controls, or the navigation dock.
export function SpillPaper({width,height,progress,color}:{width:number;height:number;progress:number;color:string}){
 if(progress<=0||width<=0||height<=0)return null;
 const layers=progress<1?[{lead:.12,opacity:.17},{lead:.055,opacity:.34},{lead:0,opacity:1}]:[];
 return <View testID="arts-lits-spill-paper" collapsable={false} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject,{overflow:'hidden',zIndex:0,elevation:0,backgroundColor:progress>=1?color:'transparent'}]}>
  {layers.map(({lead,opacity})=>spillBands(width,height,progress,lead).map(b=><View key={lead+':'+b.key} pointerEvents="none" style={{position:'absolute',left:b.left,top:b.top,width:b.width,height:b.height,backgroundColor:color,opacity}}/>))}
 </View>;
}
