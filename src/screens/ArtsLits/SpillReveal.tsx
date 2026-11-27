import React from 'react';
import {StyleSheet,View,type ViewStyle} from 'react-native';
import Svg,{Defs,G,Mask,Path} from 'react-native-svg';
import type {SpillClock} from './spillClock';
import {SPILL_EDGE_LAYERS,spillPath} from './themeSpillGeometry';
export type SpillRevealProps={width:number;height:number;waveWidth:number;waveHeight:number;progress:number;clock?:SpillClock;x:number;y:number;maskId:string;children:React.ReactNode};
// Web: CSS clips normal HTML layout. Content never enters an SVG foreignObject.
export function SpillReveal({width,height,waveWidth,waveHeight,progress,x,y,maskId,children}:SpillRevealProps){
 const maskStyle={maskImage:`url(#${maskId})`,WebkitMaskImage:`url(#${maskId})`,maskRepeat:'no-repeat',WebkitMaskRepeat:'no-repeat',maskSize:'100% 100%',WebkitMaskSize:'100% 100%'} as ViewStyle;
 return <>
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
   <Defs><Mask id={maskId} maskType="alpha" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
    <G transform={`translate(${-x} ${-y})`}>{SPILL_EDGE_LAYERS.map(({lead,opacity})=><Path key={lead} d={spillPath(waveWidth,waveHeight,progress,lead)} fill="#ffffff" opacity={opacity}/>)}</G>
   </Mask></Defs>
  </Svg>
  <View testID="arts-lits-clipped-content" pointerEvents="none" style={[StyleSheet.absoluteFill,maskStyle]}>{children}</View>
 </>;
}
