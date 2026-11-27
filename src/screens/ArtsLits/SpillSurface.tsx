import React,{createContext,forwardRef,useCallback,useContext,useId,useMemo,useRef,useState} from 'react';
import {ScrollView,StyleSheet,View,type LayoutChangeEvent,type ScrollViewProps,type StyleProp,type ViewStyle} from 'react-native';
import Svg,{Defs,ForeignObject,G,Mask,Path} from 'react-native-svg';
import {useSpillProgress} from './spillClock';
import {SPILL_EDGE_LAYERS,spillPath} from './themeSpillGeometry';
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
 const registry=useRef<ScrollRegistry>(new Map());
 const [frame,setFrame]=useState<Frame>({x:0,y:0,width:0,height:0});
 const sourceScene=useMemo(()=>({presentation:false,scrolls:registry.current}),[]);
 const targetScene=useMemo(()=>({presentation:true,scrolls:registry.current}),[]);
 const progress=useSpillProgress(wave?.clock,wave?.progress??0);
 const maskBase='spill-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 // Refresh the native SVG's cached mask bitmap on each presented frame.
 // The card presentation and its scroll views stay mounted throughout.
 const maskId=maskBase+'-'+Math.round(progress*1000000);
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
   <Svg width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`} pointerEvents="none">
    <Defs><Mask id={maskId} maskType="alpha" maskUnits="userSpaceOnUse" x={0} y={0} width={frame.width} height={frame.height}>
     <G transform={`translate(${-origin.x} ${-origin.y})`}>
      {SPILL_EDGE_LAYERS.map(({lead,opacity})=><Path key={lead} d={spillPath(wave.width,wave.height,progress,lead)} fill="#ffffff" opacity={opacity}/>)}
     </G>
    </Mask></Defs>
    <ForeignObject x={0} y={0} width={frame.width} height={frame.height} mask={`url(#${maskId})`}>
     <SceneContext.Provider value={targetScene}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:frame.width,height:frame.height,backgroundColor:paper?wave.to.paper:'transparent'}}>
       {target}
      </View>
     </SceneContext.Provider>
    </ForeignObject>
   </Svg>
  </View>}
 </View>;
}
