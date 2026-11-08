import React from 'react';
import {Image, Modal, Pressable, ScrollView, Text, View} from 'react-native';
import {ThinMenuIcon} from '../gatherz/GatherzQuickMenu';
import {useTheme} from './components/ui';
import {S, unread} from './store';
import * as A from './actions';

export type GoodiesMenuAction = 'home'|'messages'|'notifications'|'wallet'|'saved'|'orders'|'activity'|'help'|'feedback'|'business';
export default function GoodiesQuickMenu({visible, close, onUniversalAction, unreadNotifications = 0, unreadMessages = 0}: {visible:boolean;close:()=>void;onUniversalAction?: (action:GoodiesMenuAction)=>void;unreadNotifications?:number;unreadMessages?:number}) {
  const th = useTheme();
  const top = [{key:'home',label:'Home',icon:'home'},{key:'messages',label:'Messages',icon:'message-circle'},{key:'notifications',label:'Notifications',icon:'bell'},{key:'wallet',label:'Wallet',icon:'credit-card'},{key:'saved',label:'Saved',icon:'heart'}];
  const bottom = [{key:'orders',label:'My Orders',icon:'package'},{key:'activity',label:'Recent Activity',icon:'clock'},{key:'help',label:'Help Center',icon:'help-circle'},{key:'feedback',label:'Feedback',icon:'edit-3'},{key:'business',label:'Business Space',icon:'briefcase'},{key:'dark',label:'Dark Mode',icon:S.theme==='dark'?'sun':'moon'}];
  const activate = (key:string) => {
    close();
    if(key==='dark'){S.theme=S.theme==='dark'?'light':'dark';require('./store').emit();require('./store').save();return;}
    if(onUniversalAction){onUniversalAction(key as GoodiesMenuAction);return;}
    if(key==='saved') A.go('favs');
    else if(key==='orders') A.tab('orders');
    else if(key==='notifications') A.go('notifs');
    else if(key==='help') A.go('help');
  };
  const tile = (item:{key:string;label:string;icon:string}, topRow:boolean) => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={()=>activate(item.key)} style={{width:topRow?'20%':76,alignItems:'center',minHeight:78,gap:8}}>
    {item.key==='home'?<View style={{width:56,height:56,borderRadius:28,borderWidth:1,borderColor:'#F7C6A1',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><Image source={{uri:'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG'}} style={{width:54,height:54,borderRadius:27}} resizeMode="contain"/></View>:<ThinMenuIcon name={item.icon} color={S.theme==='dark'?'#FFF1E5':'#71340D'}/>}
    {item.key==='notifications'&&unreadNotifications>0?<View style={{position:'absolute',top:-8,right:2,minWidth:24,height:19,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12,fontWeight:'700',color:'#BD279F'}}>{unreadNotifications>99?'99+':unreadNotifications}</Text></View>:null}
    {item.key==='messages'&&unreadMessages>0?<View style={{position:'absolute',top:0,right:15,width:7,height:7,borderRadius:4,backgroundColor:'#BD279F'}}/>:null}
    {item.key!=='home'?<Text style={{fontSize:10,fontWeight:'600',color:S.theme==='dark'?'#FFF1E5':'#71340D',textAlign:'center'}}>{item.label}</Text>:null}
  </Pressable>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,8,25,0.45)'}}><Pressable accessibilityLabel="Close menu" style={{flex:1}} onPress={close}/><View style={{backgroundColor:S.theme==='dark'?'rgba(85,40,18,0.94)':'rgba(255,225,198,0.94)',borderTopLeftRadius:26,borderTopRightRadius:26,paddingTop:12,paddingBottom:28}}><View style={{width:38,height:4,borderRadius:3,backgroundColor:S.theme==='dark'?'#B97446':'#D69B71',alignSelf:'center',marginBottom:22}}/><View style={{flexDirection:'row',paddingHorizontal:12}}>{top.map(item=>tile(item,true))}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{paddingLeft:12,paddingRight:12,paddingTop:12}}>{bottom.map(item=>tile(item,false))}</ScrollView><Pressable accessibilityRole="button" onPress={close} style={{marginHorizontal:16,marginTop:14,padding:14,backgroundColor:S.theme==='dark'?'#653114':'#FFFFFF',borderRadius:14,alignItems:'center'}}><Text style={{color:S.theme==='dark'?'#FFF1E5':'#71340D',fontWeight:'600'}}>Cancel</Text></Pressable></View></View></Modal>;
}
