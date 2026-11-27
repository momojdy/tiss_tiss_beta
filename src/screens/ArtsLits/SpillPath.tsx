import React from 'react';
import {Path} from 'react-native-svg';
import Animated,{useAnimatedProps,type SharedValue} from 'react-native-reanimated';
import {spillPath} from './themeSpillGeometry';
const AnimatedPath=Animated.createAnimatedComponent(Path);
type Props={width:number;height:number;lead:number;opacity:number;fill:string;progress:number;clock?:SharedValue<number>};
function MovingPath({width,height,lead,opacity,fill,clock}:{width:number;height:number;lead:number;opacity:number;fill:string;clock:SharedValue<number>}){
 const animatedProps=useAnimatedProps(()=>({d:spillPath(width,height,clock.get(),lead)}));
 return <AnimatedPath animatedProps={animatedProps} fill={fill} opacity={opacity}/>;
}
export function SpillPath({progress,clock,...props}:Props){
 return clock?<MovingPath {...props} clock={clock}/>:<Path d={spillPath(props.width,props.height,progress,props.lead)} fill={props.fill} opacity={props.opacity}/>;
}
