import React,{useEffect,useRef,useState} from 'react';
import {Platform,StyleSheet,View,useWindowDimensions} from 'react-native';
import Svg,{Defs,G,Image as SvgImage,Mask,Path,Rect} from 'react-native-svg';
import {SPILL_SPREAD_MS,SPILL_REVEAL_MS,spillPath,spillProgress} from './themeSpillGeometry';

// Reveal the new live page through the outgoing page's raster snapshot.
// The mask only changes the snapshot's alpha; it never paints a theme color.
type Props={captureTarget:React.RefObject<View|null>;committed:boolean;onReady:()=>void;onDone:()=>void;onFallback:()=>void;delay?:number};
export default function ThemeSpill({captureTarget,committed,onReady,onDone,onFallback,delay=0}:Props){
 const window=useWindowDimensions();
 const [size,setSize]=useState({width:window.width,height:window.height});
 const [uri,setUri]=useState<string|null>(null);
 const [progress,setProgress]=useState(0);
 const ready=useRef(false),failed=useRef(false);
 const callbacks=useRef({onReady,onDone,onFallback});
 callbacks.current={onReady,onDone,onFallback};
 useEffect(()=>{
  let alive=true,raw:string|undefined,release:((uri:string)=>void)|undefined;
  const fail=()=>{if(alive&&!ready.current&&!failed.current){failed.current=true;callbacks.current.onFallback();}};
  const timeout=setTimeout(fail,delay+2400);
  const start=setTimeout(()=>{void(async()=>{
   try{
    if(Platform.OS==='web'||!captureTarget.current){fail();return;}
    // Resolve only when used, so missing native support degrades to a direct toggle.
    const shot:typeof import('react-native-view-shot')=require('react-native-view-shot');
    release=shot.releaseCapture;
    raw=await shot.captureRef(captureTarget,{format:'png',result:'tmpfile',snapshotContentContainer:false});
    if(!alive){try{release(raw);}catch{}return;}
    if(failed.current)return;
    if(!raw)throw Error('Empty page capture');
    setUri(raw.startsWith('/')?'file://'+raw:raw);
   }catch{fail();}
  })();},delay);
  return()=>{alive=false;clearTimeout(start);clearTimeout(timeout);if(raw&&release)try{release(raw);}catch{}};
 },[captureTarget,delay]);
 const markLoaded=()=>{
  if(ready.current||failed.current)return;
  ready.current=true;
  // The original page is still visible until the captured pixels are decoded.
  callbacks.current.onReady();
 };
 useEffect(()=>{
  if(!committed||!ready.current)return;
  let frame=0,first:number|undefined,alive=true;
  const step=(now:number)=>{
   if(!alive)return;
   if(first===undefined)first=now;
   const t=spillProgress((now-first)/(SPILL_SPREAD_MS+SPILL_REVEAL_MS));
   setProgress(t);
   if(t<1)frame=requestAnimationFrame(step);
   else callbacks.current.onDone();
  };
  frame=requestAnimationFrame(step);
  return()=>{alive=false;cancelAnimationFrame(frame);};
 },[committed]);
 const {width,height}=size;
 return <View testID="arts-lits-theme-spill" pointerEvents="auto" accessible={false} importantForAccessibility="no-hide-descendants" onLayout={e=>{const next=e.nativeEvent.layout;if(next.width>0&&next.height>0)setSize(old=>old.width===next.width&&old.height===next.height?old:{width:next.width,height:next.height});}} style={[StyleSheet.absoluteFillObject,{overflow:'hidden',zIndex:200,elevation:30}]}>
  {uri&&progress<1&&<Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
   <Defs><Mask id="arts-lits-outgoing-theme" x={0} y={0} width={width} height={height} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" maskType="luminance">
    <Rect x={0} y={0} width={width} height={height} fill="#ffffff"/>
    {progress>0&&<><Path d={spillPath(width,height,progress,.12)} fill="#000000" opacity={.17}/><Path d={spillPath(width,height,progress,.055)} fill="#000000" opacity={.34}/><Path d={spillPath(width,height,progress)} fill="#000000"/></>}
   </Mask></Defs>
   <G mask="url(#arts-lits-outgoing-theme)"><SvgImage href={{uri}} x={0} y={0} width={width} height={height} preserveAspectRatio="none" onLoad={markLoaded}/></G>
  </Svg>}
 </View>;
}
