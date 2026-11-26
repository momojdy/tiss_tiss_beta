import React, { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import Svg, { G, Path, Polygon, Circle, Ellipse, Rect, Defs, Mask, ClipPath, LinearGradient, RadialGradient, Stop, Use, Filter, FeColorMatrix } from 'react-native-svg';
import { motionFor, motionProps, nums, type SvgNode } from './motion';

export type LivingArtTab = 'Home' | 'Explore' | 'Artrium' | 'Library' | 'Bazaar';
type NativeProps = Record<string, unknown>;
type ArtProps = { name:LivingArtTab; dark:boolean; reducedMotion:boolean; paused:boolean };
type VectorName = Exclude<LivingArtTab,'Bazaar'>;
export const artSize = {Home:[58,58],Explore:[44,44],Artrium:[62,62],Library:[50,50],Bazaar:[35,35]} as const;
// Loaded lazily: these four modules hold ~3 MB of SVG data, which must not be evaluated or parsed before the nav needs them.
const source:Record<VectorName,()=>string> = {Home:()=>require('./home-v73').default,Explore:()=>require('./explore-v73').default,Artrium:()=>require('./artrium-v73').default,Library:()=>require('./library-v73').default};
const viewBoxes:Record<VectorName,string> = {Home:'0 0 500 500',Explore:'0 0 72 64',Artrium:'0 0 2048 1572',Library:'33 48 407 380'};
// Start the original live scenes on a short stagger, rather than waiting 0.9–1.8 seconds. The touch gate still defers mounts while scrolling.
const mountDelay:Record<VectorName,number> = {Explore:0,Home:40,Library:100,Artrium:180};
// Show the exact existing art immediately, then hand off to its original live V73 scene.
const stills={Home:{light:require('./home-idle-light.png'),dark:require('./home-idle-dark.png')},Artrium:{light:require('./artrium-idle-light.png'),dark:require('./artrium-idle-dark.png')},Library:{light:require('./library-idle-light.png'),dark:require('./library-idle-dark.png')}};
const cache:Partial<Record<VectorName,SvgNode>> = {};
function tree(name:VectorName) { return cache[name] ?? (cache[name]=JSON.parse(source[name]()) as SvgNode); }
const tags:Record<string,React.ElementType>={g:G,path:Path,polygon:Polygon,circle:Circle,ellipse:Ellipse,rect:Rect,defs:Defs,mask:Mask,clipPath:ClipPath,linearGradient:LinearGradient,radialGradient:RadialGradient,stop:Stop,use:Use,filter:Filter,feColorMatrix:FeColorMatrix};
const web=Platform.OS==='web';
// The V73 cycles (8-29s) are too subtle on a phone, so the shared clock runs this many times faster than the HTML.
const SPEED=3;
// Every commit redraws the whole native SVG (Artrium ~4,300 shapes, Home ~2,800), so the heavy icons update less often to keep touch and scrolling responsive.
const frameMs:Record<'Home'|'Explore'|'Artrium'|'Library',number>={Explore:42,Library:50,Home:66,Artrium:66};
const ClockContext=createContext(0);
const listeners=new Set<(dt:number)=>void>();
let raf:number|null=null,last=0,gated=false;
function startClock(){if(raf===null&&!gated&&listeners.size){last=0;raf=requestAnimationFrame(loop);}}
function stopClock(){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;}
// Stop the clock completely during a touch/drag/fling; resume the original phase when idle.
export function setLivingArtGate(paused:boolean){if(gated===paused)return;gated=paused;if(gated)stopClock();else startClock();}
function loop(ts:number){raf=null;if(gated||!listeners.size)return;const d=last?ts-last:0;last=ts;listeners.forEach(l=>l(Math.min(d,100)));if(!gated&&listeners.size)raf=requestAnimationFrame(loop);}
function subscribe(l:(dt:number)=>void){listeners.add(l);startClock();return()=>{listeners.delete(l);if(!listeners.size)stopClock();};}
function Moving({tag,props,tracks,children}:{tag:string;props:NativeProps;tracks:ReturnType<typeof motionFor>;children:React.ReactNode}){
  const clock=useContext(ClockContext);
  return React.createElement(tags[tag],{...props,...motionProps(tracks,clock,web)},children);
}
const ignore=new Set(['class','style','xmlns','role','aria-hidden','aria-label','data-source','data-glyphs','pointer-events','font-family','font-size','font-weight','text-anchor','dominant-baseline','color-interpolation-filters']);
const camel=(name:string)=>name.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
function shade(color:string,brightness:number,saturation:number){
  if(!/^#[0-9a-f]{6}$/i.test(color))return color;
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  const l=.213*r+.715*g+.072*b;
  return '#'+[r,g,b].map(v=>Math.min(255,Math.max(0,Math.round(brightness*(l+(v-l)*saturation)))).toString(16).padStart(2,'0')).join('');
}
type Context={dark:boolean;name:VectorName;reduced:boolean;parentClass:string;parentStyle:string;inMask:boolean;cherries:boolean};
function nativeProps(node:SvgNode,ctx:Context):NativeProps{
  const [tag,a]=node,cls=a.class??'',out:NativeProps={};
  for(const [k,v] of Object.entries(a))if(!ignore.has(k)&&!k.startsWith('data-')&&!k.startsWith('aria-'))out[camel(k)]=v;
  if(tag==='mask')out.maskType='luminance';
  if(cls.includes('home-w'))out.fill='currentColor';
  // Shrink the W and its clearance outline together, about the original glyph center, then move left/down.
  if(ctx.name==='Home'&&cls.split(/\s+/).includes('v30-logo-scale'))out.transform='translate(-51.2925 13.12) scale(1.017)';
  
  if(cls==='home-spray'){out.fill='currentColor';out.opacity=.75;}
  if(cls.includes('home-ink-trail'))out.opacity=.56;
  if(cls.includes('v25-logo-clear'))out.stroke=ctx.dark?'#172324':'#fdfcf8';
  if(cls==='v25-scene')out.opacity=ctx.dark?.96:.93;
  if(cls==='v44-binary'){out.fill=ctx.dark?'#d0c2b1':'#5e5753';out.opacity=ctx.dark?.76:.72;}
  if(cls==='v45-floor'){out.fill=ctx.dark?'#d0c2b1':'#655e59';out.opacity=ctx.dark?.84:.82;}
  if(cls==='v45-sketch-chain'){out.color=ctx.dark?'#c2b6a9':'#4b4542';out.fill=out.color;}
  // Explore keeps its original black outline in dark mode (product decision, differs from the V73 HTML which lightens it).
  if(ctx.parentClass==='home-slash'&&tag==='path'){out.strokeDasharray=[400];out.strokeDashoffset=400;}
  if(ctx.dark&&!ctx.inMask&&(ctx.name==='Library'||ctx.cherries||cls==='v25-cherries')){
    for(const k of ['fill','stroke'])if(typeof out[k]==='string')out[k]=shade(out[k] as string,ctx.name==='Library'?1.06:1.19,ctx.name==='Library'?1.05:1);
  }
  return out;
}
function renderNode(node:SvgNode|string,ctx:Context,key:number):React.ReactNode{
  if(typeof node==='string')return null;
  const [tag,a,children]=node;
  if(tag==='animate'||tag==='animateTransform')return null;
  const Component=tags[tag];
  if(!Component)throw new Error('Unsupported V73 SVG node: '+tag);
  const childCtx={...ctx,parentClass:a.class??'',parentStyle:a.style??'',inMask:ctx.inMask||tag==='mask'||tag==='clipPath',cherries:ctx.cherries||a.class==='v25-cherries'};
  const base=nativeProps(node,{...childCtx,parentClass:ctx.parentClass});
  // Restore the untouched page and hide the moving sheet for reduced motion, exactly as the V73 media rule.
  if(ctx.reduced&&ctx.name==='Library'&&tag==='use'&&a.mask==='url(#v62-leaf-cut)')delete base.mask;
  const tracks=motionFor(node,ctx.parentClass);
  const kids=children.map((c,i)=>renderNode(c,childCtx,i));
  if(tracks.length)return <Moving key={key} tag={tag} props={base} tracks={tracks}>{kids}</Moving>;
  return React.createElement(Component,{...base,key},kids);
}
function VectorArt({name,dark,reducedMotion,paused}:ArtProps&{name:VectorName}){
  const [clock,setClock]=useState(0),elapsed=useRef(0),pending=useRef(0);
  const [ready,setReady]=useState(name==='Explore');
  useEffect(()=>{if(!ready||paused||reducedMotion)return;return subscribe(dt=>{pending.current+=dt;if(pending.current<frameMs[name])return;elapsed.current+=pending.current*SPEED;pending.current=0;setClock(elapsed.current);});},[ready,paused,reducedMotion,name]);
  useEffect(()=>{
    if(ready||paused||reducedMotion)return;
    let t:ReturnType<typeof setTimeout>|undefined;
    const activate=()=>{if(gated){t=setTimeout(activate,80);return;}setReady(true);};
    t=setTimeout(activate,mountDelay[name]);
    return()=>{if(t!==undefined)clearTimeout(t);};
  },[ready,paused,reducedMotion,name]);
  const [w,h]=artSize[name],pad=name==='Artrium'||name==='Library'?22:4;
  const [x,y,vw,vh]=nums(viewBoxes[name]),s=Math.min(w/vw,h/vh);
  const expanded=[x-(w/s-vw)/2-pad/s,y-(h/s-vh)/2-pad/s,(w+2*pad)/s,(h+2*pad)/s].join(' ');
  const content=useMemo(()=>!ready||(reducedMotion&&name!=='Explore')?null:tree(name)[2].map((n,i)=>renderNode(n,{name,dark,reduced:reducedMotion,parentClass:'',parentStyle:'',inMask:false,cherries:false},i)),[ready,name,dark,reducedMotion]);
  if(name!=='Explore'&&(!ready||reducedMotion))return <View pointerEvents="none" accessible={false} style={{width:w,height:h,overflow:'visible'}}><Image source={stills[name][dark?'dark':'light']} resizeMode="contain" fadeDuration={0} accessible={false} style={{position:'absolute',left:-pad,top:-pad,width:w+2*pad,height:h+2*pad}}/></View>;
  return <ClockContext.Provider value={reducedMotion?0:clock}><View pointerEvents="none" accessible={false} style={{width:w,height:h,overflow:'visible'}}>
    <Svg width={w+2*pad} height={h+2*pad} viewBox={expanded} color={name==='Home'?(dark?'#f2e6d2':'#171612'):(dark?'#f0e9dd':'#222522')} style={{position:'absolute',left:-pad,top:-pad,overflow:'visible'}}>
      {content}
    </Svg>
  </View></ClockContext.Provider>;
}
export const LivingArtIcon=memo(function LivingArtIcon(props:ArtProps){
  if(props.name==='Bazaar')return <View pointerEvents="none" accessible={false} style={{width:35,height:35,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
    <Image source={require('./bazaar-v73.png')} style={{width:35,height:35}} resizeMode="contain" accessible={false}/>
  </View>;
  return <VectorArt {...props} name={props.name}/>;
});
