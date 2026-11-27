import React,{forwardRef,useContext,useId,useImperativeHandle,useState} from 'react';
import type {ScrollView} from 'react-native';
import Animated,{scrollTo,useAnimatedReaction,useAnimatedRef,useScrollOffset,useSharedValue} from 'react-native-reanimated';
import {SpillSceneContext,type SyncedScrollProps} from './spillScene';
// The source remains the same scroll view throughout. Observe its native scroll
// offset directly; the passive view follows on UI, without a JS event round trip.
export const SpillScrollView=forwardRef<ScrollView,SyncedScrollProps>(function SpillScrollView(props,forwardedRef){
 const scene=useContext(SpillSceneContext),fallback=useId();
 const {spillScrollId,...nativeProps}=props;
 const id=spillScrollId??props.testID??props.accessibilityLabel??fallback;
 const presentation=scene?.presentation??false,registry=scene?.scrolls;
 const ownOffset=useSharedValue(0),layoutRevision=useSharedValue(0);
 const [offset]=useState(()=>{
  const prior=registry?.get(id);
  if(presentation)return prior?.nativeOffset??ownOffset;
  registry?.set(id,{x:0,y:0,target:null,nativeOffset:ownOffset});
  return ownOffset;
 });
 const ref=useAnimatedRef<ScrollView>();
 useImperativeHandle(forwardedRef,()=>ref.current as ScrollView,[ref]);
 useScrollOffset(presentation?null:ref,offset);
 const horizontal=!!props.horizontal;
 useAnimatedReaction(
  ()=>presentation&&layoutRevision.get()>0?{position:offset.get(),revision:layoutRevision.get()}:null,
  value=>{if(value)scrollTo(ref,horizontal?value.position:0,horizontal?0:value.position,false);},
  [presentation,offset,layoutRevision,ref,horizontal],
 );
 return <Animated.ScrollView {...nativeProps} ref={ref} testID={presentation?'arts-lits-passive-scroll-'+id:props.testID} scrollEnabled={presentation?false:props.scrollEnabled} scrollEventThrottle={16}
  onScroll={presentation?undefined:props.onScroll}
  onLayout={event=>{if(presentation)layoutRevision.set(v=>v+1);else props.onLayout?.(event);}}
  onContentSizeChange={(width,height)=>{if(presentation)layoutRevision.set(v=>v+1);else props.onContentSizeChange?.(width,height);}}/>;
});
