import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,StyleSheet,View,useWindowDimensions} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {SPILL_SPREAD_MS,SPILL_REVEAL_MS,spillPath,spillProgress} from './themeSpillGeometry';

// A single transient SVG overlay. Only this component updates on animation
// frames; the existing page, scroll view, detail sheet and dock stay mounted.
type Props={color:string;committed:boolean;onCovered:()=>void;onDone:()=>void;delay?:number};
export default function ThemeSpill({color,committed,onCovered,onDone,delay=0}:Props){
 const window=useWindowDimensions();
 const [size,setSize]=useState({width:window.width,height:window.height});
 const [progress,setProgress]=useState(0);
 const opacity=useRef(new Animated.Value(1)).current;
 const callbacks=useRef({onCovered,onDone});
 callbacks.current={onCovered,onDone};
 useEffect(()=>{
  let frame=0,first:number|undefined,alive=true;
  const step=(now:number)=>{
   if(!alive)return;
   if(first===undefined)first=now;
   const t=spillProgress((now-first-delay)/SPILL_SPREAD_MS);
   setProgress(t);
   if(t<1){frame=requestAnimationFrame(step);return;}
   // Paint the fully opaque cover before switching the actual theme.
   frame=requestAnimationFrame(()=>{if(alive)callbacks.current.onCovered();});
  };
  frame=requestAnimationFrame(step);
  return()=>{alive=false;cancelAnimationFrame(frame);};
 },[delay]);
 useEffect(()=>{
  if(!committed)return;
  const animation=Animated.timing(opacity,{toValue:0,duration:SPILL_REVEAL_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true,isInteraction:false});
  animation.start(({finished})=>{if(finished)callbacks.current.onDone();});
  return()=>animation.stop();
 },[committed,opacity]);
 const {width,height}=size;
 return <View testID="arts-lits-theme-spill" pointerEvents="auto" accessible={false} importantForAccessibility="no-hide-descendants" onLayout={e=>{const next=e.nativeEvent.layout;if(next.width>0&&next.height>0)setSize(old=>old.width===next.width&&old.height===next.height?old:{width:next.width,height:next.height});}} style={[StyleSheet.absoluteFillObject,{overflow:'hidden',zIndex:200,elevation:30}]}>
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject,{opacity}]}>
   <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
    {progress<1&&<><Path d={spillPath(width,height,progress,.12)} fill={color} opacity={.17}/><Path d={spillPath(width,height,progress,.055)} fill={color} opacity={.34}/></>}
    <Path d={spillPath(width,height,progress)} fill={color}/>
   </Svg>
  </Animated.View>
 </View>;
}
