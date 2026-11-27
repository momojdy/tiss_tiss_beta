import React from 'react';
import {StyleSheet,View} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg,{G,Path} from 'react-native-svg';
import {SPILL_EDGE_LAYERS,spillPath} from './themeSpillGeometry';
import type {SpillRevealProps} from './SpillReveal';
// Both themes stay in regular Yoga layout with identical parent constraints.
// Only the small SVG alpha mask animates; native cards are never painted into SVG.
export function SpillReveal({width,height,waveWidth,waveHeight,progress,x,y,children}:SpillRevealProps){
 return <MaskedView testID="arts-lits-clipped-content" pointerEvents="none" style={StyleSheet.absoluteFill} androidRenderingMode="software" maskElement={
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
   <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
    <G transform={`translate(${-x} ${-y})`}>{SPILL_EDGE_LAYERS.map(({lead,opacity})=><Path key={lead} d={spillPath(waveWidth,waveHeight,progress,lead)} fill="#ffffff" opacity={opacity}/>)}</G>
   </Svg>
  </View>
 }>{children}</MaskedView>;
}
