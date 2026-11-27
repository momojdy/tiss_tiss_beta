import React,{forwardRef,useCallback,useContext,useId} from 'react';
import {ScrollView} from 'react-native';
import {SpillSceneContext,type SyncedScrollProps} from './spillScene';
// Source scroll views keep their original native instances and refs. The
// passive destination presentation tracks both vertical and horizontal scroll.
export const SpillScrollView=forwardRef<ScrollView,SyncedScrollProps>(function SpillScrollView(props,forwardedRef){
 const scene=useContext(SpillSceneContext),fallback=useId();
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
