import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,View,useWindowDimensions} from 'react-native';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import Animated,{Easing,SharedValue,cancelAnimation,interpolateColor,runOnJS,useAnimatedReaction,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import CategoryIcon from './CategoryIcon';
import TeaserCard from './TeaserCard';
import {Category,collapsedCategories,expandedCategories} from '../data/categories';
import {colors} from '../theme';
import {clamp01,easeInCubic,easeInOutCubic,easeOut,lerp} from '../theme/motion';
const COLUMNS=5,DRAG_SENSITIVITY=850,FLING_VELOCITY=200,ANIM_MS=450,ROW_HEIGHT=78,INDICATOR_HEIGHT=10,TEASER_TOP=88,TEASER_SLIDE=70,TEASER_AREA_HEIGHT=128;
const COLLAPSED_HEIGHT=TEASER_TOP+TEASER_AREA_HEIGHT,EXPANDED_HEIGHT=ROW_HEIGHT*3+INDICATOR_HEIGHT;
const FEATURED_COLORS=['#E8C7D8','#D8B7E0','#C9A8DE'],FEATURED_CAPTIONS=['from $9','from $15','from $6'],FLASH_COLORS=['#F0D9A0','#E8C888','#F2E2B8'],FLASH_CAPTIONS=['up to $10 off','up to $20 off','up to $5 off'];
const indicatorOpacity=(v:number)=>v<=.75?lerp(1,.25,v/.75):lerp(.25,1,(v-.75)/.25);
type Variant='collapsed'|'stays'|'expanded';
function Cell({variant,index,category,progress,itemW,collapsedW,interactive,onPress}:{variant:Variant;index:number;category:Category;progress:SharedValue<number>;itemW:number;collapsedW:number;interactive:boolean;onPress?:(s:string)=>void}){
 const a=useAnimatedStyle(()=>{const p=progress.value;if(variant==='collapsed')return{opacity:clamp01(1-p),transform:[{translateX:lerp(index*collapsedW,(index+1)*itemW,p)}]};if(variant==='stays')return{opacity:1,transform:[{translateX:lerp(5*collapsedW,0,p)}]};const row=Math.floor(index/COLUMNS),col=index%COLUMNS;return{opacity:easeOut(p),transform:[{translateX:lerp(((index-1)%5)*collapsedW,col*itemW,p)},{translateY:lerp(0,row*ROW_HEIGHT,p)}]};});
 return <Animated.View pointerEvents={interactive?'auto':'none'} style={[styles.cell,{width:itemW,height:ROW_HEIGHT},a]}><Pressable style={styles.fill} onPress={()=>onPress?.(category.label)}><CategoryIcon category={category}/></Pressable></Animated.View>;
}
export default function MainDragCarousel({onCategoryPress,onFeaturedPress,onFlashPress}:{onCategoryPress?:(s:string)=>void;onFeaturedPress?:()=>void;onFlashPress?:()=>void}){
 const{width}=useWindowDimensions(),itemW=width/COLUMNS,collapsedW=width/5.59,progress=useSharedValue(0);
 const[collapsedInteractive,setCI]=useState(true),[expandedInteractive,setEI]=useState(false),[featuredIndex,setFI]=useState(0),[flashIndex]=useState(()=>Math.floor(Math.random()*3));
 useAnimatedReaction(()=>progress.value<=.85,(cur,prev)=>{if(cur!==prev)runOnJS(setCI)(cur)});useAnimatedReaction(()=>progress.value>=.15,(cur,prev)=>{if(cur!==prev)runOnJS(setEI)(cur)});
 useEffect(()=>{const id=setInterval(()=>setFI(i=>(i+1)%3),2500);return()=>clearInterval(id)},[]);
 const settle=(v:number)=>{'worklet';const target=v< -200?1:v>200?0:progress.value>=.5?1:0;progress.value=withTiming(target,{duration:ANIM_MS,easing:Easing.out(Easing.cubic)})};
 const pan=Gesture.Pan().activeOffsetX([-10,10]).failOffsetY([-12,12]).onStart(()=>cancelAnimation(progress)).onUpdate(e=>{progress.value=clamp01(progress.value-e.changeX/DRAG_SENSITIVITY)}).onEnd(e=>settle(e.velocityX));
 const root=useAnimatedStyle(()=>({height:lerp(COLLAPSED_HEIGHT,EXPANDED_HEIGHT,progress.value)}));
 const gestureArea=useAnimatedStyle(()=>({height:progress.value>.5?EXPANDED_HEIGHT:ROW_HEIGHT}));
 const teaser=useAnimatedStyle(()=>({opacity:clamp01(1-easeInCubic(progress.value)),transform:[{translateY:TEASER_SLIDE*easeInOutCubic(progress.value)}]}));
 const indicator=useAnimatedStyle(()=>({opacity:indicatorOpacity(progress.value),transform:[{translateY:lerp(ROW_HEIGHT,ROW_HEIGHT*3,easeInOutCubic(progress.value))}]}));
 const line=useAnimatedStyle(()=>({backgroundColor:interpolateColor(easeInOutCubic(progress.value),[0,1],[colors.primary,colors.grey300])}));
 const circle=useAnimatedStyle(()=>({backgroundColor:interpolateColor(easeInOutCubic(progress.value),[0,1],[colors.grey300,colors.primary])}));
 return <Animated.View style={[styles.root,{width},root]}>
  <Animated.View pointerEvents={collapsedInteractive?'auto':'none'} style={[styles.teaser,teaser]}><TeaserCard label="featured picks" icon="auto-awesome" background="#FBEAF0" swatchColor={FEATURED_COLORS[featuredIndex]} caption={FEATURED_CAPTIONS[featuredIndex]} onPress={onFeaturedPress}/><TeaserCard label="flash deals" icon="access-time-filled" background={colors.gridCream} swatchColor={FLASH_COLORS[flashIndex]} caption={FLASH_CAPTIONS[flashIndex]} onPress={onFlashPress}/></Animated.View>
  <GestureDetector gesture={pan}><Animated.View style={[styles.gestureArea,gestureArea]}>{collapsedCategories.map((c,i)=><Cell key={'c-'+c.label} variant="collapsed" index={i} category={c} progress={progress} itemW={itemW} collapsedW={collapsedW} interactive={collapsedInteractive} onPress={onCategoryPress}/>)}
  <Cell key="e-Stays" variant="stays" index={0} category={expandedCategories[0]} progress={progress} itemW={itemW} collapsedW={collapsedW} interactive onPress={onCategoryPress}/>
  {expandedCategories.slice(1).map((c,k)=><Cell key={'e-'+c.label} variant="expanded" index={k+1} category={c} progress={progress} itemW={itemW} collapsedW={collapsedW} interactive={expandedInteractive} onPress={onCategoryPress}/>)}</Animated.View></GestureDetector>
  <Animated.View pointerEvents="none" style={[styles.indicator,indicator]}><View style={styles.indicatorRow}><Animated.View style={[styles.line,line]}/><Animated.View style={[styles.circle,circle]}/></View></Animated.View>
 </Animated.View>;
}
const styles=StyleSheet.create({root:{overflow:'hidden'},fill:{flex:1},cell:{position:'absolute',left:0,top:0},gestureArea:{position:'absolute',left:0,right:0,top:0},teaser:{position:'absolute',left:0,right:0,top:TEASER_TOP,height:TEASER_AREA_HEIGHT,flexDirection:'row'},indicator:{position:'absolute',left:0,right:0,top:0,height:10,alignItems:'center',justifyContent:'center'},indicatorRow:{flexDirection:'row',alignItems:'center'},line:{width:14,height:4,borderRadius:2,marginHorizontal:2},circle:{width:6,height:6,borderRadius:3,marginHorizontal:2}});
