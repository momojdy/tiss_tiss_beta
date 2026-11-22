import React, {useEffect,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {ThinMenuIcon} from '../../features/gatherz/GatherzQuickMenu';
import {supabase} from '../../lib/supabase';

export type KonsolissMenuAction='home'|'messages'|'notifications'|'wallet'|'saved'|'orders'|'activity'|'help'|'feedback'|'business'|'dark';
type Props={visible:boolean;close:()=>void;onAction:(action:KonsolissMenuAction)=>void;dark:boolean;unreadNotifications?:number;unreadMessages?:number};
export default function KonsolissQuickMenu({visible,close,onAction,dark,unreadNotifications=0,unreadMessages=0}:Props){
 const [logoFailed,setLogoFailed]=useState(false);
 const [notificationColors,setNotificationColors]=useState<string[]>([]);
 const [messageColors,setMessageColors]=useState<string[]>([]);
 useEffect(()=>{
  if(!visible)return;
  let active=true;
  const palette:Record<string,string>={goodies:'#FD802E',gatherz:'#A36BE8',flyz:'#4A67B0',wallet:'#81C56C',frenzies:'#B3DF4B',konsoliss:'#DDB52B',woulib:'#FEC509',stayz:'#579BC7',glowz:'#D49E2B'};
  const load=async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!active)return;
   if(!user){setNotificationColors([]);setMessageColors([]);return;}
   const {data:notices,error:noticeError}=await supabase.from('notifications').select('feature_name').eq('user_id',user.id).eq('read',false);
   if(!active)return;
   setNotificationColors(noticeError?[]:Array.from(new Set((notices??[]).map((n:any)=>palette[String(n.feature_name??'').toLowerCase()]??'#BD279F'))));
   const {data:conversations,error:conversationError}=await supabase.from('conversations').select('id,feature_name').contains('participant_ids',[user.id]);
   if(!active)return;
   if(conversationError||!conversations?.length){setMessageColors([]);return;}
   const {data:unread,error:messageError}=await supabase.from('messages').select('conversation_id').in('conversation_id',conversations.map((c:any)=>c.id)).is('read_at',null).neq('sender_id',user.id).limit(500);
   if(!active)return;
   const ids=new Set((messageError?[]:unread??[]).map((m:any)=>m.conversation_id));
   setMessageColors(Array.from(new Set(conversations.filter((c:any)=>ids.has(c.id)).map((c:any)=>palette[String(c.feature_name??'').toLowerCase()]??'#BD279F'))));
  };
  void load();
  const channel=supabase.channel('konsoliss-menu-feature-badges').on('postgres_changes',{event:'*',schema:'public',table:'notifications'},()=>{void load();}).on('postgres_changes',{event:'*',schema:'public',table:'messages'},()=>{void load();}).subscribe();
  return()=>{active=false;void supabase.removeChannel(channel);};
 },[visible]);

 const accent=dark?'#FF5B4A':'#A90E02',text=dark?'#FFFBD4':'#2B1210',surface=dark?'#241A18':'#FFFBD4';
 const top=[['home','Home','home'],['messages','Messages','message-circle'],['notifications','Notifications','bell'],['wallet','Wallet','credit-card'],['saved','Saved','heart']] as const;
 const bottom=[['orders','My Orders','package'],['activity','Recent Activity','clock'],['help','Help Center','help-circle'],['feedback','Feedback','edit-3'],['business','Business Space','briefcase'],['dark','Dark Mode',dark?'sun':'moon']] as const;
 const tile=(item:readonly [KonsolissMenuAction,string,string],primary:boolean)=>{
  const [key,label,icon]=item;const count=key==='messages'?unreadMessages:key==='notifications'?unreadNotifications:0;
  return <Pressable key={key} accessibilityRole="button" accessibilityLabel={label} onPress={()=>{close();onAction(key);}} style={{width:primary?'20%':76,alignItems:'center',minHeight:78,gap:8}}>
    {key==='home'?<View style={{width:56,height:56,borderRadius:28,borderWidth:1,borderColor:dark?'#6B4B38':'#DDB52B',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{logoFailed?<Text style={{fontSize:22,fontWeight:'800',color:accent}}>W</Text>:<Image source={{uri:'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG'}} onError={()=>setLogoFailed(true)} style={{width:54,height:54,borderRadius:27}} resizeMode="contain"/>}</View>:<ThinMenuIcon name={icon} color={accent}/>} 
    {count>0?<View style={{position:'absolute',top:-8,right:2,minWidth:25,height:20,borderRadius:10,backgroundColor:(key==='notifications'?notificationColors[0]:messageColors[0])??'#BD279F',alignItems:'center',justifyContent:'center',paddingHorizontal:5}}><Text style={{color:'#FFFFFF',fontSize:11,fontWeight:'700'}}>{count>99?'99+':count}</Text></View>:null}
    <Text style={{fontSize:10,fontWeight:'600',color:text,textAlign:'center'}}>{label}</Text>
  </Pressable>;
 };
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
  <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,8,25,0.45)'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Close Konsoliss menu" onPress={close} style={{flex:1}}/>
   <View style={{backgroundColor:surface,borderTopLeftRadius:26,borderTopRightRadius:26,paddingTop:12,paddingBottom:28}}>
    <View style={{width:38,height:4,borderRadius:3,backgroundColor:accent,alignSelf:'center',marginBottom:22}}/>
    <View style={{flexDirection:'row',paddingHorizontal:12}}>{top.map(x=>tile(x,true))}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12,paddingTop:12}}>{bottom.map(x=>tile(x,false))}</ScrollView>
    <Pressable accessibilityRole="button" onPress={close} style={{marginHorizontal:16,marginTop:14,padding:14,backgroundColor:dark?'#342522':'#FFFFFF',borderRadius:14,alignItems:'center',borderWidth:1,borderColor:accent+'35'}}><Text style={{color:accent,fontWeight:'700'}}>Cancel</Text></Pressable>
   </View>
  </View>
 </Modal>;
}
