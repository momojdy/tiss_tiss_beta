import React,{useEffect,useMemo,useRef} from 'react';
import {StyleSheet,TextStyle,View,ViewStyle} from 'react-native';
import Animated,{Easing,FadeIn,FadeOut,Keyframe} from 'react-native-reanimated';

export function TextSwitcher({text,lineHeight,duration,offsetFraction,textStyle,style}:{text:string;lineHeight:number;duration:number;offsetFraction:number;textStyle:TextStyle;style?:ViewStyle}){
 const ready=useRef(false);
 useEffect(()=>{ready.current=true;},[]);
 const{enter,exit}=useMemo(()=>{
  const d=lineHeight*offsetFraction;
  return {
   enter:new Keyframe({from:{opacity:0,transform:[{translateY:d}],easing:Easing.linear},to:{opacity:1,transform:[{translateY:0}]}}).duration(duration),
   exit:new Keyframe({from:{opacity:1,transform:[{translateY:0}],easing:Easing.linear},to:{opacity:0,transform:[{translateY:d}]}}).duration(duration)
  };
 },[lineHeight,duration,offsetFraction]);
 return <View style={[{height:lineHeight,overflow:'hidden'},style]}><Animated.Text key={text} entering={ready.current?enter:undefined} exiting={exit} numberOfLines={1} style={[styles.abs,{lineHeight},textStyle]}>{text}</Animated.Text></View>;
}

export function ColorSwitcher({color,duration,style}:{color:string;duration:number;style?:ViewStyle}){
 const ready=useRef(false);
 useEffect(()=>{ready.current=true;},[]);
 return <View style={[{overflow:'hidden'},style]}><Animated.View key={color} entering={ready.current?FadeIn.duration(duration).easing(Easing.linear):undefined} exiting={FadeOut.duration(duration).easing(Easing.linear)} style={[StyleSheet.absoluteFill,{backgroundColor:color}]}/></View>;
}

const styles=StyleSheet.create({abs:{position:'absolute',left:0,right:0,top:0}});
