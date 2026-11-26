import React,{useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,View,useWindowDimensions} from 'react-native';
import Svg,{Path} from 'react-native-svg';

// One native-driven, corner-anchored ink shape. Never remount the underlying page.
export const SPILL_SPREAD_MS=480;
export const SPILL_REVEAL_MS=220;
export const SPILL_SHAPE='M0 0H160C160 34 151 48 139 66C126 86 119 82 106 105C90 135 61 133 44 147C28 159 13 160 0 160Z';
type Props={color:string;committed:boolean;onCovered:()=>void;onDone:()=>void;delay?:number};
export default function ThemeSpill({color,committed,onCovered,onDone,delay=0}:Props){
 const {width,height}=useWindowDimensions();
 const scale=useRef(new Animated.Value(.001)).current;
 const opacity=useRef(new Animated.Value(1)).current;
 const callbacks=useRef({onCovered,onDone});
 callbacks.current={onCovered,onDone};
 useEffect(()=>{
  const animation=Animated.timing(scale,{toValue:1,duration:SPILL_SPREAD_MS,delay,easing:Easing.bezier(.22,.65,.28,1),useNativeDriver:true,isInteraction:false});
  animation.start(({finished})=>{if(finished)callbacks.current.onCovered();});
  return()=>animation.stop();
 },[scale,delay]);
 // Wait until React has committed the new palette under the fully opaque cover.
 useEffect(()=>{
  if(!committed)return;
  const animation=Animated.timing(opacity,{toValue:0,duration:SPILL_REVEAL_MS,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false});
  animation.start(({finished})=>{if(finished)callbacks.current.onDone();});
  return()=>animation.stop();
 },[committed,opacity]);
 return <View testID="arts-lits-theme-spill" pointerEvents="auto" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject,{overflow:'hidden',zIndex:200,elevation:30}]}>
  <Animated.View pointerEvents="none" style={{position:'absolute',left:0,top:0,width:width*2,height:height*2,opacity,transformOrigin:'0px 0px',transform:[{scale}]}}>
   <Svg width="100%" height="100%" viewBox="0 0 160 160" preserveAspectRatio="none"><Path d={SPILL_SHAPE} fill={color}/></Svg>
  </Animated.View>
 </View>;
}
