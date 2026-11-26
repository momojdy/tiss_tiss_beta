import React, { memo, useEffect, useMemo } from 'react';
import { Image, Platform, View } from 'react-native';
import Svg, { G, Path, Polygon, Circle, Ellipse, Rect, Defs, Mask, ClipPath, LinearGradient, RadialGradient, Stop, Use, Filter, FeColorMatrix } from 'react-native-svg';
import Animated, { useAnimatedProps, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import home from './home-v73';
import explore from './explore-v73';
import artrium from './artrium-v73';
import library from './library-v73';

export type LivingArtTab = 'Home' | 'Explore' | 'Artrium' | 'Library' | 'Bazaar';
type SvgNode = [string, Record<string,string>, Array<SvgNode|string>];
type Track = { kind:'pose'|'opacity'|'dash'|'hue'; duration:number; offset:number; times:number[]; values:number[][]; splines?:number[][]; discrete?:boolean; origin?:[number,number] };
type NativeProps = Record<string, unknown>;
type ArtProps = { name:LivingArtTab; dark:boolean; reducedMotion:boolean; paused:boolean };
type VectorName = Exclude<LivingArtTab,'Bazaar'>;
export const artSize = {Home:[70,70],Explore:[42,36],Artrium:[98,59],Library:[62,57],Bazaar:[42,31]} as const;
const source:Record<VectorName,string> = {Home:home,Explore:explore,Artrium:artrium,Library:library};
const cache:Partial<Record<VectorName,SvgNode>> = {};
function tree(name:VectorName) { return cache[name] ?? (cache[name]=JSON.parse(source[name]) as SvgNode); }
const tags:Record<string,React.ElementType>={g:G,path:Path,polygon:Polygon,circle:Circle,ellipse:Ellipse,rect:Rect,defs:Defs,mask:Mask,clipPath:ClipPath,linearGradient:LinearGradient,radialGradient:RadialGradient,stop:Stop,use:Use,filter:Filter,feColorMatrix:FeColorMatrix};
const animatedTags:Record<string,React.ElementType>={g:Animated.createAnimatedComponent(G),path:Animated.createAnimatedComponent(Path),feColorMatrix:Animated.createAnimatedComponent(FeColorMatrix)};
const web=Platform.OS==='web';
const ease=[.42,0,.58,1];
const swordEase=[.22,.65,.33,1];
const identity=[0,0,0,1,1];
function cssTrack(kind:Track['kind'],duration:number,times:number[],values:number[][],offset=0,curve?:number[],origin?:[number,number]):Track {
  return {kind,duration,offset,times,values,splines:curve?times.slice(1).map(()=>curve):undefined,origin};
}
const nums=(value:string)=>value.trim().split(/[\s,]+/).map(Number);
const rotate=(deg:number)=>[0,0,deg,1,1];
const pose=(x:number,y:number,r=0,sx=1,sy=1)=>[x,y,r,sx,sy];
function smil(a:Record<string,string>):Track {
  const values=a.values.split(';').map(nums);
  const times=a.keyTimes?a.keyTimes.split(';').map(Number):values.map((_,i)=>i/(values.length-1));
  const config={duration:parseFloat(a.dur)*1000,offset:-(parseFloat(a.begin??'0')||0)*1000,times,splines:a.keySplines?.split(';').map(nums),discrete:a.calcMode==='discrete'};
  if(a.attributeName==='transform') return {...config,kind:'pose',values:values.map(v=>a.type==='scale'?pose(0,0,0,v[0],v[1]??v[0]):pose(v[0],v[1]??0))};
  return {...config,kind:a.attributeName==='values'?'hue':'opacity',values};
}
function motionFor(node:SvgNode,parentClass:string):Track[] {
  const [tag,a,children]=node, cls=a.class??'';
  const tracks=children.filter((c):c is SvgNode=>typeof c!=='string'&&(c[0]==='animate'||c[0]==='animateTransform')).map(c=>smil(c[1]));
  if(cls==='neo-needle') tracks.push(cssTrack('pose',29000,[0,.72,.75,.8,.85,1],[rotate(0),rotate(0),rotate(-18),rotate(15),rotate(0),rotate(0)],0,ease,[36,33]));
  if(cls==='v25-tree') tracks.push(cssTrack('pose',8600,[0,.18,.42,.67,.84,1],[0,-.75,.55,-.4,.18,0].map(rotate),0,ease,[410.862,268.852]));
  if(cls==='v25-cherries') tracks.push(cssTrack('pose',7000,[0,.2,.45,.68,.86,1],[identity,pose(-1,-1,-1.55),pose(1,0,1.1),pose(-1,1,-.95),pose(0,-1,.45),identity],0,ease,[399.974,126.906]));
  if(cls==='v31-petal'){
    const vars=Object.fromEntries((a.style??'').split(';').map(v=>v.split(':')));
    const duration=parseFloat(vars['--duration'])*1000,offset=-parseFloat(vars['--delay'])*1000,drift=parseFloat(vars['--drift']);
    tracks.push(cssTrack('pose',duration,[0,.16,.18,.32,.48,.65,.8,.94,1],[identity,identity,identity,pose(drift,18),pose(-6,45),pose(10,80),pose(drift,112),pose(4,150),pose(4,150)],offset));
    tracks.push(cssTrack('opacity',duration,[0,.16,.18,.32,.48,.65,.8,.94,1],[[0],[0],[.95],[.95],[.9],[.86],[.65],[0],[0]],offset));
  }
  if(cls==='v31-petal-shape') tracks.push(cssTrack('pose',1900,[0,.5,1],[pose(0,0,-25,.82),pose(0,0,48,.38),pose(0,0,-25,.82)],0,ease));
  if(cls==='home-slash') tracks.push(cssTrack('opacity',23000,[0,.82,.83,.85,.88,1],[[0],[0],[.48],[.65],[0],[0]],0,swordEase));
  if(parentClass==='home-slash'&&tag==='path') tracks.push(cssTrack('dash',23000,[0,.82,.83,.85,.88,1],[[400],[400],[400],[0],[0],[400]],0,swordEase));
  return tracks;
}
function cubic(t:number,p1:number,p2:number){'worklet';const q=1-t;return 3*q*q*t*p1+3*q*t*t*p2+t*t*t;}
function easeAt(x:number,curve?:number[]){'worklet';if(!curve)return x;let l=0,r=1;for(let i=0;i<10;i++){const m=(l+r)/2;if(cubic(m,curve[0],curve[2])<x)l=m;else r=m;}return cubic((l+r)/2,curve[1],curve[3]);}
function sample(track:Track,clock:number):number[]{
  'worklet';
  const local=clock+track.offset, t=local<=0?0:(local%track.duration)/track.duration;
  let i=0;while(i<track.times.length-2&&t>=track.times[i+1])i++;
  const a=track.values[i],b=track.values[i+1],start=track.times[i],end=track.times[i+1];
  if(track.discrete||t<=start)return a;
  const f=easeAt(Math.min(1,(t-start)/(end-start)),track.splines?.[i]);
  return a.map((v,j)=>v+(b[j]-v)*f);
}
function matrix(v:number[],origin?:[number,number]):number[]{
  'worklet';
  const [x,y,deg,sx,sy]=v,theta=deg*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  const a=c*sx,b=s*sx,d=c*sy,k=-s*sy,ox=origin?.[0]??0,oy=origin?.[1]??0;
  return [a,b,k,d,x+ox-a*ox-k*oy,y+oy-b*ox-d*oy];
}
type MotionProps = {matrix?:number[];transform?:string;opacity?:number;strokeDashoffset?:number;values?:number[]|string};
function motionProps(tracks:Track[],clock:number,native:boolean):MotionProps {
  'worklet';
  const out:MotionProps={};
  for(const track of tracks){const v=sample(track,clock);switch(track.kind){
    case 'pose':{const m=matrix(v,track.origin);if(native)out.matrix=m;else out.transform='matrix('+m.join(' ')+')';break;}
    case 'opacity':out.opacity=v[0];break;
    case 'dash':out.strokeDashoffset=v[0];break;
    case 'hue':out.values=native?v:String(v[0]);break;
  }}
  return out;
}
function Moving({tag,props,tracks,clock,children}:{tag:string;props:NativeProps;tracks:Track[];clock:SharedValue<number>;children:React.ReactNode}){
  const animatedProps=useAnimatedProps(()=>motionProps(tracks,clock.get(),!web),[tracks]);
  return React.createElement(animatedTags[tag],{...props,animatedProps},children);
}
const ignore=new Set(['class','style','xmlns','role','aria-hidden','aria-label','data-source','data-glyphs','pointer-events','font-family','font-size','font-weight','text-anchor','dominant-baseline','color-interpolation-filters']);
const camel=(name:string)=>name.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
function shade(color:string,brightness:number,saturation:number){
  if(!/^#[0-9a-f]{6}$/i.test(color))return color;
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  const l=.213*r+.715*g+.072*b;
  return '#'+[r,g,b].map(v=>Math.min(255,Math.max(0,Math.round(brightness*(l+(v-l)*saturation)))).toString(16).padStart(2,'0')).join('');
}
type Context={dark:boolean;name:VectorName;clock:SharedValue<number>;reduced:boolean;parentClass:string;parentStyle:string;inMask:boolean;cherries:boolean};
function nativeProps(node:SvgNode,ctx:Context):NativeProps{
  const [tag,a]=node,cls=a.class??'',out:NativeProps={};
  for(const [k,v] of Object.entries(a))if(!ignore.has(k)&&!k.startsWith('data-')&&!k.startsWith('aria-'))out[camel(k)]=v;
  if(tag==='mask')out.maskType='luminance';
  if(cls.includes('home-w'))out.fill='currentColor';
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
  const props={...nativeProps(node,{...childCtx,parentClass:ctx.parentClass}),key};
  // Restore the untouched page and hide the moving sheet for reduced motion, exactly as the V73 media rule.
  if(ctx.reduced&&ctx.name==='Library'&&tag==='use'&&a.mask==='url(#v62-leaf-cut)')delete (props as NativeProps).mask;
  const tracks=motionFor(node,ctx.parentClass);
  const kids=children.map((c,i)=>renderNode(c,childCtx,i));
  if(tracks.length){
    const initial=motionProps(tracks,0,false);
    Object.assign(props,initial);
    if(!ctx.reduced&&animatedTags[tag])return <Moving key={key} tag={tag} props={props} tracks={tracks} clock={ctx.clock}>{kids}</Moving>;
  }
  return React.createElement(Component,props,kids);
}
function VectorArt({name,dark,reducedMotion,paused}:ArtProps&{name:VectorName}){
  const clock=useSharedValue(0);
  const frame=useFrameCallback(info=>{if(info.timeSincePreviousFrame!==null)clock.set(clock.get()+Math.min(info.timeSincePreviousFrame,100));},false);
  useEffect(()=>{frame.setActive(!paused&&!reducedMotion);return()=>frame.setActive(false);},[frame,paused,reducedMotion]);
  const root=tree(name),[w,h]=artSize[name],pad=name==='Artrium'||name==='Library'?22:4;
  const [x,y,vw,vh]=nums(root[1].viewBox),s=Math.min(w/vw,h/vh);
  const expanded=[x-(w/s-vw)/2-pad/s,y-(h/s-vh)/2-pad/s,(w+2*pad)/s,(h+2*pad)/s].join(' ');
  const content=useMemo(()=>root[2].map((n,i)=>renderNode(n,{name,dark,clock,reduced:reducedMotion,parentClass:'',parentStyle:'',inMask:false,cherries:false},i)),[root,name,dark,clock,reducedMotion]);
  return <View pointerEvents="none" accessible={false} style={{width:w,height:h,overflow:'visible'}}>
    <Svg width={w+2*pad} height={h+2*pad} viewBox={expanded} color={name==='Home'?'#171612':(dark?'#f0e9dd':'#222522')} style={{position:'absolute',left:-pad,top:-pad,overflow:'visible'}}>
      {content}
    </Svg>
  </View>;
}
export const LivingArtIcon=memo(function LivingArtIcon(props:ArtProps){
  if(props.name==='Bazaar')return <View pointerEvents="none" accessible={false} style={{width:42,height:31,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
    <Image source={require('./bazaar-v73.png')} style={{width:42,height:31}} resizeMode="contain" accessible={false}/>
  </View>;
  return <VectorArt {...props} name={props.name}/>;
});
