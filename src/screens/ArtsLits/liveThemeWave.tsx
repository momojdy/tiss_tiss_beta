import React from 'react';
import {View,Text,TextInput,Image,Pressable,ScrollView,type LayoutChangeEvent} from 'react-native';
import type {Palette} from './design';
import {mixColor,waveAmount,paperWaveAmount,readableColor,type WaveBounds} from './themeSpillGeometry';
export type LiveWave={from:Palette;to:Palette;progress:number;width:number;height:number};
type LayoutFrame={x:number;y:number;width:number;height:number};
export type ThemeTreeLayout=Map<string,LayoutFrame>;
const measuredTypes=new Set<unknown>([View,Text,TextInput,Image,Pressable,ScrollView]);
export function blendPalette(from:Palette,to:Palette,t:number):Palette{
 if(t<=0)return from;if(t>=1)return to;
 return Object.fromEntries((Object.keys(from) as (keyof Palette)[]).map(key=>[key,mixColor(from[key],to[key],t)])) as Palette;
}
export function wavePalette(wave:LiveWave,x:number,y:number){
 const t=waveAmount(wave.width,wave.height,x,y,wave.progress);
 if(wave.progress<=0)return wave.from;if(wave.progress>=1)return wave.to;
 const paperAmount=paperWaveAmount(wave.width,wave.height,x,y,wave.progress);
 // Do not alter any untouched or already-settled portion of the page.
 // Contrast guards are for the moving wet edge, not the approved palettes.
 if(t===0&&paperAmount===0)return wave.from;
 if(t===1&&paperAmount===1)return wave.to;
 const mixed=blendPalette(wave.from,wave.to,t);
 const paper=mixColor(wave.from.paper,wave.to.paper,paperAmount);
 const preferred=paperAmount>=.5?wave.to:wave.from;
 const other=preferred===wave.to?wave.from:wave.to;
 return {...mixed,paper,ink:readableColor(mixed.ink,paper,[preferred.ink,other.ink]),muted:readableColor(mixed.muted,paper,[preferred.muted,preferred.ink,other.ink]),teal:readableColor(mixed.teal,paper,[preferred.teal,preferred.ink,other.ink]),rust:readableColor(mixed.rust,paper,[preferred.rust,preferred.ink,other.ink])};
}
function mapIfChanged<T>(items:readonly T[],fn:(item:T,index:number)=>T):readonly T[]{
 let changed=false;const next=items.map((item,index)=>{const v=fn(item,index);if(v!==item)changed=true;return v;});return changed?next:items;
}
// Preserve the direction of styled rows, even when styles are arrays.
function layoutStyle(style:unknown):Record<string,unknown>{
 if(Array.isArray(style))return Object.assign({},...style.map(layoutStyle));
 return style&&typeof style==='object'?style as Record<string,unknown>:{};
}
function nodeLayout(node:React.ReactNode){
 return React.isValidElement(node)?layoutStyle((node.props as Record<string,unknown>).style):{};
}
// Use explicit dimensions/aspect ratios and flex weights when available.
// Do not give nulls, text fragments or conditional booleans a fictitious slot.
function childBounds(children:readonly React.ReactNode[],bounds:WaveBounds,row:boolean,layout?:ThemeTreeLayout,path=''):WaveBounds[]{
 const span=row?bounds.width:bounds.height;
 const known=children.map(child=>{
  if(!React.isValidElement(child)&&!Array.isArray(child))return 0;
  const s=nodeLayout(child),v=s[row?'width':'height'];
  if(typeof v==='number'&&v>0)return v;
  if(typeof v==='string'&&/^\d+(\.\d+)?%$/.test(v))return span*parseFloat(v)/100;
  if(!row&&typeof s.aspectRatio==='number'&&s.aspectRatio>0){
   const w=typeof s.width==='number'?s.width:bounds.width;
   return w/s.aspectRatio;
  }
  return null;
 });
 const totalKnown=known.reduce<number>((sum,v)=>sum+(v??0),0);
 const weights=children.map((child,i)=>{const flex=nodeLayout(child).flex;return known[i]===null?(typeof flex==='number'&&flex>0?flex:1):0;});
 const totalWeight=weights.reduce((sum,v)=>sum+v,0);
 // If estimated fixed dimensions exceed the parent, normalize instead of
 // sending foregrounds outside the measured visible row.
 const scale=totalKnown>span&&totalKnown>0?span/totalKnown:1;
 const remaining=Math.max(0,span-totalKnown*scale);
 let offset=0;
 return children.map((child,i)=>{
  const size=known[i]===null?(totalWeight?remaining*weights[i]/totalWeight:0):known[i]!*scale;
  const result=row?{...bounds,x:bounds.x+offset,width:size}:{...bounds,y:bounds.y+offset,height:size};
  offset+=size;
  const measured=layout?.get(childPath(path,child,i));
  return measured?{...measured,x:bounds.x+measured.x,y:bounds.y+measured.y}:result;
 });
}
function childPath(parent:string,child:React.ReactNode,index:number){
 return parent+'/'+(React.isValidElement(child)&&child.key!==null?'key:'+child.key:'index:'+index);
}
// Repaint existing props, retaining unchanged elements (especially museum
// SVGs and images), component types, keys, handlers and navigation.
export function paintThemeTree(node:React.ReactNode,wave:LiveWave|null,bounds:WaveBounds,layout?:ThemeTreeLayout,path='root'):React.ReactNode{
 if(node==null)return node;
 const {x,y,width,height}=bounds;
 if(Array.isArray(node)){const frames=childBounds(node,bounds,false,layout,path);return mapIfChanged(node,(child,i)=>paintThemeTree(child,wave,frames[i],layout,childPath(path,child,i))) as React.ReactNode;}
 if(!React.isValidElement(node))return node;
 const amount=wave?waveAmount(wave.width,wave.height,x+width*.5,y+height*.5,wave.progress):0;
 const p=wave?wavePalette(wave,x+width*.5,y+height*.5):null;
 const colorMap=!wave||p===wave.from||!p?null:new Map((Object.keys(wave.from) as (keyof Palette)[]).map(k=>[wave.from[k],p[k]]));
 const color=(v:unknown)=>typeof v==='string'?(colorMap?.get(v)??v):v;
 const style=(v:unknown):unknown=>{
  if(Array.isArray(v))return mapIfChanged(v,item=>style(item));
  if(typeof v==='function')return (...args:unknown[])=>style(v(...args));
  if(v&&typeof v==='object'){const old=v as Record<string,unknown>;let next=old;for(const k of Object.keys(old)){if(/color$/i.test(k)){const c=color(old[k]);if(c!==old[k]){if(next===old)next={...old};next[k]=c;}}}return next;}
  return v;
 };
 const props=node.props as Record<string,unknown>,next:Record<string,unknown>={};
 const put=(k:string,value:unknown)=>{if(value!==props[k])next[k]=value;};
 // Register on the original host elements before a toggle, so the wave uses
 // Yoga/browser layout (including padding, gaps and absolute positioning).
 // Cloning retains their type, key, ref and state; no content is reparented.
 if(layout&&measuredTypes.has(node.type)){
  put('onLayout',(event:LayoutChangeEvent)=>{
   layout.set(path,event.nativeEvent.layout);
   (props.onLayout as ((event:LayoutChangeEvent)=>void)|undefined)?.(event);
  });
 }
 if(wave&&props.p===wave.from)put('p',p);
 for(const k of ['style','labelStyle','contentContainerStyle','textStyle','titleStyle','inputStyle'])if(props[k]!==undefined)put(k,style(props[k]));
 for(const k of ['color','fill','stroke','placeholderTextColor','selectionColor','underlineColorAndroid','backgroundColor','borderColor','tintColor'])if(props[k]!==undefined)put(k,color(props[k]));
 if(wave&&Array.isArray(props.colors))put('colors',mapIfChanged(props.colors,v=>v==='#ffffff55'&&wave.from.paper==='#f4f0e8'?mixColor(v,'#ffffff0a',amount):v==='#ffffff0a'&&wave.from.paper==='#142021'?mixColor(v,'#ffffff55',amount):color(v)));
 if(props.children!==undefined){
  const children=props.children as React.ReactNode;
  const raw=layoutStyle(props.style);
  const row=raw.flexDirection==='row'||raw.flexDirection==='row-reverse';
  if(Array.isArray(children)){const frames=childBounds(children,bounds,row,layout,path);if(raw.flexDirection==='row-reverse')for(let i=0;i<frames.length;i++)if(!layout?.has(childPath(path,children[i],i)))frames[i].x=x+width-(frames[i].x-x)-frames[i].width;put('children',mapIfChanged(children,(child,i)=>paintThemeTree(child,wave,frames[i],layout,childPath(path,child,i))));}
  else {const key=childPath(path,children,0),measured=layout?.get(key);put('children',paintThemeTree(children,wave,measured?{...measured,x:x+measured.x,y:y+measured.y}:bounds,layout,key));}
 }
 // A wide label can straddle both papers. A small contrasting halo keeps
 // every glyph readable until the front has crossed its entire bounds.
 if(wave&&p&&(node.type===Text||node.type===TextInput||(props.p===wave.from&&React.Children.toArray(props.children as React.ReactNode).some(child=>typeof child==='string'||typeof child==='number')))){
  const corners=[[x,y],[x+width,y],[x,y+height],[x+width,y+height]];
  const amounts=corners.map(([cx,cy])=>waveAmount(wave.width,wave.height,cx,cy,wave.progress));
  if(Math.max(...amounts)>0&&Math.min(...amounts)<1){
   const base=layoutStyle(next.style??props.style),ink=typeof base.color==='string'?base.color:p.ink;
   put('style',{...base,textShadowColor:readableColor(wave.from.paper,ink,[wave.to.paper]),textShadowRadius:2,textShadowOffset:{width:0,height:0}});
  }
 }
 return Object.keys(next).length?React.cloneElement(node as React.ReactElement<Record<string,unknown>>,next):node;
}
