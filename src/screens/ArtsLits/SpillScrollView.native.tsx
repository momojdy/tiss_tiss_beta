import React,{forwardRef,useContext,useId,useImperativeHandle,useState} from 'react';
import type {ScrollView} from 'react-native';
import Animated,{setNativeProps,useAnimatedReaction,useAnimatedRef,useScrollOffset,useSharedValue} from 'react-native-reanimated';
import {SpillSceneContext,type SyncedScrollProps} from './spillScene';
type ContentView=NonNullable<ReturnType<ScrollView['getInnerViewRef']>>;
// The source remains the same scroll view throughout. Observe its native scroll
// offset directly. Translate only the passive content, without issuing scroll
// commands that make a second native scroller do layout/inset work every frame.
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
 const contentRef=useAnimatedRef<ContentView>();
 useImperativeHandle(forwardedRef,()=>ref.current as ScrollView,[ref]);
 useScrollOffset(presentation?null:ref,offset);
 const horizontal=!!props.horizontal;
 useAnimatedReaction(
  ()=>presentation&&layoutRevision.get()>0?{position:offset.get(),revision:layoutRevision.get()}:null,
  value=>{if(value)setNativeProps(contentRef,{transform:[{translateX:horizontal?-value.position:0},{translateY:horizontal?0:-value.position}]});},
  [presentation,offset,layoutRevision,contentRef,horizontal],
 );
 // RN accepts callback inner refs; its public type narrows them to ref objects.
 return <Animated.ScrollView {...nativeProps} ref={ref} innerViewRef={presentation?contentRef as React.RefObject<ContentView>:props.innerViewRef} removeClippedSubviews={presentation?false:props.removeClippedSubviews} testID={presentation?'arts-lits-passive-scroll-'+id:props.testID} scrollEnabled={presentation?false:props.scrollEnabled} scrollEventThrottle={16}
  onScroll={presentation?undefined:props.onScroll}
  onLayout={event=>{if(presentation)layoutRevision.set(v=>v+1);else props.onLayout?.(event);}}
  onContentSizeChange={(width,height)=>{if(presentation)layoutRevision.set(v=>v+1);else props.onContentSizeChange?.(width,height);}}/>;
});
