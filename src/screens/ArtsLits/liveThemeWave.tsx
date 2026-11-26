import React from 'react';
import type {Palette} from './design';
import {mixColor,waveAmount,paperWaveAmount,readableColor,type WaveBounds} from './themeSpillGeometry';
export type LiveWave={from:Palette;to:Palette;progress:number;width:number;height:number};
export function blendPalette(from:Palette,to:Palette,t:number):Palette{
 if(t<=0)return from;if(t>=1)return to;
 const result={} as Palette;
 for(const key of Object.keys(from) as (keyof Palette)[])result[key]=mixColor(from[key],to[key],t);
 return result;
}
export function wavePalette(wave:LiveWave,x:number,y:number){
 const t=waveAmount(wave.width,wave.height,x,y,wave.progress);
 if(wave.progress<=0)return wave.from;if(wave.progress>=1)return wave.to;
 const mixed=blendPalette(wave.from,wave.to,t);
 const paper=mixColor(wave.from.paper,wave.to.paper,paperWaveAmount(wave.width,wave.height,x,y,wave.progress));
 const preferred=paperWaveAmount(wave.width,wave.height,x,y,wave.progress)>=.5?wave.to:wave.from;
 const other=preferred===wave.to?wave.from:wave.to;
 return {...mixed,ink:readableColor(mixed.ink,paper,[preferred.ink,other.ink]),muted:readableColor(mixed.muted,paper,[preferred.muted,preferred.ink,other.ink]),teal:readableColor(mixed.teal,paper,[preferred.teal,preferred.ink,other.ink]),rust:readableColor(mixed.rust,paper,[preferred.rust,preferred.ink,other.ink])};
}
function mapIfChanged<T>(items:readonly T[],fn:(item:T,index:number)=>T):readonly T[]{
 let changed=false;const next=items.map((item,index)=>{const v=fn(item,index);if(v!==item)changed=true;return v;});return changed?next:items;
}
// Repaint existing props, retaining unchanged elements (especially museum
// SVGs and images), component types, keys, handlers and navigation.
export function paintThemeTree(node:React.ReactNode,wave:LiveWave,bounds:WaveBounds):React.ReactNode{
 if(wave.progress<=0||node==null)return node;
 const {x,y,width,height}=bounds;
 if(Array.isArray(node))return mapIfChanged(node,(child,i)=>paintThemeTree(child,wave,{x,y:y+height*i/Math.max(1,node.length),width,height:height/Math.max(1,node.length)})) as React.ReactNode;
 if(!React.isValidElement(node))return node;
 const amount=waveAmount(wave.width,wave.height,x+width*.5,y+height*.5,wave.progress);
 const p=wavePalette(wave,x+width*.5,y+height*.5);
 const colorMap=new Map((Object.keys(wave.from) as (keyof Palette)[]).map(k=>[wave.from[k],p[k]]));
 const color=(v:unknown)=>typeof v==='string'?(colorMap.get(v)??v):v;
 const style=(v:unknown):unknown=>{
  if(Array.isArray(v))return mapIfChanged(v,item=>style(item));
  if(typeof v==='function')return (...args:unknown[])=>style(v(...args));
  if(v&&typeof v==='object'){const old=v as Record<string,unknown>;let next=old;for(const k of Object.keys(old)){if(/color$/i.test(k)){const c=color(old[k]);if(c!==old[k]){if(next===old)next={...old};next[k]=c;}}}return next;}
  return v;
 };
 const props=node.props as Record<string,unknown>,next:Record<string,unknown>={};
 const put=(k:string,value:unknown)=>{if(value!==props[k])next[k]=value;};
 if(props.p===wave.from)put('p',p);
 if(props.style!==undefined)put('style',style(props.style));
 for(const k of ['color','fill','stroke','placeholderTextColor','selectionColor'])if(props[k]!==undefined)put(k,color(props[k]));
 if(Array.isArray(props.colors))put('colors',mapIfChanged(props.colors,v=>v==='#ffffff55'&&wave.from.paper==='#f4f0e8'?mixColor(v,'#ffffff0a',amount):v==='#ffffff0a'&&wave.from.paper==='#142021'?mixColor(v,'#ffffff55',amount):color(v)));
 if(props.children!==undefined){
  const children=props.children as React.ReactNode;
  const raw=props.style;
  const row=!!(raw&&typeof raw==='object'&&!Array.isArray(raw)&&'flexDirection' in raw&&raw.flexDirection==='row');
  if(row&&Array.isArray(children)){const n=children.length||1;put('children',mapIfChanged(children,(child,i)=>paintThemeTree(child,wave,{x:x+width*i/n,y,width:width/n,height})));}
  else put('children',paintThemeTree(children,wave,bounds));
 }
 return Object.keys(next).length?React.cloneElement(node as React.ReactElement<Record<string,unknown>>,next):node;
}
