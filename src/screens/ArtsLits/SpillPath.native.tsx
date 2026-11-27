import React from 'react';
import {Path} from 'react-native-svg';
import Animated,{useAnimatedProps} from 'react-native-reanimated';
import {spillPath} from './themeSpillGeometry';
import type {SpillPathProps} from './SpillPath';
const AnimatedPath=Animated.createAnimatedComponent(Path);
// Direct SVG paths, outside Defs: the native mask and paper paint every UI frame.
// Capture only the shared progress, never the JS clock or a changing card tree.
export function SpillPath({width,height,progress,clock,lead,opacity,color}:SpillPathProps){
 const motion=clock?.motion;
 const animatedProps=useAnimatedProps(()=>({d:spillPath(width,height,motion?.get()??progress,lead)}),[width,height,motion,progress,lead]);
 return <AnimatedPath animatedProps={animatedProps} fill={color} opacity={opacity}/>;
}
