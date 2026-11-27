import React from 'react';
import type {SharedValue} from 'react-native-reanimated';
import type {Palette} from './design';
export type LiveWave={from:Palette;to:Palette;progress:number;width:number;height:number;clock?:SharedValue<number>};
const presentationCache=new WeakMap<React.ReactElement,Map<string,React.ReactNode>>();
const dockColors=[['rgba(255,255,255,0.88)','rgba(20,32,33,0.88)'],['rgba(255,255,255,0.55)','rgba(129,201,192,0.40)'],['#ffffff55','#ffffff0a']] as const;
// Build a passive presentation of the destination theme. Spatial blending is
// exclusively the SVG mask's job: never choose an element's color by its centre.
export type PresentationViewport={top:number;height:number;rows:ReadonlyMap<string,{y:number;height:number}>};
export function targetThemeTree(node:React.ReactNode,from:Palette,to:Palette,viewport?:PresentationViewport):React.ReactNode{
 if(Array.isArray(node))return node.map(child=>targetThemeTree(child,from,to,viewport));
 if(!React.isValidElement(node))return node;
 const key=from.paper+'>'+to.paper;
 const cached=!viewport?presentationCache.get(node)?.get(key):undefined;if(cached!==undefined)return cached;
 const props=node.props as Record<string,unknown>,next:Record<string,unknown>={...props};
 const row=typeof props.testID==='string'&&props.testID.startsWith('arts-lits-section-');
 if(viewport&&typeof props.testID==='string'&&props.testID.startsWith('arts-lits-section-')){
  const frame=viewport.rows.get(props.testID.slice('arts-lits-section-'.length));
  if(frame&&(frame.y+frame.height<viewport.top-64||frame.y>viewport.top+viewport.height+64))return React.cloneElement(node as React.ReactElement<Record<string,unknown>>,{ref:null,onLayout:undefined,testID:undefined,style:[props.style,{height:frame.height}],children:undefined});
 }

 const colors=new Map((Object.keys(from) as (keyof Palette)[]).map(key=>[from[key],to[key]]));
 const dark=to.paper==='#142021';
 for(const pair of dockColors)colors.set(pair[dark?0:1],pair[dark?1:0]);
 const color=(value:unknown)=>typeof value==='string'?(colors.get(value)??value):value;
 const style=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(style);
  if(typeof value==='function')return (...args:unknown[])=>style(value(...args));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,/color$/i.test(key)?color(v):v]));
 };
 if(props.p===from)next.p=to;
 for(const key of ['style','labelStyle','contentContainerStyle','textStyle','titleStyle','inputStyle'])if(props[key]!==undefined)next[key]=style(props[key]);
 for(const key of ['color','fill','stroke','placeholderTextColor','selectionColor','underlineColorAndroid','backgroundColor','borderColor','tintColor'])if(props[key]!==undefined)next[key]=color(props[key]);
 if(Array.isArray(props.colors))next.colors=props.colors.map(color);
 if(typeof props.dark==='boolean')next.dark=dark;
 if(props.background!==undefined&&props.color===from.paper){next.background=dark?to.ink:to.teal;next.color=to.paper;}
 if(props.children!==undefined)next.children=targetThemeTree(props.children as React.ReactNode,from,to,row?undefined:viewport);
 // Mirrors cannot own source refs, focus, layout callbacks, actions or test IDs.
 // Keep an explicit scroll identity before removing the source test ID.
 if(props.scrollEventThrottle!==undefined||props.contentContainerStyle!==undefined||props.horizontal!==undefined)next.spillScrollId=props.testID??props.accessibilityLabel;
 for(const key of Object.keys(next))if(key==='ref'||key==='testID'||key==='autoFocus'||/^on[A-Z]/.test(key))next[key]=key==='ref'?null:undefined;
 if('autoFocus' in props)next.autoFocus=false;
 if('editable' in props||'value' in props){next.editable=false;next.showSoftInputOnFocus=false;}
 const result=React.cloneElement(node as React.ReactElement<Record<string,unknown>>,next);
 if(!viewport){const themes=presentationCache.get(node)??new Map();themes.set(key,result);presentationCache.set(node,themes);}
 return result;
}
