/**
 * Wantiss Home — React Native + TypeScript + Expo
 *
 * Single-file Home implementation.
 *
 * Carousel geometry:
 *   Category content: 78px -> 234px
 *   Swipe indicator:  10px
 *   Carousel total:   88px -> 244px
 *   Teaser row:       128px -> 0px
 *
 * Combined carousel + teaser footprint:
 *   Collapsed: 216px
 *   Expanded:  244px
 *
 * No reserved height is used.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const MAGENTA = '#BF008E';
const PINK_BG = '#FBE8EF';
const GOLD = '#DAAE67';
const LAVENDER = '#A789B1';
const BLACK87 = 'rgba(0,0,0,0.87)';
const ALTERNATE = '#F6E4E8';

const F_MONT_ITALIC = 'System';
const F_INTER = 'System';
const F_INTER_TIGHT = 'System';

type MI = React.ComponentProps<typeof MaterialIcons>['name'];

const EASE_OUT = Easing.bezier(0.0, 0.0, 0.2, 1.0);
const EASE_OUT_CUBIC = Easing.bezier(0.215, 0.61, 0.355, 1.0);
const EASE_IN_OUT_CUBIC = Easing.bezier(0.645, 0.045, 0.355, 1.0);
const EASE_IN_CUBIC = Easing.bezier(0.55, 0.055, 0.675, 0.19);

const pick = <T,>(arr: T[]) => Math.floor(Math.random() * arr.length);

function CyclingText({text,lineHeight,offset,duration,style}:{text:string;lineHeight:number;offset:number;duration:number;style:TextStyle}) {
  const [state,setState]=useState<{cur:string;prev:string|null}>({cur:text,prev:null});
  const t=useRef(new Animated.Value(1)).current;
  const first=useRef(true);
  useEffect(()=>{ if(first.current){first.current=false;return;} setState(s=>({cur:text,prev:s.cur})); t.setValue(0); Animated.timing(t,{toValue:1,duration,easing:EASE_OUT_CUBIC,useNativeDriver:true}).start(()=>setState(s=>({cur:s.cur,prev:null}))); },[text]);
  const dist=lineHeight*offset;
  return <View style={{height:lineHeight,overflow:'hidden'}}>
    {state.prev!==null&&<Animated.Text numberOfLines={1} style={[style,{position:'absolute',left:0,right:0,lineHeight,opacity:t.interpolate({inputRange:[0,1],outputRange:[1,0]}),transform:[{translateY:t.interpolate({inputRange:[0,1],outputRange:[0,dist]})}]}]}>{state.prev}</Animated.Text>}
    <Animated.Text numberOfLines={1} style={[style,{lineHeight,opacity:state.prev!==null?t:1,transform:[{translateY:state.prev!==null?t.interpolate({inputRange:[0,1],outputRange:[dist,0]}):0}]}]}>{state.cur}</Animated.Text>
  </View>;
}

const TABS=[{label:'Favs',width:60},{label:'For you',width:65},{label:'Flash',width:70},{label:'Locals',width:60},{label:'New Arrivals',width:80},{label:'Live',width:70}];
function MainTabSelector(){
  const[selected,setSelected]=useState('For you');
  return <View style={s.tabBar}>
    <Pressable style={{paddingLeft:12,paddingBottom:15,paddingRight:8}}><MaterialIcons name="location-on" size={26} color={MAGENTA}/></Pressable>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex:1}} contentContainerStyle={{alignItems:'flex-end',height:100}}>
      {TABS.map(tab=>{const isSel=selected===tab.label,isFlash=tab.label==='Flash',isLive=tab.label==='Live',isNew=tab.label==='New Arrivals';return <Pressable key={tab.label} onPress={()=>setSelected(tab.label)} style={[s.tab,{width:tab.width,backgroundColor:isSel?'#fff':'transparent'}]}>
        {isLive?<View style={s.tabInner}><Text style={[s.tabText,{fontSize:14,alignSelf:'flex-start'}]}>Live</Text><View style={s.liveBadge}><MaterialIcons name="play-arrow" size={12} color="#fff"/></View></View>:isNew?<View style={s.tabInner}><Text style={[s.tabText,{alignSelf:'flex-start'}]}>New</Text><Text style={[s.tabText,{alignSelf:'flex-end'}]}>Arrivals</Text></View>:<View style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center'}}><Text style={s.tabText}>{tab.label}</Text>{isFlash&&<MaterialIcons name="bolt" size={20} color={MAGENTA} style={{marginLeft:3,marginTop:2}}/>}</View>}
      </Pressable>})}
      <Pressable style={{paddingLeft:8,paddingBottom:16}}><Text style={s.tabText}>Categories...</Text></Pressable><View style={{width:12}}/>
    </ScrollView>
  </View>;
}

const SLOGANS=['Buy Happiness','Wantiss','Sell Joy'];
const SLOGAN_PAD=[3,0,0];
const SLOGAN_W=211.6;
const SLOGAN_H=47;
const PAGE_H=SLOGAN_H;
const SLOTS=[0,1];

function SloganCarousel(){
  const[base,setBase]=useState(0);
  const a=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const id=setInterval(()=>{Animated.timing(a,{toValue:1,duration:800,easing:Easing.linear,useNativeDriver:true}).start(({finished})=>{if(finished){a.setValue(0);setBase(b=>b+1);}})},3800);return()=>clearInterval(id)},[a]);
  return <View style={{width:SLOGAN_W,height:SLOGAN_H,overflow:'hidden'}}>{SLOTS.map(d=>{const idx=(base+d)%3;return <Animated.View key={`${base}-${d}`} style={{position:'absolute',left:0,right:0,top:0,height:PAGE_H,justifyContent:'center',paddingLeft:SLOGAN_PAD[idx],transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[d*PAGE_H,(d-1)*PAGE_H]})}]}}><Text numberOfLines={1} style={{fontFamily:F_MONT_ITALIC,fontSize:14,color:'#000',letterSpacing:0}}>{SLOGANS[idx]}</Text></Animated.View>})}</View>;
}

function SearchBar(){
  const[query,setQuery]=useState('');
  const showCarousel=query.length===0;
  return <View style={s.search}>
    <View style={{paddingLeft:3}}><MaterialCommunityIcons name="line-scan" size={30} color={MAGENTA}/></View>
    <View style={{paddingHorizontal:5}}><View style={{width:1.8,height:30,backgroundColor:'rgba(204,204,204,0.8)'}}/></View>
    <View style={{width:SLOGAN_W,height:SLOGAN_H,position:'relative'}}>{showCarousel&&<View style={StyleSheet.absoluteFill} pointerEvents="none"><SloganCarousel/></View>}<TextInput value={query} onChangeText={setQuery} style={s.searchInput} selectionColor={MAGENTA} underlineColorAndroid="transparent" autoCorrect={false}/></View>
    <View style={{paddingTop:4,paddingRight:4}}><MaterialCommunityIcons name="camera-outline" size={25} color="rgba(136,136,142,0.635)"/></View>
    <Pressable style={s.searchBtn}><Text numberOfLines={1} style={s.searchBtnText}>search</Text></Pressable>
  </View>;
}

const COLUMNS=5,DRAG_SENSITIVITY=850,ROW_H=78,INDICATOR_H=10,TEASER_H=156;
const COLLAPSED_H=ROW_H+INDICATOR_H;
const EXPANDED_CONTENT_H=ROW_H*3;
const EXPANDED_H=EXPANDED_CONTENT_H+INDICATOR_H;
const BASE='https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';
const ASSETS:Record<string,string>={Goodies:BASE+'Goodies.PNG',Woulib:BASE+'Woulib.PNG',Services:BASE+'Services.PNG',Globiz:BASE+'Globiz.PNG',Konsoliss:BASE+'Konsoliss.PNG',Stays:BASE+'stays.PNG',Flyz:BASE+'Flyz.PNG',Habita:BASE+'Habita.PNG',Rideza:BASE+'Rideza%20.PNG',Frenzies:BASE+'Frenzies.PNG','Arts & Lits':BASE+'Arts_lits.PNG',Streamz:BASE+'Streamz.PNG',Gatherz:BASE+'Gatherz.PNG',Glowz:BASE+'Glowz.PNG',Prezo:BASE+'Prezo%20.PNG','Top Up':BASE+'Topup.PNG',Deals:BASE+'Deals.PNG',Bidz:BASE+'Bidz.PNG',Lutz:BASE+'Lutz.PNG',More:BASE+'More.PNG'};
const COLLAPSED:{label:string;icon:MI}[]=[{label:'Goodies',icon:'card-giftcard'},{label:'Woulib',icon:'shopping-bag'},{label:'Services',icon:'miscellaneous-services'},{label:'Globiz',icon:'language'},{label:'Konsoliss',icon:'people-outline'}];
const EXPANDED:{label:string;icon:MI}[]=[{label:'Stays',icon:'home'},{label:'Flyz',icon:'flight'},{label:'Habita',icon:'hotel'},{label:'Rideza',icon:'directions-car'},{label:'Frenzies',icon:'people'},{label:'Arts & Lits',icon:'palette'},{label:'Streamz',icon:'play-circle-filled'},{label:'Gatherz',icon:'event'},{label:'Glowz',icon:'lightbulb'},{label:'Prezo',icon:'card-giftcard'},{label:'Top Up',icon:'account-balance-wallet'},{label:'Deals',icon:'local-offer'},{label:'Bidz',icon:'gavel'},{label:'Lutz',icon:'shopping-basket'},{label:'More',icon:'more-horiz'}];
const FEATURED_COLORS=['#E8C7D8','#D8B7E0','#C9A8DE'];
const FEATURED_CAPTIONS=['from $9','from $15','from $6'];
const FLASH_COLORS=['#F0D9A0','#E8C888','#F2E2B8'];
const FLASH_CAPTIONS=['up to $10 off','up to $20 off','up to $5 off'];

function CategoryItem({label,icon,width,onPress}:{label:string;icon:MI;width:number;onPress?:()=>void}){
  const uri=ASSETS[label]; const[loaded,setLoaded]=useState(false); const[failed,setFailed]=useState(false);
  return <Pressable onPress={onPress} style={{width,height:ROW_H,alignItems:'center',paddingTop:5}}><View style={s.catCircle}>{(!loaded||failed||!uri)&&<MaterialIcons name={icon} size={28} color={BLACK87}/>} {!!uri&&!failed&&<Image source={{uri}} style={[StyleSheet.absoluteFill,{borderRadius:26,opacity:loaded?1:0}]} resizeMode="cover" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}</View><Text numberOfLines={1} style={s.catLabel}>{label}</Text></Pressable>;
}

function FadeSwap({color}:{color:string}){
  const[layers,setLayers]=useState<{prev:string|null;cur:string}>({prev:null,cur:color});
  const t=useRef(new Animated.Value(1)).current;
  useEffect(()=>{if(color===layers.cur)return;setLayers({prev:layers.cur,cur:color});t.setValue(0);Animated.timing(t,{toValue:1,duration:400,useNativeDriver:true}).start(({finished})=>{if(finished)setLayers(l=>({prev:null,cur:l.cur}))});},[color]);
  return <View style={{flex:1}}>{layers.prev&&<View style={[StyleSheet.absoluteFill,{backgroundColor:layers.prev}]}/>}<Animated.View style={[StyleSheet.absoluteFill,{backgroundColor:layers.cur,opacity:layers.prev?t:1}]}/></View>;
}

function TeaserCard({label,icon,background,color,caption,onPressInner}:{label:string;icon:React.ReactNode;background:string;color:string;caption:string;onPressInner:()=>void}){
  return <View style={[s.teaserCard,{backgroundColor:background}]}><View style={{flexDirection:'row',alignItems:'center'}}>{icon}<Text style={{fontSize:11,fontWeight:'600',marginLeft:4,color:BLACK87}}>{label}</Text></View><Pressable onPress={onPressInner} style={{flex:1,marginTop:6,marginBottom:4}}><View style={{flex:1,borderRadius:8,overflow:'hidden'}}><FadeSwap color={color}/></View></Pressable><Text style={{fontSize:10,fontWeight:'500',color:BLACK87}}>{caption}</Text></View>;
}

type Entry={key:string;label:string;icon:MI;kind:'collapsed'|'stays'|'row1'|'grid';x0:number;x1:number;y0:number;y1:number};

function MainDragCarousel({p,onDragActive}:{p:Animated.Value;onDragActive:(v:boolean)=>void}){
  const{width}=useWindowDimensions(); const ew=width/COLUMNS; const cw=width/5.59; const pv=useRef(0); const lastDx=useRef(0); const dragCb=useRef(onDragActive); dragCb.current=onDragActive;
  const[flags,setFlags]=useState({zoneFull:false,collapsedOn:true,expandedOn:false});
  useEffect(()=>{const id=p.addListener(({value})=>{pv.current=value;const f={zoneFull:value>0.5,collapsedOn:value<=0.3,expandedOn:value>=0.15};setFlags(prev=>prev.zoneFull===f.zoneFull&&prev.collapsedOn===f.collapsedOn&&prev.expandedOn===f.expandedOn?prev:f)});return()=>p.removeListener(id)},[p]);
  const settle=(target:number)=>{p.stopAnimation();Animated.timing(p,{toValue:target,duration:450,easing:EASE_OUT_CUBIC,useNativeDriver:false}).start()};
  const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>false,onMoveShouldSetPanResponder:(_e,g)=>Math.abs(g.dx)>6&&Math.abs(g.dx)>Math.abs(g.dy)*1.2,onPanResponderTerminationRequest:()=>false,onPanResponderGrant:()=>{p.stopAnimation();lastDx.current=0;dragCb.current(true)},onPanResponderMove:(_e,g)=>{const d=g.dx-lastDx.current;lastDx.current=g.dx;const next=Math.min(1,Math.max(0,pv.current-d/DRAG_SENSITIVITY));p.setValue(next)},onPanResponderRelease:(_e,g)=>{dragCb.current(false);const v=g.vx*1000;let target:number;if(v<-200)target=1;else if(v>200)target=0;else target=pv.current>=0.5?1:0;settle(target)},onPanResponderTerminate:()=>{dragCb.current(false);settle(pv.current>=0.5?1:0)} }),[]);
  const entries=useMemo<Entry[]>(()=>{const list:Entry[]=[];COLLAPSED.forEach((c,i)=>list.push({key:c.label,label:c.label,icon:c.icon,kind:'collapsed',x0:i*cw,x1:(i-5)*ew,y0:0,y1:0}));EXPANDED.forEach((e,index)=>{const row=Math.floor(index/COLUMNS),col=index%COLUMNS;if(index===0)list.push({key:e.label,label:e.label,icon:e.icon,kind:'stays',x0:5*cw,x1:0,y0:0,y1:0});else if(row===0)list.push({key:e.label,label:e.label,icon:e.icon,kind:'row1',x0:(5+col)*cw,x1:col*ew,y0:0,y1:0});else list.push({key:e.label,label:e.label,icon:e.icon,kind:'grid',x0:(6+col)*cw,x1:col*ew,y0:0,y1:row*ROW_H})});return list},[cw,ew]);
  const height=p.interpolate({inputRange:[0,1],outputRange:[COLLAPSED_H,EXPANDED_H]});
  const indY=p.interpolate({inputRange:[0,1],outputRange:[ROW_H,EXPANDED_CONTENT_H]});
  const indOpacity=p.interpolate({inputRange:[0,.75,1],outputRange:[1,.25,1]});
  const lineColor=p.interpolate({inputRange:[0,1],outputRange:[MAGENTA,'#E0E0E0']});
  const dotColor=p.interpolate({inputRange:[0,1],outputRange:['#E0E0E0',MAGENTA]});
  return <Animated.View style={{width,height,overflow:'hidden'}}>
    <View {...pan.panHandlers} style={{position:'absolute',left:0,top:0,width,height:flags.zoneFull?EXPANDED_CONTENT_H:ROW_H}}>
      {entries.map(e=>{const translateX=p.interpolate({inputRange:[0,1],outputRange:[e.x0,e.x1]});const translateY=p.interpolate({inputRange:[0,1],outputRange:[e.y0,e.y1]});let opacity:Animated.AnimatedInterpolation<number>|number;let active=true;if(e.kind==='collapsed'){opacity=p.interpolate({inputRange:[0,.5],outputRange:[1,0],extrapolate:'clamp'});active=flags.collapsedOn}else if(e.kind==='stays')opacity=1;else{opacity=p.interpolate({inputRange:[0,1],outputRange:[0,1],extrapolate:'clamp'});active=flags.expandedOn}return <Animated.View key={e.key} pointerEvents={active?'box-none':'none'} style={{position:'absolute',left:0,top:0,width:ew,height:ROW_H,opacity,transform:[{translateX},{translateY}]}}><CategoryItem label={e.label} icon={e.icon} width={ew} onPress={()=>console.log('Tapped',e.label)}/></Animated.View>})}
    </View>
    <Animated.View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,height:INDICATOR_H,alignItems:'center',justifyContent:'center',flexDirection:'row',opacity:indOpacity,transform:[{translateY:indY}]}}><Animated.View style={{width:14,height:4,marginHorizontal:2,borderRadius:2,backgroundColor:lineColor}}/><Animated.View style={{width:6,height:6,marginHorizontal:2,borderRadius:3,backgroundColor:dotColor}}/></Animated.View>
  </Animated.View>;
}

function TeaserRow({p}:{p:Animated.Value}){
  const[featuredIndex,setFeaturedIndex]=useState(0); const flashIndex=useRef(pick(FLASH_COLORS)).current; const[on,setOn]=useState(true);
  useEffect(()=>{const id=setInterval(()=>setFeaturedIndex(i=>(i+1)%FEATURED_COLORS.length),2500);const l=p.addListener(({value})=>setOn(value<=0.85));return()=>{clearInterval(id);p.removeListener(l)}},[p]);
  const height=p.interpolate({inputRange:[0,1],outputRange:[TEASER_H,0]}); const opacity=p.interpolate({inputRange:[0,1],outputRange:[1,0]});
  return <Animated.View pointerEvents={on?'auto':'none'} style={{height,opacity,overflow:'hidden'}}><View style={{height:TEASER_H,flexDirection:'row'}}><View style={{flex:1}}><TeaserCard label="featured picks" icon={<MaterialIcons name="auto-awesome" size={14} color={BLACK87}/>} background="#FBEAF0" color={FEATURED_COLORS[featuredIndex]} caption={FEATURED_CAPTIONS[featuredIndex]} onPressInner={()=>console.log('Tapped featured picks')}/></View><View style={{flex:1}}><TeaserCard label="flash deals" icon={<MaterialCommunityIcons name="clock" size={14} color={BLACK87}/>} background="#FCEFD9" color={FLASH_COLORS[flashIndex]} caption={FLASH_CAPTIONS[flashIndex]} onPressInner={()=>console.log('Tapped flash deals')}/></View></View></Animated.View>;
}

const CARD_COLORS=['#D8CFC0','#C9CEDD','#D9D9D9'];
const CARD_CAPTIONS=['$51.9 off','$10.5 off','$43.9 off'];
const NOTIFICATIONS=['new season styles, up to 20% off','free shipping on orders over $50','limited time: buy 1 get 1 half off'];
function MainPromoBanner(){
  const indices=useRef(CARD_CAPTIONS.map(()=>pick(CARD_COLORS))).current; const[msg,setMsg]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setMsg(m=>(m+1)%NOTIFICATIONS.length),3000);return()=>clearInterval(id)},[]);
  return <View style={s.banner}><View style={{flexDirection:'row'}}><Pressable style={[s.voucher,{marginRight:6}]}><Text style={{fontSize:18,fontWeight:'bold',color:LAVENDER}}>$7</Text><Text style={{fontSize:10,textAlign:'center',marginTop:2,color:BLACK87}}>{'grocery\\nvoucher'}</Text></Pressable>{CARD_CAPTIONS.map((cap,i)=><Pressable key={cap} style={[s.imgCard,{marginRight:i<CARD_CAPTIONS.length-1?6:0}]}><View style={{flex:1,backgroundColor:CARD_COLORS[indices[i]]}}/><Text style={{fontSize:10,fontWeight:'600',paddingHorizontal:6,paddingVertical:4,color:BLACK87}}>{cap}</Text></Pressable>)}</View><Pressable style={s.notif}><MaterialIcons name="volume-up" size={16} color="#fff"/><View style={{flex:1,marginLeft:8,marginRight:6}}><CyclingText text={NOTIFICATIONS[msg]} lineHeight={16} offset={1} duration={500} style={{color:'#fff',fontSize:12}}/></View><MaterialIcons name="chevron-right" size={16} color="#fff"/></Pressable></View>;
}

const POPUP_MESSAGES=['spend $80, save $10 — claim now','free delivery on your next order','new members get 15% off today'];
const SUPPRESS_MS=8*60*60*1000;
const DISMISS_KEY='promoPopupDismissedAt';
function MainPromoPopup(){
  const[visible,setVisible]=useState(false); const[msg,setMsg]=useState(0); const anim=useRef(new Animated.Value(0)).current;
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined;let alive=true;(async()=>{let show=true;try{const raw=await AsyncStorage.getItem(DISMISS_KEY);if(raw&&Date.now()-Number(raw)<SUPPRESS_MS)show=false}catch{}if(show&&alive){timer=setTimeout(()=>{if(!alive)return;setVisible(true);Animated.timing(anim,{toValue:1,duration:500,easing:EASE_OUT_CUBIC,useNativeDriver:true}).start()},600)}})();const id=setInterval(()=>setMsg(m=>(m+1)%POPUP_MESSAGES.length),3000);return()=>{alive=false;if(timer)clearTimeout(timer);clearInterval(id)}},[anim]);
  const dismiss=()=>{Animated.timing(anim,{toValue:0,duration:500,easing:EASE_OUT_CUBIC,useNativeDriver:true}).start(async()=>{setVisible(false);try{await AsyncStorage.setItem(DISMISS_KEY,String(Date.now()))}catch{}})};
  if(!visible)return null;
  return <Animated.View style={[s.popup,{opacity:anim.interpolate({inputRange:[0,1],outputRange:[0,1]}),transform:[{translateY:anim.interpolate({inputRange:[0,1],outputRange:[40,0]})}]}]}><View style={s.promoBadge}><Text style={{color:'#fff',fontSize:11,fontWeight:'600'}}>promo</Text></View><Pressable style={{flex:1,marginLeft:4,justifyContent:'center'}}><CyclingText text={POPUP_MESSAGES[msg]} lineHeight={16} offset={.5} duration={400} style={{color:LAVENDER,fontSize:12,fontWeight:'500'}}/></Pressable><Pressable onPress={dismiss} style={{marginLeft:8}} hitSlop={10}><MaterialIcons name="close" size={16} color={MAGENTA}/></Pressable></Animated.View>;
}

const WANTISS_LOGO=BASE+'WantisslogoOuterless.PNG';
const NAV_MUTED = '#9A96A3';
const MESSAGE_UNREAD_COUNT = 1;
function NavLabel({children,style}:{children:string;style?:object}){return <Text style={[s.navLabel,style]}>{children}</Text>}
function MessageBadge({count}:{count:number}){if(count<=0)return null;const label=count>99?'99+':String(count);return <View style={s.messageBadge}><Text style={s.messageBadgeText}>{label}</Text></View>}
function BottomNav({onMePress,activeNav}:{onMePress?:()=>void;activeNav:'home'|'me'}){
  return <View style={{paddingHorizontal:2}}><View style={s.nav}>
    <View style={s.homeButton}><View style={s.homeCircle}><Image source={{uri:WANTISS_LOGO}} style={s.homeLogo} resizeMode="contain"/></View></View>
    <Pressable style={s.navButton}><MaterialCommunityIcons name="television-play" size={29} color={NAV_MUTED}/><NavLabel>Showcase</NavLabel></Pressable>
    <Pressable style={s.navButton}><View style={s.messageIconWrap}><MaterialCommunityIcons name="message-text-outline" size={27} color={NAV_MUTED}/><MessageBadge count={MESSAGE_UNREAD_COUNT}/></View><NavLabel>Messages</NavLabel></Pressable>
    <Pressable style={s.navButton}><MaterialCommunityIcons name="cart-outline" size={29} color={NAV_MUTED}/><NavLabel>Cart</NavLabel></Pressable>
    <Pressable onPress={onMePress} style={s.navButton}><MaterialCommunityIcons name="emoticon-happy-outline" size={29} color={activeNav==='me'?MAGENTA:NAV_MUTED}/><NavLabel>Me</NavLabel></Pressable>
  </View></View>;
}

export default function HomeScreen({onMePress}:{onMePress?:()=>void}){
  const{width}=useWindowDimensions(); const[scrollLocked,setScrollLocked]=useState(false); const p=useRef(new Animated.Value(0)).current;
  const colW=(width-16-12)/2;
  const masonry:{h:number;c:string}[][]=[[
    {h:190,c:'#FCEFD9'},{h:250,c:ALTERNATE},{h:200,c:'#F3F3F3'}],[
    {h:250,c:ALTERNATE},{h:190,c:'#FCEFD9'},{h:240,c:ALTERNATE}]];
  return <View style={{flex:1,backgroundColor:'#fff'}}>
    <StatusBar style="dark"/>
    <MainTabSelector/>
    <View style={{paddingHorizontal:12,marginTop:8}}><SearchBar/></View>
    <ScrollView scrollEnabled={!scrollLocked} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:170}}>
      <View style={{marginTop:6}}><MainDragCarousel p={p} onDragActive={setScrollLocked}/></View>
      <TeaserRow p={p}/>
      <View style={{marginHorizontal:6,marginTop:6}}><MainPromoBanner/></View>
      <View style={{paddingHorizontal:8,paddingTop:8,flexDirection:'row'}}>{masonry.map((col,ci)=><View key={ci} style={{width:colW,marginRight:ci===0?12:0}}>{col.map((card,k)=><View key={k} style={{height:card.h,backgroundColor:card.c,borderRadius:12,marginBottom:12}}/>)}</View>)}</View>
    </ScrollView>
    <View pointerEvents="box-none" style={{position:'absolute',left:8,right:23,bottom:102,height:40}}><MainPromoPopup/></View>
    <View style={{position:'absolute',left:0,right:0,bottom:18}}><BottomNav onMePress={onMePress} activeNav="home"/></View>
  </View>;
}

const s=StyleSheet.create({
  tabBar:{height:100,backgroundColor:PINK_BG,flexDirection:'row',alignItems:'flex-end'},
  tab:{height:50,marginRight:8,borderTopLeftRadius:30,borderTopRightRadius:50},
  tabInner:{flex:1,paddingHorizontal:6,paddingVertical:6,justifyContent:'space-between'},
  tabText:{fontSize:16,fontWeight:'500',color:BLACK87},
  liveBadge:{width:45,height:18,borderRadius:4,backgroundColor:GOLD,alignItems:'center',justifyContent:'center',alignSelf:'flex-end'},
  search:{width:'100%',height:47,borderRadius:10,borderWidth:1.75,borderColor:GOLD,backgroundColor:'rgba(255,255,255,0)',flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',paddingLeft:2,paddingRight:1.5,overflow:'hidden'},
  searchInput:{position:'absolute',left:0,right:0,top:0,bottom:0,paddingHorizontal:3,paddingVertical:0,fontFamily:F_MONT_ITALIC,fontSize:14,color:'#000'},
  searchBtn:{height:30,width:56,flexShrink:0,paddingHorizontal:0,marginRight:1.5,borderRadius:8,backgroundColor:MAGENTA,alignItems:'center',justifyContent:'center'},
  searchBtnText:{color:'#fff',fontSize:12,fontFamily:F_INTER_TIGHT,letterSpacing:0},
  catCircle:{width:52,height:52,borderRadius:26,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  catLabel:{marginTop:5,fontSize:11,fontWeight:'600',color:'#3A3A3A',textAlign:'center',width:'100%'},
  teaserCard:{flex:1,marginLeft:8,marginRight:4,marginTop:8,marginBottom:8,padding:8,borderRadius:12},
  banner:{height:150,padding:10,paddingTop:16,borderRadius:16,backgroundColor:LAVENDER},
  voucher:{flex:1,height:90,padding:8,borderRadius:10,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
  imgCard:{flex:1,height:90,borderRadius:10,backgroundColor:'#fff',overflow:'hidden'},
  notif:{marginTop:8,paddingHorizontal:10,paddingVertical:8,borderRadius:8,backgroundColor:'rgba(0,0,0,0.12)',flexDirection:'row',alignItems:'center'},
  popup:{paddingHorizontal:10,paddingVertical:8,borderRadius:30,backgroundColor:PINK_BG,flexDirection:'row',alignItems:'center'},
  promoBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:20,backgroundColor:MAGENTA},
  nav:{height:70,borderRadius:18,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',elevation:5,shadowColor:'#000',shadowOpacity:.13,shadowRadius:5,shadowOffset:{width:0,height:2}},
  homeButton:{width:64,height:60,alignItems:'center'},homeCircle:{marginTop:2,width:56,height:56,borderRadius:28,borderWidth:1,borderColor:'#E8CFE0',alignItems:'center',justifyContent:'center',overflow:'hidden'},homeLogo:{width:54,height:54,borderRadius:27},
  navButton:{width:68,height:46,alignItems:'center',justifyContent:'flex-end'},messageIconWrap:{width:30,height:29,alignItems:'center',justifyContent:'center'},messageBadge:{position:'absolute',top:-5,right:-9,minWidth:16,height:16,paddingHorizontal:4,borderRadius:8,backgroundColor:MAGENTA,alignItems:'center',justifyContent:'center'},messageBadgeText:{color:'#FFFFFF',fontSize:9,lineHeight:11,fontWeight:'700'},navLabel:{paddingTop:4,fontSize:10.5,color:'#1F1E1E',fontFamily:F_INTER,textAlign:'center'},
});
