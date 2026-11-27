import React,{createContext,forwardRef,useCallback,useContext,useId,useMemo,useState} from 'react';
import {ScrollView,StyleSheet,View,type LayoutChangeEvent,type ScrollViewProps,type StyleProp,type ViewStyle} from 'react-native';
import {SpillReveal} from './SpillReveal';
import {useSpillProgress} from './spillClock';
import {targetThemeTree,type LiveWave} from './liveThemeWave';

type ScrollPosition={x:number;y:number;target:ScrollView|null};
type ScrollRegistry=Map<string,ScrollPosition>;
const SceneContext=createContext<{presentation:boolean;scrolls:ScrollRegistry}|null>(null);
type SyncedScrollProps=ScrollViewProps&{spillScrollId?:string};
// Source scroll views keep their original native instances and refs. The
// passive destination presentation tracks both vertical and horizontal scroll.
export const SpillScrollView=forwardRef<ScrollView,SyncedScrollProps>(function SpillScrollView(props,forwardedRef){
 const scene=useContext(SceneContext),fallback=useId();
 const {spillScrollId,...nativeProps}=props;
 const id=spillScrollId??props.testID??props.accessibilityLabel??fallback;
 const presentation=scene?.presentation??false,registry=scene?.scrolls;
 const sync=useCallback(()=>{const position=registry?.get(id);position?.target?.scrollTo({x:position.x,y:position.y,animated:false});},[registry,id]);
 const ref=useCallback((node:ScrollView|null)=>{
  if(presentation&&registry){const position=registry.get(id)??{x:0,y:0,target:null};position.target=node;registry.set(id,position);sync();}
  else if(typeof forwardedRef==='function')forwardedRef(node);else if(forwardedRef)forwardedRef.current=node;
 },[presentation,registry,id,sync,forwardedRef]);
 return <ScrollView {...nativeProps} ref={ref} testID={presentation?'arts-lits-passive-scroll-'+id:props.testID} scrollEnabled={presentation?false:props.scrollEnabled} scrollEventThrottle={16}
  onScroll={presentation?undefined:event=>{
   if(registry){const position=registry.get(id)??{x:0,y:0,target:null};Object.assign(position,event.nativeEvent.contentOffset);registry.set(id,position);sync();}
   props.onScroll?.(event);
  }} onContentSizeChange={(width,height)=>{if(presentation)sync();else props.onContentSizeChange?.(width,height);}}/>;
});

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
  <SceneContext.Provider value={sourceScene}>{children}</SceneContext.Provider>
  {wave&&frame.width>0&&frame.height>0&&<View testID="arts-lits-spill-ink" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" collapsable={false} style={[StyleSheet.absoluteFill,{zIndex:200,elevation:20,overflow:'hidden'}]}>
   <SpillReveal width={frame.width} height={frame.height} waveWidth={wave.width} waveHeight={wave.height} progress={progress} x={origin.x} y={origin.y} maskId={maskId}>
    <SceneContext.Provider value={targetScene}>
     <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{backgroundColor:paper?wave.to.paper:'transparent'}]}>
      {target}
     </View>
    </SceneContext.Provider>
   </SpillReveal>
  </View>}
 </View>;
}
