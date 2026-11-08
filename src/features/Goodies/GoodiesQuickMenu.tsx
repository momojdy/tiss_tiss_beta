import React from 'react';
import {Image, Modal, Pressable, ScrollView, Text, View} from 'react-native';
import {Icon} from './components/Icon';
import {useTheme} from './components/ui';
import {S, unread} from './store';
import * as A from './actions';

export type GoodiesMenuAction = 'home'|'messages'|'notifications'|'wallet'|'saved'|'orders'|'activity'|'help'|'feedback'|'business';
export default function GoodiesQuickMenu({visible, close, onUniversalAction, unreadNotifications = 0, unreadMessages = 0}: {visible:boolean;close:()=>void;onUniversalAction?: (action:GoodiesMenuAction)=>void;unreadNotifications?:number;unreadMessages?:number}) {
  const th = useTheme();
  const top = [{key:'home',label:'',icon:'home'},{key:'messages',label:'Messages',icon:'msg'},{key:'notifications',label:'Notifications',icon:'bell'},{key:'wallet',label:'Wallet',icon:'wallet'},{key:'saved',label:'Saved',icon:'heart'}];
  const bottom = [{key:'orders',label:'My Orders',icon:'bag'},{key:'activity',label:'Recent Activity',icon:'clock'},{key:'help',label:'Help Center',icon:'help'},{key:'feedback',label:'Feedback',icon:'msg'},{key:'business',label:'Business Space',icon:'bag'},{key:'dark',label:'Dark Mode',icon:'moon'}];
  const activate = (key:string) => {
    close();
    if(key==='dark'){S.theme=S.theme==='dark'?'light':'dark';require('./store').emit();require('./store').save();return;}
    if(onUniversalAction){onUniversalAction(key as GoodiesMenuAction);return;}
    if(key==='saved') A.go('favs');
    else if(key==='orders') A.tab('orders');
    else if(key==='notifications') A.go('notifs');
    else if(key==='help') A.go('help');
  };
  const tile = (item:{key:string;label:string;icon:string}) => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label||'Wantiss Home'} onPress={()=>activate(item.key)} style={{width:76,minHeight:80,alignItems:'center',justifyContent:'center',gap:8}}>
    {item.key==='home'?<Image source={{uri:'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG'}} style={{width:48,height:48}} resizeMode="contain"/>:<View style={{height:32,justifyContent:'center'}}><Icon name={item.icon} size={26} color={th.ink}/></View>}
    {item.key==='notifications'&&unreadNotifications>0?<Text style={{position:'absolute',top:0,right:0,fontSize:12,fontWeight:'600',color:'#FD802E'}}>{unreadNotifications>99?'99+':unreadNotifications}</Text>:null}
    {item.key==='messages'&&unreadMessages>0?<View style={{position:'absolute',top:5,right:12,width:7,height:7,borderRadius:4,backgroundColor:'#FD802E'}}/>:null}
    <Text style={{fontSize:10,color:th.ink,textAlign:'center'}}>{item.label}</Text>
  </Pressable>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,8,25,0.45)'}}><Pressable style={{flex:1}} onPress={close}/><View style={{backgroundColor:S.theme==='dark'?'rgba(38,26,61,0.96)':'rgba(238,226,255,0.96)',borderTopLeftRadius:26,borderTopRightRadius:26,paddingTop:14,paddingBottom:28}}><View style={{width:38,height:4,borderRadius:3,backgroundColor:'#BCA5D9',alignSelf:'center',marginBottom:20}}/><View style={{flexDirection:'row',justifyContent:'space-around'}}>{top.map(tile)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12,paddingTop:12}}>{bottom.map(tile)}</ScrollView><Pressable onPress={close} style={{marginHorizontal:16,marginTop:14,padding:14,backgroundColor:th.card,borderRadius:14,alignItems:'center'}}><Text style={{color:th.ink}}>Cancel</Text></Pressable></View></View></Modal>;
}
