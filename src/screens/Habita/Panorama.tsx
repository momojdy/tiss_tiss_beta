import React,{useEffect} from 'react';
import {View,StyleSheet,AppState,AccessibilityInfo} from 'react-native';
import Animated,{useSharedValue,useAnimatedStyle,useFrameCallback,useAnimatedReaction,runOnJS} from 'react-native-reanimated';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import type {Listing} from './model';

export const PANORAMA_SPEED=18;
// One UI-thread motion owner. Contact-down precedes drag recognition.
export default function Panorama({items,width,cardWidth,initialId,paused,onSelect,renderCard}:{items:Listing[];width:number;cardWidth:number;initialId:string;paused:boolean;onSelect:(id:string)=>void;renderCard:(p:Listing,accessible:boolean)=>React.ReactNode}){
 const gap=10,stride=cardWidth+gap,cycle=stride*items.length,n=items.length;
 const pos=useSharedValue(0),held=useSharedValue(false),dragBase=useSharedValue(0),direction=useSharedValue(1),lastTranslation=useSharedValue(0),suspended=useSharedValue(paused),foreground=useSharedValue(AppState.currentState!=='background'&&AppState.currentState!=='inactive'),reduce=useSharedValue(false);
 const ids=items.map(p=>p.id),key=ids.join('|');
 useEffect(()=>{suspended.value=paused},[paused,suspended]);
 useEffect(()=>{let live=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)reduce.value=v}).catch(()=>{});const a=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>{reduce.value=v});const b=AppState.addEventListener('change',s=>{foreground.value=s==='active';if(s!=='active')held.value=false;});return()=>{live=false;a.remove();b.remove()}},[foreground,held,reduce]);
 useEffect(()=>{pos.value=Math.max(0,ids.indexOf(initialId))*stride;},[key,initialId,stride]); // explicit marker selection or new search, not frame-driven selection
 useFrameCallback(frame=>{if(n<2||held.value||suspended.value||!foreground.value||reduce.value)return;const dt=Math.min(frame.timeSincePreviousFrame??0,40);pos.value=((pos.value+direction.value*PANORAMA_SPEED*dt/1000)%cycle+cycle)%cycle;});
 const gesture=Gesture.Pan().enabled(n>1).activeOffsetX([-5,5]).failOffsetY([-10,10]).onTouchesDown(e=>{if(e.numberOfTouches===1){dragBase.value=pos.value;lastTranslation.value=0;}held.value=true;}).onStart(()=>{held.value=true;}).onUpdate(e=>{const delta=e.translationX-lastTranslation.value;if(Math.abs(delta)>.1)direction.value=delta<0?1:-1;lastTranslation.value=e.translationX;pos.value=((dragBase.value-e.translationX)%cycle+cycle)%cycle;}).onTouchesUp(e=>{if(e.numberOfTouches===0)held.value=false;}).onTouchesCancelled(()=>{held.value=false;}).onFinalize(()=>{held.value=false;});
 useAnimatedReaction(()=>n?Math.round(pos.value/stride)%n:0,(i,old)=>{if(i!==old&&ids[i])runOnJS(onSelect)(ids[i]);},[key,stride,onSelect]);
 const track=useAnimatedStyle(()=>({transform:[{translateX:(width-cardWidth)/2-(n>1?cycle+pos.value:0)}]}));
 if(!n)return null;
 return <View style={styles.clip} testID="habita-panorama"><GestureDetector gesture={gesture}><Animated.View style={[styles.track,{width:stride*n*(n>1?3:1)},track]}>{Array.from({length:n>1?3:1},(_,copy)=>items.map(p=><View key={copy+'-'+p.id} style={{width:cardWidth,marginRight:gap}} accessibilityElementsHidden={n>1&&copy!==1} importantForAccessibility={n>1&&copy!==1?'no-hide-descendants':'auto'}>{renderCard(p,n===1||copy===1)}</View>))}</Animated.View></GestureDetector></View>;
}
const styles=StyleSheet.create({clip:{overflow:'hidden',width:'100%'},track:{flexDirection:'row',alignSelf:'flex-start'}});
