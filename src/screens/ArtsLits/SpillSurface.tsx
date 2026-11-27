import React,{useCallback,useId,useMemo,useState} from 'react';
import {StyleSheet,View,type LayoutChangeEvent,type StyleProp,type ViewStyle} from 'react-native';
import {SpillReveal} from './SpillReveal';
import {SpillSceneContext,type ScrollRegistry} from './spillScene';
import {useSpillProgress} from './spillClock';
import {targetThemeTree,type LiveWave} from './liveThemeWave';
export {SpillScrollView} from './SpillScrollView';

type Frame={x:number;y:number;width:number;height:number};
type Props={wave:LiveWave|null;children:React.ReactNode;style?:StyleProp<ViewStyle>;originFromLayout?:boolean;paper?:boolean};
export function SpillSurface({wave,children,style,originFromLayout=false,paper=true}:Props){
 const [registry]=useState<ScrollRegistry>(()=>new Map());
 const [frame,setFrame]=useState<Frame>({x:0,y:0,width:0,height:0});
 const sourceScene=useMemo(()=>({presentation:false,scrolls:registry}),[registry]);
 const targetScene=useMemo(()=>({presentation:true,scrolls:registry}),[registry]);
 const progress=useSpillProgress(wave?.clock,wave?.progress??0);
 const maskId='spill-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const from=wave?.from,to=wave?.to;
 const target=useMemo(()=>from&&to?targetThemeTree(children,from,to):null,[children,from,to]);
 const onLayout=useCallback((event:LayoutChangeEvent)=>{
  const next=event.nativeEvent.layout;
  setFrame(old=>old.x===next.x&&old.y===next.y&&old.width===next.width&&old.height===next.height?old:next);
 },[]);
 const origin=originFromLayout?frame:{x:0,y:0};
 return <View style={style} onLayout={onLayout} collapsable={false}>
  <SpillSceneContext.Provider value={sourceScene}>{children}</SpillSceneContext.Provider>
  {wave&&frame.width>0&&frame.height>0&&<View testID="arts-lits-spill-ink" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" collapsable={false} style={[StyleSheet.absoluteFill,{zIndex:200,elevation:20,overflow:'hidden'}]}>
   <SpillReveal width={frame.width} height={frame.height} waveWidth={wave.width} waveHeight={wave.height} progress={progress} clock={wave.clock} x={origin.x} y={origin.y} maskId={maskId}>
    <SpillSceneContext.Provider value={targetScene}>
     <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{backgroundColor:paper?wave.to.paper:'transparent'}]}>
      {target}
     </View>
    </SpillSceneContext.Provider>
   </SpillReveal>
  </View>}
 </View>;
}
