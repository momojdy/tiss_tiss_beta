import React from 'react';
import {Path} from 'react-native-svg';
import type {SpillClock} from './spillClock';
import {spillPath} from './themeSpillGeometry';
export type SpillPathProps={width:number;height:number;progress:number;clock?:SpillClock;lead:number;opacity:number;color:string};
export function SpillPath({width,height,progress,lead,opacity,color}:SpillPathProps){
 return <Path d={spillPath(width,height,progress,lead)} fill={color} opacity={opacity}/>;
}
