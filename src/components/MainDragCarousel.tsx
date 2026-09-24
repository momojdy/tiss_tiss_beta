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
type CellProps={category:Category;progress:any;x:number;y:number;enteringFrom:number;interactive:boolean;onPress?:(label:string)=>void};

function Cell({category,progress,x,y,enteringFrom,interactive,onPress}:CellProps){
 const style=useAnimatedStyle(()=>({opacity:progress.value,transform:[{translateX:lerp(enteringFrom,x,progress.value)},{translateY:y}]}));
 return <Animated.View pointerEvents={interactive?'auto':'none'} style={[styles.cell,style]}>
  <Pressable style={styles.fill} onPress={()=>onPress?.(category.label)}><CategoryIcon category={category}/></Pressable>
 </Animated.View>;
}

export default function MainDragCarousel({onCategoryPress,onFeaturedPress,onFlashPress}:{onCategoryPress?:(s:string)=>void;onFeaturedPress?:()=>void;onFlashPress?:()=>void}){
 const {width}=useWindowDimensions(), itemW=width/COLUMNS, collapsedW=width/5.59, progress=useSharedValue(0);
 const [expanded,setExpanded]=useState(false),[featuredIndex,setFeaturedIndex]=useState(0),[flashIndex]=useState(()=>Math.floor(Math.random()*3));
 useEffect(()=>{const id=setInterval(()=>setFeaturedIndex(i=>(i+1)%3),2500);return()=>clearInterval(id)},[]);
 const settle=(velocity:number)=>{'worklet';const target=velocity<-FLING_VELOCITY?1:velocity>FLING_VELOCITY?0:progress.value>=.5?1:0;progress.value=withTiming(target,{duration:ANIM_MS,easing:Easing.out(Easing.cubic)});};
 const pan=Gesture.Pan().activeOffsetX([-10,10]).failOffsetY([-12,12]).onStart(()=>cancelAnimation(progress)).onUpdate(e=>{progress.value=clamp01(progress.value-e.changeX/DRAG_SENSITIVITY)}).onEnd(e=>settle(e.velocityX));
 useEffect(()=>{const id=setTimeout(()=>setExpanded(progress.value>.5),ANIM_MS+20);return()=>clearTimeout(id)},[progress.value]);
 const root=useAnimatedStyle(()=>({height:lerp(COLLAPSED_HEIGHT,EXPANDED_HEIGHT,progress.value)}));
 const collapsedLayer=useAnimatedStyle(()=>({opacity:1-progress.value,transform:[{translateX:-width*progress.value}]}));
 const expandedLayer=useAnimatedStyle(()=>({opacity:progress.value,transform:[{translateX:width*(1-progress.value)}]}));
 const teaser=useAnimatedStyle(()=>({opacity:clamp01(1-progress.value),transform:[{translateY:70*easeInOutCubic(progress.value)}]}));
 const indicator=useAnimatedStyle(()=>({opacity:progress.value<=.75?lerp(1,.25,progress.value/.75):lerp(.25,1,(progress.value-.75)/.25),transform:[{translateY:lerp(ROW_HEIGHT,ROW_HEIGHT*3,easeInOutCubic(progress.value))}]}));
 const line=useAnimatedStyle(()=>({backgroundColor:interpolateColor(easeInOutCubic(progress.value),[0,1],[colors.primary,colors.grey300])}));
 const circle=useAnimatedStyle(()=>({backgroundColor:interpolateColor(easeInOutCubic(progress.value),[0,1],[colors.grey300,colors.primary])}));
 return <Animated.View style={[styles.root,{width},root]}>
  <Animated.View pointerEvents={expanded?'none':'auto'} style={[styles.teaser,teaser]}>
   <TeaserCard label="featured picks" icon="auto-awesome" background="#FBEAF0" swatchColor={FEATURED_COLORS[featuredIndex]} caption={FEATURED_CAPTIONS[featuredIndex]} onPress={onFeaturedPress}/>
   <TeaserCard label="flash deals" icon="access-time-filled" background={colors.gridCream} swatchColor={FLASH_COLORS[flashIndex]} caption={FLASH_CAPTIONS[flashIndex]} onPress={onFlashPress}/>
  </Animated.View>
  <GestureDetector gesture={pan}>
   <Animated.View style={styles.gestureArea}>
    <Animated.View pointerEvents={expanded?'none':'auto'} style={[styles.layer,collapsedLayer]}>
     {collapsedCategories.map((c,i)=><Cell key={'c-'+c.label} category={c} progress={progress} x={(i+1)*itemW} y={0} enteringFrom={i*collapsedW} interactive={!expanded} onPress={onCategoryPress}/>)}
    </Animated.View>
    <Animated.View pointerEvents={expanded?'auto':'none'} style={[styles.layer,expandedLayer]}>
     {expandedCategories.map((c,i)=>{const row=Math.floor(i/COLUMNS),col=i%COLUMNS;return <Cell key={'e-'+c.label} category={c} progress={progress} x={col*itemW} y={row*ROW_HEIGHT} enteringFrom={width+col*collapsedW} interactive={expanded} onPress={onCategoryPress}/>})}
    </Animated.View>
   </Animated.View>
  </GestureDetector>
  <Animated.View pointerEvents="none" style={[styles.indicator,indicator]}><View style={styles.indicatorRow}><Animated.View style={[styles.line,line]}/><Animated.View style={[styles.circle,circle]}/></View></Animated.View>
 </Animated.View>;
}
const styles=StyleSheet.create({root:{overflow:'hidden'},layer:{position:'absolute',left:0,right:0,top:0,height:ROW_HEIGHT*3},gestureArea:{position:'absolute',left:0,right:0,top:0,height:EXPANDED_HEIGHT},fill:{flex:1},cell:{position:'absolute',left:0,top:0,width:'20%',height:ROW_HEIGHT},teaser:{position:'absolute',left:0,right:0,top:TEASER_TOP,height:TEASER_AREA_HEIGHT,flexDirection:'row'},indicator:{position:'absolute',left:0,right:0,top:0,height:INDICATOR_HEIGHT,alignItems:'center',justifyContent:'center'},indicatorRow:{flexDirection:'row',alignItems:'center'},line:{width:14,height:4,borderRadius:2,marginHorizontal:2},circle:{width:6,height:6,borderRadius:3,marginHorizontal:2}});