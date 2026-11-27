import React,{createContext,useContext} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import Animated,{useAnimatedStyle,useFrameCallback,useSharedValue,type SharedValue} from 'react-native-reanimated';
import {homeFrameAt,homePlayback} from './homePlayback';
const FrameContext=createContext<SharedValue<number>|null>(null);
const sources={light:require('./home-atlas-light.png'),dark:require('./home-atlas-dark.png')};
// One playback frame for the original and the clipped destination. Theme commit
// changes visibility only, never the image source, decoder or animation phase.
export function HomeMotionProvider({paused,reducedMotion,children}:{paused:boolean;reducedMotion:boolean;children:React.ReactNode}){
 const frame=useSharedValue(0),elapsed=useSharedValue(0);
 useFrameCallback(info=>{
  if(paused||reducedMotion)return;
  const next=(elapsed.get()+Math.min(100,Math.max(0,info.timeSincePreviousFrame??0)))%homePlayback.durationMs;
  elapsed.set(next);
  const index=homeFrameAt(next);if(index!==frame.get())frame.set(index);
 });
 return <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>;
}
export function HomeMotion({dark}:{dark:boolean}){
 const frame=useContext(FrameContext);
 const placement=useAnimatedStyle(()=>{
  const index=frame?.get()??0;
  return {transform:[{translateX:-(index%homePlayback.columns)*66},{translateY:-Math.floor(index/homePlayback.columns)*66}]};
 });
 const size={width:homePlayback.columns*66,height:Math.ceil(homePlayback.frames/homePlayback.columns)*66};
 return <View pointerEvents="none" accessible={false} style={{width:58,height:58,overflow:'visible'}}>
  <View pointerEvents="none" style={{position:'absolute',left:-4,top:-4,width:66,height:66,overflow:'hidden'}}>
   <Animated.View testID="arts-lits-home-motion" style={[size,placement]}>
    <Image testID="arts-lits-home-motion-light" source={sources.light} fadeDuration={0} accessible={false} resizeMode="stretch" style={[StyleSheet.absoluteFill,{...size,opacity:dark?0:1}]}/>
    <Image testID="arts-lits-home-motion-dark" source={sources.dark} fadeDuration={0} accessible={false} resizeMode="stretch" style={[StyleSheet.absoluteFill,{...size,opacity:dark?1:0}]}/>
   </Animated.View>
  </View>
 </View>;
}
