import React,{useState} from 'react';
import {Image,Modal,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ThinMenuIcon} from '../../shared/quickMenu/ThinMenuIcon';
import {primaryQuickActions,secondaryQuickActions,type QuickMenuAction,type QuickMenuInbox} from '../../shared/quickMenu/menuContract';
import {sans,type Palette} from './design';

type Props={inline?:boolean;visible:boolean;close:()=>void;onAction:(action:QuickMenuAction)=>void;p:Palette;dark:boolean;reducedMotion:boolean;inbox:QuickMenuInbox};
export default function ArtsLitsQuickMenu({visible,close,onAction,p,dark,reducedMotion,inbox,inline=false}:Props){
 const insets=useSafeAreaInsets(),{height}=useWindowDimensions();
 const [logoFailed,setLogoFailed]=useState(false);
 const tile=([key,label,icon]:readonly [QuickMenuAction,string,string],primary:boolean)=>{
  const count=inbox.status==='ready'?(key==='messages'?inbox.messages:key==='notifications'?inbox.notifications:0):0;
  return <Pressable key={key} testID={'arts-lits-menu-'+key} accessibilityRole="button" accessibilityLabel={key==='dark'?(dark?'Switch to light mode':'Switch to dark mode'):label} accessibilityState={key==='dark'?{selected:dark}:undefined} accessibilityHint={count>0?count+' unread':undefined} onPress={()=>{close();onAction(key);}} style={{width:primary?'20%':76,alignItems:'center',minHeight:78,gap:8,paddingHorizontal:2}}>
   {key==='home'?<View style={{width:56,height:56,borderRadius:28,borderWidth:1,borderColor:p.line,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{logoFailed?<Text style={{fontSize:22,fontWeight:'800',color:p.teal}}>W</Text>:<Image source={{uri:'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG'}} style={{width:54,height:54,borderRadius:27}} resizeMode="contain" onError={()=>setLogoFailed(true)} accessible={false}/>}</View>:<ThinMenuIcon name={key==='dark'&&dark?'sun':icon} color={p.teal}/>}
   {count>0?<View style={{position:'absolute',top:-8,right:2,minWidth:25,height:20,borderRadius:10,paddingHorizontal:5,backgroundColor:key==='notifications'?inbox.notificationColor:inbox.messageColor,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:11,fontWeight:'700',color:'#FFFFFF'}}>{count>99?'99+':count}</Text></View>:null}
   {key!=='home'?<Text style={{fontFamily:sans,fontSize:10,fontWeight:'600',color:p.ink,textAlign:'center'}}>{label}</Text>:null}
  </Pressable>;
 };
 if(!visible)return null;
 const content=<View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,8,25,0.45)'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={close} style={{flex:1}}/>
   <View accessibilityViewIsModal style={{backgroundColor:p.paper,borderTopLeftRadius:26,borderTopRightRadius:26,paddingTop:12,paddingBottom:Math.max(28,insets.bottom+12),maxHeight:height*.88}}>
    <View style={{width:38,height:4,borderRadius:3,backgroundColor:p.teal,alignSelf:'center',marginBottom:22}}/>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
     <View style={{flexDirection:'row',paddingHorizontal:12}}>{primaryQuickActions.map(x=>tile(x,true))}</View>
     {inbox.status==='unavailable'?<Pressable accessibilityRole="button" onPress={inbox.retry} style={{paddingHorizontal:16,paddingVertical:8,minHeight:44}}><Text style={{fontFamily:sans,color:p.teal,fontSize:11}}>Unread counts unavailable · Retry</Text></Pressable>:null}
     {inbox.status==='loading'?<Text accessibilityLiveRegion="polite" style={{fontFamily:sans,color:p.muted,fontSize:11,paddingHorizontal:16,paddingVertical:8}}>Loading unread counts…</Text>:null}
     <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{paddingHorizontal:12,paddingTop:12}}>{secondaryQuickActions.map(x=>tile(x,false))}</ScrollView>
     <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={close} style={{marginHorizontal:16,marginTop:14,padding:14,minHeight:44,backgroundColor:p.plaque,borderRadius:14,alignItems:'center',borderWidth:1,borderColor:p.line}}><Text style={{fontFamily:sans,color:p.teal,fontWeight:'700'}}>Cancel</Text></Pressable>
    </ScrollView>
   </View>
  </View>;
 // A detail page already uses a native Modal. Keep the menu in that same
 // presentation layer rather than trying to present a second native modal.
 if(inline)return <View testID="arts-lits-inline-quick-menu" style={{position:'absolute',top:0,right:0,bottom:0,left:0,zIndex:150,elevation:20}}>{content}</View>;
 return <Modal visible={visible} transparent animationType={reducedMotion?'none':'slide'} onRequestClose={close}>{content}</Modal>;
}
