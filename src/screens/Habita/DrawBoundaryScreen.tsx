import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Modal,Pressable,StatusBar,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import MapView,{type Camera} from 'react-native-maps';
import Svg,{Path,Polygon,Circle} from 'react-native-svg';
import Animated,{useAnimatedProps,useSharedValue,runOnJS} from 'react-native-reanimated';
import {Gesture,GestureDetector,GestureHandlerRootView} from 'react-native-gesture-handler';
import {nativeMapAppearance,boundaryInk} from './nativeMapStyle';
import {finishStroke,boundaryCoordinatesValid,type ScreenPoint} from './drawGeometry';
import {validPolygon,type Point,type Region} from './model';
const AnimatedPath=Animated.createAnimatedComponent(Path);
export type DrawStart={region:Region;camera?:Camera};
type Props={start:DrawStart;dark:boolean;onCancel:()=>void;onApply:(points:Point[])=>void;t:(key:string)=>string};
export default function DrawBoundaryScreen({start,dark,onCancel,onApply,t}:Props){
 const insets=useSafeAreaInsets(),{width,height}=useWindowDimensions(),map=useRef<MapView>(null),initial=useRef(start),alive=useRef(true),epoch=useRef(0),busy=useRef(false),gestureSize=useRef({width:0,height:0});
 const [ready,setReady]=useState(false),[shape,setShape]=useState<ScreenPoint[]>([]),[applying,setApplying]=useState(false),[tracing,setTracing]=useState(false),[layout,setLayout]=useState({width:0,height:0});
 const path=useSharedValue(''),samples=useSharedValue<ScreenPoint[]>([]),blocked=useSharedValue(true),ink=dark?'#F3E8D0':'#3B2F2F',bg=dark?'#211918':'#FCF8EF',stroke=boundaryInk(dark);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++}},[]);
 useEffect(()=>{blocked.value=!ready||applying||layout.width<=0||layout.height<=0},[ready,applying,layout,blocked]);
 const reset=useCallback(()=>{epoch.current++;busy.current=false;setApplying(false);setTracing(false);setShape([]);samples.value=[];path.value=''},[samples,path]);
 const begin=useCallback(()=>{setShape([]);setTracing(true)},[]);
 const finish=useCallback((raw:ScreenPoint[])=>{if(!alive.current)return;setTracing(false);const next=finishStroke(raw);setShape(next);if(!next.length)path.value=''},[path]);
 const cancelled=useCallback(()=>{if(alive.current){setTracing(false);setShape([]);path.value=''}},[path]);
 useEffect(()=>{if(shape.length)path.value=''},[shape,path]);
 const gesture=useMemo(()=>Gesture.Pan().minDistance(0).maxPointers(1).onBegin(e=>{if(blocked.value)return;samples.value=[{x:e.x,y:e.y}];path.value='M'+e.x+' '+e.y;runOnJS(begin)()}).onUpdate(e=>{if(blocked.value||!samples.value.length)return;const a=samples.value,last=a[a.length-1];if(a.length<2000&&Math.hypot(e.x-last.x,e.y-last.y)>=2){samples.value=[...a,{x:e.x,y:e.y}];path.value+=' L'+e.x+' '+e.y}}).onEnd(e=>{if(blocked.value||!samples.value.length)return;path.value+=' Z';runOnJS(finish)([...samples.value,{x:e.x,y:e.y}]);samples.value=[]}).onFinalize(()=>{if(samples.value.length){samples.value=[];path.value='';runOnJS(cancelled)()}}),[blocked,samples,path,begin,finish,cancelled]);
 const animatedProps=useAnimatedProps(()=>({d:path.value}));
 const cancel=()=>{epoch.current++;onCancel()};
 const apply=async()=>{if(busy.current||!ready||tracing||shape.length<3||!map.current)return;const native=map.current,ticket=++epoch.current;busy.current=true;setApplying(true);try{const points:Point[]=[];for(let i=0;i<shape.length;i+=12){const batch=await Promise.all(shape.slice(i,i+12).map(p=>native.coordinateForPoint(p)));if(!alive.current||ticket!==epoch.current)return;points.push(...batch)}if(!boundaryCoordinatesValid(points)||!validPolygon(points)){Alert.alert(t('Draw a valid area'),t('Choose at least three distinct points without crossed edges.'));return}onApply(points)}catch{if(alive.current&&ticket===epoch.current)Alert.alert(t('Draw a valid area'),t('The map could not convert this boundary. Try again.'))}finally{if(alive.current&&ticket===epoch.current){busy.current=false;setApplying(false)}}};
 // The native map uses its own camera. It is locked only in this separate drawing view.
 const locked=!ready||applying||tracing||shape.length<3;
 return <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={cancel} statusBarTranslucent navigationBarTranslucent>
  <GestureHandlerRootView style={{flex:1,backgroundColor:bg}}>
   <StatusBar barStyle={dark?'light-content':'dark-content'}/>
   <View style={{paddingTop:insets.top,backgroundColor:bg}}><View style={styles.toolbar}>
    <View style={{flex:1,flexDirection:'row',alignItems:'center',gap:14}}><Pressable testID="habita-draw-cancel" accessibilityRole="button" accessibilityLabel={t('Cancel')} onPress={cancel} hitSlop={8}><Feather name="x" size={22} color={ink}/></Pressable><Pressable testID="habita-draw-clear" accessibilityRole="button" disabled={applying||tracing} onPress={reset}><Text style={{fontSize:14,color:ink}}>{t('Clear')}</Text></Pressable></View>
    <Text accessibilityRole="header" style={{fontWeight:'600',fontSize:15,color:ink}}>{t('Draw')}</Text>
    <View style={{flex:1,alignItems:'flex-end'}}><Pressable testID="habita-draw-apply" accessibilityRole="button" disabled={locked} accessibilityState={{disabled:locked}} onPress={()=>void apply()} style={{paddingVertical:10,paddingLeft:12}}><Text style={{fontSize:14,fontWeight:'600',color:ink,opacity:locked?0.38:1}}>{t('Apply')}</Text></Pressable></View>
   </View></View>
   <View style={{flex:1,backgroundColor:dark?'#293f47':'#b5cbd0'}} onLayout={e=>{const {width:w,height:h}=e.nativeEvent.layout;if(w!==gestureSize.current.width||h!==gestureSize.current.height){gestureSize.current={width:w,height:h};reset();setLayout({width:w,height:h})}}}>
    <MapView ref={map} style={StyleSheet.absoluteFill} {...(initial.current.camera?{initialCamera:initial.current.camera}:{initialRegion:initial.current.region})} {...nativeMapAppearance(dark,'standard')} showsUserLocation={false} showsMyLocationButton={false} showsCompass={false} rotateEnabled={false} pitchEnabled={false} scrollEnabled={false} zoomEnabled={false} onMapReady={()=>setReady(true)}/>
    <GestureDetector gesture={gesture}><Animated.View testID="habita-freehand-map-surface" collapsable={false} style={StyleSheet.absoluteFill}><Svg pointerEvents="none" width={layout.width||width} height={layout.height||height}>
      {shape.length>=3&&<><Polygon points={shape.map(p=>p.x+','+p.y).join(' ')} fill={dark?'#9bcdd815':'#438fae12'} stroke={stroke} strokeWidth={3} strokeLinejoin="round"/>{shape.map((p,i)=><Circle key={i} cx={p.x} cy={p.y} r={2.7} fill={dark?'#e7ddc9':'#30373a'}/>)}</>}
      <AnimatedPath animatedProps={animatedProps} stroke={stroke} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round"/>
    </Svg></Animated.View></GestureDetector>
   </View>
  </GestureHandlerRootView>
 </Modal>
}
const styles=StyleSheet.create({toolbar:{height:44,flexDirection:'row',alignItems:'center',paddingHorizontal:16}});
