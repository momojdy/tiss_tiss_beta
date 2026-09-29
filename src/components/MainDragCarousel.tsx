import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,useWindowDimensions} from 'react-native';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import Animated,{Easing,SharedValue,cancelAnimation,interpolateColor,runOnJS,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import CategoryIcon from './CategoryIcon';
import TeaserCard from './TeaserCard';
import {Category,collapsedCategories,expandedCategories} from '../data/categories';
import {colors} from '../theme';
import {clamp01,easeInOutCubic,easeOut,lerp} from '../theme/motion';

const COLUMNS=5,DRAG_SENSITIVITY=850,FLING_VELOCITY=200,ANIM_MS=450,ROW_HEIGHT=78,INDICATOR_HEIGHT=10;
const TEASER_TOP=84,TEASER_HEIGHT=128;
const COLLAPSED_HEIGHT=TEASER_TOP+TEASER_HEIGHT;
const EXPANDED_HEIGHT=ROW_HEIGHT*3+INDICATOR_HEIGHT;
const FEATURED_COLORS=['#E8C7D8','#D8B7E0','#C9A8DE'];
const FEATURED_CAPTIONS=['from $9','from $15','from $6'];
const FLASH_COLORS=['#F0D9A0','#E8C888','#F2E2B8'];
const FLASH_CAPTIONS=['up to $10 off','up to $20 off','up to $5 off'];

type CellProps={category:Category;progress:SharedValue<number>;fromX:number;toX:number;fromY:number;toY:number;opacityFrom:number;opacityTo:number;interactive:boolean;onPress?:(label:string)=>void};

function Cell({category,progress,fromX,toX,fromY,toY,opacityFrom,opacityTo,interactive,onPress}:CellProps){
 const style=useAnimatedStyle(()=>({
  opacity:lerp(opacityFrom,opacityTo,opacityFrom===opacityTo?progress.value:easeOut(progress.value)),
  transform:[
   {translateX:lerp(fromX,toX,progress.value)},
   {translateY:lerp(fromY,toY,progress.value)}
  ]
 }));
 return <Animated.View pointerEvents={interactive?'auto':'none'} style={[styles.cell,style]}>
  <Pressable style={styles.fill} onPress={()=>onPress?.(category.label)}><CategoryIcon category={category}/></Pressable>
 </Animated.View>;
}

export default function MainDragCarousel({onCategoryPress,onFeaturedPress,onFlashPress}:{onCategoryPress?:(s:string)=>void;onFeaturedPress?:()=>void;onFlashPress?:()=>void}){
 const {width}=useWindowDimensions();
 const itemW=width/COLUMNS;
 const collapsedW=width/5.59;
 const progress=useSharedValue(0);
 const [expanded,setExpanded]=useState(false);
 const [featuredIndex,setFeaturedIndex]=useState(0);
 const [flashIndex]=useState(()=>Math.floor(Math.random()*3));

 useEffect(()=>{const id=setInterval(()=>setFeaturedIndex(i=>(i+1)%3),2500);return()=>clearInterval(id)},[]);

 const pan=Gesture.Pan()
  .activeOffsetX([-10,10])
  .failOffsetY([-12,12])
  .onStart(()=>cancelAnimation(progress))
  .onUpdate(e=>{progress.value=clamp01(progress.value-e.changeX/DRAG_SENSITIVITY)})
  .onEnd(e=>{
   const target=e.velocityX<-FLING_VELOCITY?1:e.velocityX>FLING_VELOCITY?0:progress.value>=.5?1:0;
   progress.value=withTiming(target,{duration:ANIM_MS,easing:Easing.out(Easing.cubic)});
   runOnJS(setExpanded)(target===1);
  });

 const root=useAnimatedStyle(()=>({height:lerp(COLLAPSED_HEIGHT,EXPANDED_HEIGHT,progress.value)}));
 const gestureArea=useAnimatedStyle(()=>({height:lerp(ROW_HEIGHT,EXPANDED_HEIGHT,progress.value)}));
 const teaser=useAnimatedStyle(()=>({opacity:clamp01(1-progress.value),transform:[{translateY:70*easeInOutCubic(progress.value)}]}));
 const indicator=useAnimatedStyle(()=>({
  opacity:progress.value<=.75?lerp(1,.25,progress.value/.75):lerp(.25,1,(progress.value-.75)/.25),
  transform:[{translateY:lerp(ROW_HEIGHT,ROW_HEIGHT*3,easeInOutCubic(progress.value))]
 }));
 const line=useAnimatedStyle(()=>({backgroundColor:interpolateColor(easeInOutCubic(progress.value),[0,1],[colors.primary,colors.grey300])}));
 const circle=useAnimatedStyle(()=>({backgroundColor:interpolateColor(easeInOutCubic(progress.value),[0,1],[colors.grey300,colors.primary])}));

 return <Animated.View style={[styles.root,{width},root]}>
  <Animated.View pointerEvents={expanded?'none':'auto'} style={[styles.teaser,teaser]}>
   <TeaserCard label="featured picks" icon="auto-awesome" background="#FBEAF0" swatchColor={FEATURED_COLORS[featuredIndex]} caption={FEATURED_CAPTIONS[featuredIndex]} onPress={onFeaturedPress}/>
   <TeaserCard label="flash deals" icon="access-time-filled" background={colors.gridCream} swatchColor={FLASH_COLORS[flashIndex]} caption={FLASH_CAPTIONS[flashIndex]} onPress={onFlashPress}/>
  </Animated.View>

  <GestureDetector gesture={pan}>
   <Animated.View style={[styles.gestureArea,gestureArea]}>
    {collapsedCategories.map((c,i)=><Cell key={'c-'+c.label} category={c} progress={progress}
      fromX={i*collapsedW} toX={(i+1)*itemW} fromY={0} toY={0}
      opacityFrom={1} opacityTo={0} interactive={!expanded} onPress={onCategoryPress}/>)}

    <Cell key="e-stays" category={expandedCategories[0]} progress={progress}
      fromX={5*collapsedW} toX={0} fromY={0} toY={0}
      opacityFrom={1} opacityTo={1} interactive={expanded} onPress={onCategoryPress}/>

    {expandedCategories.slice(1).map((c,k)=>{
      const index=k+1,row=Math.floor(index/COLUMNS),col=index%COLUMNS;
      return <Cell key={'e-'+c.label} category={c} progress={progress}
       fromX=((index-1)%COLUMNS)*collapsedW toX={col*itemW}
       fromY={0} toY={row*ROW_HEIGHT}
       opacityFrom={0} opacityTo={1} interactive={expanded} onPress={onCategoryPress}/>;
    })}
   </Animated.View>
  </GestureDetector>

  <Animated.View pointerEvents="none" style={[styles.indicator,indicator]}>
   <Animated.View style={[styles.line,line]}/>
   <Animated.View style={[styles.circle,circle]}/>
  </Animated.View>
 </Animated.View>;
}

const styles=StyleSheet.create({
 root:{overflow:'hidden'},
 gestureArea:{position:'absolute',left:0,right:0,top:0},
 fill:{flex:1},
 cell:{position:'absolute',left:0,top:0,width:'20%',height:ROW_HEIGHT},
 teaser:{position:'absolute',left:0,right:0,top:TEASER_TOP,height:TEASER_HEIGHT,flexDirection:'row'},
 indicator:{position:'absolute',left:0,right:0,top:0,height:INDICATOR_HEIGHT,flexDirection:'row',alignItems:'center',justifyContent:'center'},
 line:{width:14,height:4,borderRadius:2,marginHorizontal:2},
 circle:{width:6,height:6,borderRadius:3,marginHorizontal:2}
});
