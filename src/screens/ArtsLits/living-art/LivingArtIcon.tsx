import React, { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { Image as AnimatedImage } from 'expo-image';
import Svg, { G, Path, Polygon, Circle, Ellipse, Rect, Defs, Mask, ClipPath, LinearGradient, RadialGradient, Stop, Use, Filter, FeColorMatrix } from 'react-native-svg';
import { motionFor, motionProps, nums, type SvgNode } from './motion';

export type LivingArtTab = 'Home' | 'Explore' | 'Artrium' | 'Library' | 'Bazaar';
type ArtProps = {name:LivingArtTab;dark:boolean;reducedMotion:boolean;paused:boolean};
export const artSize={Home:[58,58],Explore:[44,44],Artrium:[62,62],Library:[50,50],Bazaar:[35,35]} as const;
type HeavyName='Home'|'Artrium'|'Library';
// Native image playback: no WebView, no touch capture and no heavy SVG mount.
const stills={
 Home:{light:require('./home-idle-light.png'),dark:require('./home-idle-dark.png')},
 Artrium:{light:require('./artrium-idle-light.png'),dark:require('./artrium-idle-dark.png')},
 Library:{light:require('./library-idle-light.png'),dark:require('./library-idle-dark.png')},
};
const motion={
 Home:{light:require('./home-motion-light.webp'),dark:require('./home-motion-dark.webp')},
 Artrium:{light:require('./artrium-motion-light.webp'),dark:require('./artrium-motion-dark.webp')},
 Library:{light:require('./library-motion-light.webp'),dark:require('./library-motion-dark.webp')},
};
function RasterArt({name,dark,reducedMotion,paused}:ArtProps&{name:HeavyName}){
 const [w,h]=artSize[name],pad=name==='Home'?4:22,theme=dark?'dark':'light';
 const style={position:'absolute' as const,left:-pad,top:-pad,width:w+2*pad,height:h+2*pad};
 return <View pointerEvents="none" accessible={false} style={{width:w,height:h,overflow:'visible'}}>
  {reducedMotion?<Image source={stills[name][theme]} resizeMode="contain" fadeDuration={0} accessible={false} style={style}/>:<AnimatedImage source={motion[name][theme]} placeholder={stills[name][theme]} placeholderContentFit="contain" contentFit="contain" transition={0} autoplay={!paused} accessible={false} style={style}/>}
 </View>;
}
// The small 18-node Explore compass keeps its original vector animation.
const ClockContext=createContext(0);
const tags:Record<string,React.ElementType>={g:G,path:Path,polygon:Polygon,circle:Circle,ellipse:Ellipse,rect:Rect,defs:Defs,mask:Mask,clipPath:ClipPath,linearGradient:LinearGradient,radialGradient:RadialGradient,stop:Stop,use:Use,filter:Filter,feColorMatrix:FeColorMatrix};
const ignore=new Set(['class','style','xmlns','role','aria-hidden','aria-label','data-source','data-glyphs','pointer-events','font-family','font-size','font-weight','text-anchor','dominant-baseline','color-interpolation-filters']);
const camel=(name:string)=>name.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
type NativeProps=Record<string,unknown>;
function Moving({tag,props,tracks,children}:{tag:string;props:NativeProps;tracks:ReturnType<typeof motionFor>;children:React.ReactNode}){
 const clock=useContext(ClockContext);
 return React.createElement(tags[tag],{...props,...motionProps(tracks,clock,false)},children);
}
function renderNode(node:SvgNode|string,parentClass:string,key:number):React.ReactNode{
 if(typeof node==='string')return null;
 const [tag,a,children]=node;if(tag==='animate'||tag==='animateTransform')return null;
 const Component=tags[tag];if(!Component)throw Error('Unsupported Explore SVG node '+tag);
 const props:NativeProps={};for(const [k,v] of Object.entries(a))if(!ignore.has(k)&&!k.startsWith('data-')&&!k.startsWith('aria-'))props[camel(k)]=v;
 if(tag==='mask')props.maskType='luminance';
 const tracks=motionFor(node,parentClass),kids=children.map((c,i)=>renderNode(c,a.class??'',i));
 return tracks.length?<Moving key={key} tag={tag} props={props} tracks={tracks}>{kids}</Moving>:React.createElement(Component,{...props,key},kids);
}
const explore=JSON.parse(require('./explore-v73').default) as SvgNode;
function ExploreArt({dark,reducedMotion,paused}:ArtProps){
 const [clock,setClock]=useState(0),elapsed=useRef(0);
 useEffect(()=>{
  if(paused||reducedMotion)return;
  let raf=0,last=0,pending=0;
  const frame=(ts:number)=>{pending+=last?Math.min(ts-last,100):0;last=ts;if(pending>=42){elapsed.current+=pending*3;pending=0;setClock(elapsed.current);}raf=requestAnimationFrame(frame);};
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[paused,reducedMotion]);
 const [w,h]=artSize.Explore,pad=4,[x,y,vw,vh]=nums('0 0 72 64'),s=Math.min(w/vw,h/vh);
 const expanded=[x-(w/s-vw)/2-pad/s,y-(h/s-vh)/2-pad/s,(w+2*pad)/s,(h+2*pad)/s].join(' ');
 const content=useMemo(()=>explore[2].map((n,i)=>renderNode(n,'',i)),[]);
 return <ClockContext.Provider value={reducedMotion?0:clock}><View pointerEvents="none" accessible={false} style={{width:w,height:h,overflow:'visible'}}>
  <Svg width={w+2*pad} height={h+2*pad} viewBox={expanded} color={dark?'#f0e9dd':'#222522'} style={{position:'absolute',left:-pad,top:-pad,overflow:'visible'}}>{content}</Svg>
 </View></ClockContext.Provider>;
}
export const LivingArtIcon=memo(function LivingArtIcon(props:ArtProps){
 if(props.name==='Bazaar')return <View pointerEvents="none" accessible={false} style={{width:35,height:35,overflow:'hidden',alignItems:'center',justifyContent:'center'}}><Image source={require('./bazaar-v73.png')} style={{width:35,height:35}} resizeMode="contain" accessible={false}/></View>;
 if(props.name==='Explore')return <ExploreArt {...props}/>;
 return <RasterArt {...props} name={props.name}/>;
});
