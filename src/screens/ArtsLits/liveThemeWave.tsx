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
function childBounds(children:readonly React.ReactNode[],bounds:WaveBounds,row:boolean):WaveBounds[]{
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
 return children.map((_,i)=>{
  const size=known[i]===null?(totalWeight?remaining*weights[i]/totalWeight:0):known[i]!*scale;
  const result=row?{...bounds,x:bounds.x+offset,width:size}:{...bounds,y:bounds.y+offset,height:size};
  offset+=size;return result;
 });
}
// Repaint existing props, retaining unchanged elements (especially museum
// SVGs and images), component types, keys, handlers and navigation.
export function paintThemeTree(node:React.ReactNode,wave:LiveWave,bounds:WaveBounds):React.ReactNode{
 if(wave.progress<=0||node==null)return node;
 const {x,y,width,height}=bounds;
 if(Array.isArray(node)){const frames=childBounds(node,bounds,false);return mapIfChanged(node,(child,i)=>paintThemeTree(child,wave,frames[i])) as React.ReactNode;}
 if(!React.isValidElement(node))return node;
 const amount=waveAmount(wave.width,wave.height,x+width*.5,y+height*.5,wave.progress);
 const p=wavePalette(wave,x+width*.5,y+height*.5);
 const colorMap=p===wave.from?null:new Map((Object.keys(wave.from) as (keyof Palette)[]).map(k=>[wave.from[k],p[k]]));
 const color=(v:unknown)=>typeof v==='string'?(colorMap?.get(v)??v):v;
 const style=(v:unknown):unknown=>{
  if(Array.isArray(v))return mapIfChanged(v,item=>style(item));
  if(typeof v==='function')return (...args:unknown[])=>style(v(...args));
  if(v&&typeof v==='object'){const old=v as Record<string,unknown>;let next=old;for(const k of Object.keys(old)){if(/color$/i.test(k)){const c=color(old[k]);if(c!==old[k]){if(next===old)next={...old};next[k]=c;}}}return next;}
  return v;
 };
 const props=node.props as Record<string,unknown>,next:Record<string,unknown>={};
 const put=(k:string,value:unknown)=>{if(value!==props[k])next[k]=value;};
 if(props.p===wave.from)put('p',p);
 for(const k of ['style','labelStyle','contentContainerStyle','textStyle','titleStyle','inputStyle'])if(props[k]!==undefined)put(k,style(props[k]));
 for(const k of ['color','fill','stroke','placeholderTextColor','selectionColor','underlineColorAndroid','backgroundColor','borderColor','tintColor'])if(props[k]!==undefined)put(k,color(props[k]));
 if(Array.isArray(props.colors))put('colors',mapIfChanged(props.colors,v=>v==='#ffffff55'&&wave.from.paper==='#f4f0e8'?mixColor(v,'#ffffff0a',amount):v==='#ffffff0a'&&wave.from.paper==='#142021'?mixColor(v,'#ffffff55',amount):color(v)));
 if(props.children!==undefined){
  const children=props.children as React.ReactNode;
  const raw=layoutStyle(props.style);
  const row=raw.flexDirection==='row'||raw.flexDirection==='row-reverse';
  if(Array.isArray(children)){const frames=childBounds(children,bounds,row);if(raw.flexDirection==='row-reverse')for(const f of frames)f.x=x+width-(f.x-x)-f.width;put('children',mapIfChanged(children,(child,i)=>paintThemeTree(child,wave,frames[i])));}
  else put('children',paintThemeTree(children,wave,bounds));
 }
 return Object.keys(next).length?React.cloneElement(node as React.ReactElement<Record<string,unknown>>,next):node;
}
