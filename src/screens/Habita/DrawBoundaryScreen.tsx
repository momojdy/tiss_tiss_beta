import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Modal,Pressable,StatusBar,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import MapView,{Polygon,Polyline,Circle,Marker,type Camera} from 'react-native-maps';
import Svg,{Path} from 'react-native-svg';
import Animated,{useAnimatedProps,useSharedValue,runOnJS} from 'react-native-reanimated';
import {Gesture,GestureDetector,GestureHandlerRootView} from 'react-native-gesture-handler';
import {nativeMapAppearance,boundaryInk} from './nativeMapStyle';
import {finishStroke,boundaryCoordinatesValid,currentBoundary,recordBoundary,undoBoundary,zoomRegion,pinchRegion,type BoundaryHistory,type ScreenPoint} from './drawGeometry';
import {validPolygon,propertiesInBoundary,type Listing,type Point,type Region} from './model';
import {geographicCells} from './boundaryFill';
const AnimatedPath=Animated.createAnimatedComponent(Path);
export type DrawStart={region:Region;camera?:Camera};
type Props={start:DrawStart;dark:boolean;candidates:Listing[];onCancel:()=>void;onApply:(points:Point[],mode?:'map'|'list')=>void;renderProperty:(p:Listing,close:()=>void,points:Point[])=>React.ReactNode;renderResults:(count:number,onList:()=>void)=>React.ReactNode;t:(key:string)=>string};
export default function DrawBoundaryScreen({start,dark,candidates,onCancel,onApply,renderProperty,renderResults,t}:Props){
 const insets=useSafeAreaInsets(),{width,height}=useWindowDimensions(),map=useRef<MapView>(null),initial=useRef(start),alive=useRef(true),epoch=useRef(0),busy=useRef(false),tracingRef=useRef(false),cameraRef=useRef(start.region),cameraMovingRef=useRef(false),zoomTimer=useRef<ReturnType<typeof setTimeout>|null>(null),pinchBase=useRef<Region|null>(null),pinchFrame=useRef<number|null>(null),pinchTarget=useRef<Region|null>(null),pinchActive=useRef(false);
 const [selectedId,setSelectedId]=useState<string|null>(null),lastPinTap=useRef(0);
 const [ready,setReady]=useState(false),[history,setHistory]=useState<BoundaryHistory>([[]]),[converting,setConverting]=useState(false),[tracing,setTracing]=useState(false),[mode,setMode]=useState<'draw'|'move'>('draw'),[cameraMoving,setCameraMoving]=useState(false),[settledRegion,setSettledRegion]=useState(start.region),[layout,setLayout]=useState({width:0,height:0});
 const path=useSharedValue(''),samples=useSharedValue<ScreenPoint[]>([]),blocked=useSharedValue(true),pinching=useSharedValue(false),ink=dark?'#F3E8D0':'#3B2F2F',bg=dark?'#211918':'#FCF8EF',stroke=boundaryInk(dark);
 const shape=currentBoundary(history),cells=useMemo(()=>shape.length>=3&&!validPolygon(shape)?geographicCells(shape):null,[shape]),locked=!ready||converting||tracing||cameraMoving,canUndo=history.length>1&&!locked;
 const matched=useMemo(()=>propertiesInBoundary(candidates,shape),[candidates,shape]);
 const selected=matched.find(p=>p.id===selectedId);
 const dismiss=()=>{if(Date.now()-lastPinTap.current>250)setSelectedId(null)};
 const appearance=useMemo(()=>nativeMapAppearance(dark,'standard'),[dark]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++;if(zoomTimer.current)clearTimeout(zoomTimer.current);if(pinchFrame.current!==null)cancelAnimationFrame(pinchFrame.current)}},[]);
 useEffect(()=>{blocked.value=!ready||converting||cameraMoving||mode!=='draw'||layout.width<=0||layout.height<=0},[ready,converting,cameraMoving,mode,layout,blocked]);
 const begin=useCallback(()=>{if(!alive.current||busy.current||cameraMovingRef.current||pinchActive.current)return;tracingRef.current=true;setTracing(true)},[]);
 const finish=useCallback(async(raw:ScreenPoint[])=>{
  if(!alive.current)return;tracingRef.current=false;setTracing(false);
  const screen=finishStroke(raw),native=map.current;
  if(!screen.length||!native||busy.current||cameraMovingRef.current||pinchActive.current){path.value='';if(!busy.current&&!cameraMovingRef.current&&!pinchActive.current)blocked.value=false;return}
  const ticket=++epoch.current;busy.current=true;blocked.value=true;setConverting(true);
  try{
   const points:Point[]=[];
   for(let i=0;i<screen.length;i+=12){const batch=await Promise.all(screen.slice(i,i+12).map(p=>native.coordinateForPoint(p)));if(!alive.current||ticket!==epoch.current)return;points.push(...batch)}
   if(!boundaryCoordinatesValid(points)||(!validPolygon(points)&&!geographicCells(points).length))return;
   setHistory(h=>recordBoundary(h,points));setSelectedId(null);setMode('move');
  }catch{if(alive.current&&ticket===epoch.current)Alert.alert(t('Draw a valid area'),t('The map could not convert this boundary. Try again.'))}
  finally{if(alive.current&&ticket===epoch.current){busy.current=false;setConverting(false);path.value='';blocked.value=false}}
 },[path,blocked,t]);
 const cancelled=useCallback(()=>{if(alive.current){tracingRef.current=false;setTracing(false);path.value=''}},[path]);
 // Keep the gesture identity stable while the parent and CMS callback re-render.
 const finishRef=useRef(finish);finishRef.current=finish;
 const finishStable=useCallback((raw:ScreenPoint[])=>{void finishRef.current(raw)},[]);
 const drawGesture=useMemo(()=>Gesture.Pan().minDistance(0).maxPointers(1).onTouchesDown(e=>{if(e.numberOfTouches>1){samples.value=[];path.value='';runOnJS(cancelled)()}}).onBegin(e=>{if(blocked.value)return;samples.value=[{x:e.x,y:e.y}];path.value='M'+e.x+' '+e.y;runOnJS(begin)()}).onUpdate(e=>{if(blocked.value||!samples.value.length)return;const a=samples.value,last=a[a.length-1];if(a.length<2000&&Math.hypot(e.x-last.x,e.y-last.y)>=2){samples.value=[...a,{x:e.x,y:e.y}];path.value+=' L'+e.x+' '+e.y}}).onEnd((e,success)=>{if(!success||blocked.value||pinching.value||!samples.value.length)return;path.value+=' Z';runOnJS(finishStable)([...samples.value,{x:e.x,y:e.y}]);samples.value=[];blocked.value=true}).onFinalize(()=>{if(samples.value.length){samples.value=[];path.value='';runOnJS(cancelled)()}}),[blocked,samples,path,begin,finishStable,cancelled,pinching]);
 const startPinch=useCallback(()=>{if(!alive.current||busy.current||!map.current)return;pinchActive.current=true;pinchBase.current={...cameraRef.current};tracingRef.current=false;setTracing(false);cameraMovingRef.current=true;setCameraMoving(true)},[]);
 const flushPinch=useCallback(()=>{pinchFrame.current=null;const target=pinchTarget.current;pinchTarget.current=null;if(alive.current&&target&&map.current){cameraRef.current=target;map.current.animateToRegion(target,0)}},[]);
 const updatePinch=useCallback((scale:number)=>{if(!pinchActive.current||!pinchBase.current)return;pinchTarget.current=pinchRegion(pinchBase.current,scale);if(pinchFrame.current===null)pinchFrame.current=requestAnimationFrame(flushPinch)},[flushPinch]);
 const finishPinch=useCallback(()=>{if(!pinchActive.current)return;if(pinchFrame.current!==null){cancelAnimationFrame(pinchFrame.current);flushPinch()}pinchActive.current=false;pinchBase.current=null;cameraMovingRef.current=false;setCameraMoving(false);setSettledRegion(cameraRef.current);blocked.value=false},[flushPinch,blocked]);
 const pinchGesture=useMemo(()=>Gesture.Pinch().onStart(()=>{if(blocked.value&&!pinching.value)return;pinching.value=true;blocked.value=true;samples.value=[];path.value='';runOnJS(startPinch)()}).onUpdate(e=>{if(pinching.value)runOnJS(updatePinch)(e.scale)}).onFinalize(()=>{if(pinching.value){pinching.value=false;runOnJS(finishPinch)()}}),[blocked,pinching,samples,path,startPinch,updatePinch,finishPinch]);
 const gesture=useMemo(()=>Gesture.Simultaneous(drawGesture,pinchGesture),[drawGesture,pinchGesture]);
 const animatedProps=useAnimatedProps(()=>({d:path.value}));
 const cancel=()=>{epoch.current++;onCancel()};
 const clear=()=>{if(locked||busy.current||tracingRef.current)return;setHistory(h=>recordBoundary(h,[]));setSelectedId(null);setMode('draw');path.value=''};
 const undo=()=>{if(!canUndo||busy.current||tracingRef.current)return;setHistory(undoBoundary);setSelectedId(null);path.value=''};
 const changeMode=()=>{if(locked||busy.current||tracingRef.current||cameraMovingRef.current)return;blocked.value=true;setMode(m=>m==='draw'?'move':'draw')};
 const startMoving=()=>{cameraMovingRef.current=true;setCameraMoving(true);blocked.value=true};
 const settle=(r:Region)=>{if(pinchActive.current)return;cameraRef.current=r;setSettledRegion(r);cameraMovingRef.current=false;setCameraMoving(false);if(zoomTimer.current){clearTimeout(zoomTimer.current);zoomTimer.current=null}};
 const zoom=(factor:number)=>{
  if(locked||busy.current||tracingRef.current||!map.current)return;
  const next=zoomRegion(cameraRef.current,factor);if(next.longitudeDelta===cameraRef.current.longitudeDelta)return;
  // Buttons preserve the selected interaction mode; native navigation remains available.
  startMoving();cameraRef.current=next;map.current.animateToRegion(next,280);
  // Fallback if a provider omits its completion event (e.g. at a zoom limit).
  zoomTimer.current=setTimeout(()=>{if(!alive.current)return;cameraMovingRef.current=false;setCameraMoving(false);zoomTimer.current=null},650);
 };
 const apply=(nextMode:'map'|'list'='map')=>{if(locked||busy.current||tracingRef.current||cameraMovingRef.current||!boundaryCoordinatesValid(shape)||(cells!==null&&!cells.length))return;onApply(shape,nextMode)};
 const canApply=!locked&&shape.length>=3&&(cells===null||cells.length>0);
 const controlBg=dark?'#3B2F2F':'#F3E8D0';
 const vertexRadius=Math.max(.2,settledRegion.latitudeDelta*111000*2.7/Math.max(1,layout.height));
 const vertices=shape.filter((_,i)=>i%Math.max(1,Math.ceil(shape.length/24))===0);
 return <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={cancel} statusBarTranslucent navigationBarTranslucent>
  <GestureHandlerRootView style={{flex:1,backgroundColor:bg}}>
   <StatusBar barStyle={dark?'light-content':'dark-content'}/>
   <View style={{paddingTop:insets.top,backgroundColor:bg}}><View style={styles.toolbar}>
    <View style={{flex:1,flexDirection:'row',alignItems:'center',gap:10}}><Pressable testID="habita-draw-cancel" accessibilityRole="button" accessibilityLabel={t('Cancel')} onPress={cancel} hitSlop={8}><Feather name="x" size={22} color={ink}/></Pressable><Pressable testID="habita-draw-clear" accessibilityRole="button" disabled={locked||!shape.length} onPress={clear}><Text style={{fontSize:14,color:ink,opacity:locked||!shape.length?0.38:1}}>{t('Clear')}</Text></Pressable></View>
    <Text accessibilityRole="header" style={{fontWeight:'600',fontSize:15,color:ink}}>{t('Draw')}</Text>
    <View style={{flex:1,alignItems:'flex-end'}}><Pressable testID="habita-draw-apply" accessibilityRole="button" disabled={!canApply} accessibilityState={{disabled:!canApply}} onPress={()=>apply()} style={{paddingVertical:10,paddingLeft:12}}><Text style={{fontSize:14,fontWeight:'600',color:ink,opacity:canApply?1:0.38}}>{t('Done')}</Text></Pressable></View>
   </View></View>
   <View style={{flex:1,backgroundColor:dark?'#293f47':'#b5cbd0'}} onLayout={e=>{const {width:w,height:h}=e.nativeEvent.layout;setLayout(old=>old.width===w&&old.height===h?old:{width:w,height:h})}}>
    <MapView ref={map} style={StyleSheet.absoluteFill} {...(initial.current.camera?{initialCamera:initial.current.camera}:{initialRegion:initial.current.region})} {...appearance} showsUserLocation={false} showsMyLocationButton={false} showsCompass={false} rotateEnabled={false} pitchEnabled={false} scrollEnabled={mode==='move'} zoomEnabled={mode==='move'} zoomTapEnabled={mode==='move'} onRegionChange={()=>{if(mode==='move'&&!cameraMovingRef.current)startMoving()}} onRegionChangeComplete={settle} onPress={dismiss} onMapReady={()=>setReady(true)}>
      {shape.length>=3&&(cells===null?<Polygon coordinates={shape} fillColor={dark?'#9bcdd815':'#438fae12'} strokeColor={stroke} strokeWidth={3}/>:<>{cells.map((coordinates,i)=><Polygon key={'fill-'+i} coordinates={coordinates} fillColor={dark?'#9bcdd815':'#438fae12'} strokeColor="transparent" strokeWidth={0}/>)}<Polyline coordinates={[...shape,shape[0]]} strokeColor={stroke} strokeWidth={3}/></>)}
      {shape.length>=3&&vertices.map((p,i)=><Circle key={i} center={p} radius={vertexRadius} fillColor={dark?'#e7ddc9':'#30373a'} strokeWidth={0}/>)}
      {matched.map(p=><Marker key={p.id+'-'+(p.id===selectedId)} stopPropagation coordinate={{latitude:p.lat,longitude:p.lon}} onPress={()=>{lastPinTap.current=Date.now();setSelectedId(p.id)}}><View style={{backgroundColor:p.id===selectedId?'#F3E8D0':'#3B2F2F',borderColor:'#F3E8D0',borderWidth:.5,borderRadius:18,paddingHorizontal:9,paddingVertical:6}}><Text style={{fontWeight:'700',fontSize:12,color:p.id===selectedId?'#3B2F2F':'#F3E8D0'}}>{p.price>=1000?'$'+Math.round(p.price/1000)+'k':'$'+p.price}</Text></View></Marker>)}
    </MapView>
    {mode==='draw'&&<GestureDetector gesture={gesture}><Animated.View testID="habita-freehand-map-surface" collapsable={false} style={StyleSheet.absoluteFill}><Svg pointerEvents="none" width={layout.width||width} height={layout.height||height}><AnimatedPath animatedProps={animatedProps} stroke={stroke} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round"/></Svg></Animated.View></GestureDetector>}
    {shape.length>=3&&<View pointerEvents="box-none" style={{position:'absolute',left:12,right:12,bottom:Math.max(insets.bottom,12),gap:8}}>{renderResults(matched.length,()=>apply('list'))}{selected&&renderProperty(selected,()=>setSelectedId(null),shape)}</View>}
    <View pointerEvents="box-none" style={{position:'absolute',top:12,right:14,gap:8,alignItems:'flex-end'}}>
     <Pressable testID="habita-draw-mode" accessibilityRole="button" disabled={locked} onPress={changeMode} style={[styles.control,{backgroundColor:controlBg,borderColor:dark?'#695a4c':'#b7a68c',flexDirection:'row',gap:6,paddingHorizontal:10,opacity:locked?0.4:1}]}><Feather name={mode==='draw'?'move':'edit-3'} size={17} color={ink}/><Text style={{color:ink,fontSize:12,fontWeight:'600'}}>{t(mode==='draw'?'Move map':'Draw')}</Text></Pressable>
     {([['plus','Zoom in',.5],['minus','Zoom out',2]] as const).map(([icon,label,factor])=><Pressable key={icon} testID={'habita-draw-zoom-'+icon} accessibilityRole="button" accessibilityLabel={t(label)} disabled={locked} onPress={()=>zoom(factor)} style={[styles.control,{width:38,backgroundColor:controlBg,borderColor:dark?'#695a4c':'#b7a68c',opacity:locked?0.4:1}]}><Feather name={icon} size={19} color={ink}/></Pressable>)}
     <Pressable testID="habita-draw-undo" accessibilityRole="button" accessibilityLabel={t('Undo')} disabled={!canUndo} accessibilityState={{disabled:!canUndo}} onPress={undo} style={[styles.control,{backgroundColor:controlBg,borderColor:dark?'#695a4c':'#b7a68c',flexDirection:'row',gap:6,paddingHorizontal:10,opacity:canUndo?1:.4}]}><Feather name="corner-up-left" size={17} color={ink}/><Text style={{color:ink,fontSize:12,fontWeight:'600'}}>{t('Undo')}</Text></Pressable>
    </View>
   </View>
  </GestureHandlerRootView>
 </Modal>
}
const styles=StyleSheet.create({toolbar:{height:44,flexDirection:'row',alignItems:'center',paddingHorizontal:16},control:{height:38,borderRadius:19,borderWidth:.5,alignItems:'center',justifyContent:'center'}});
