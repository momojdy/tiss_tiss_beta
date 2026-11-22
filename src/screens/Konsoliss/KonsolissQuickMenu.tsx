import React from 'react';
import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {ThinMenuIcon} from '../../features/gatherz/GatherzQuickMenu';

export type KonsolissMenuAction='home'|'messages'|'notifications'|'wallet'|'saved'|'orders'|'activity'|'help'|'feedback'|'business';
type Props={visible:boolean;close:()=>void;onAction:(action:KonsolissMenuAction)=>void;dark:boolean;unreadNotifications?:number;unreadMessages?:number};
export default function KonsolissQuickMenu({visible,close,onAction,dark,unreadNotifications=0,unreadMessages=0}:Props){
 const accent=dark?'#FF5B4A':'#A90E02',text=dark?'#FFFBD4':'#2B1210',surface=dark?'#241A18':'#FFFBD4';
 const top=[['home','Home','home'],['messages','Messages','message-circle'],['notifications','Notifications','bell'],['wallet','Wallet','credit-card'],['saved','Saved','heart']] as const;
 const bottom=[['orders','My Orders','package'],['activity','Recent Activity','clock'],['help','Help Center','help-circle'],['feedback','Feedback','edit-3'],['business','Business Space','briefcase']] as const;
 const tile=(item:readonly [KonsolissMenuAction,string,string],primary:boolean)=>{
  const [key,label,icon]=item;const count=key==='messages'?unreadMessages:key==='notifications'?unreadNotifications:0;
  return <Pressable key={key} accessibilityRole="button" accessibilityLabel={label} onPress={()=>{close();onAction(key);}} style={{width:primary?'20%':78,alignItems:'center',minHeight:78,gap:8}}>
    <View style={{width:54,height:54,alignItems:'center',justifyContent:'center',borderRadius:27,backgroundColor:dark?'#342522':'#FBE9C9',borderWidth:1,borderColor:accent+'35'}}>
      <ThinMenuIcon name={icon} color={accent}/>
      {count>0?<View style={{position:'absolute',right:-4,top:-5,minWidth:21,height:20,borderRadius:11,backgroundColor:accent,alignItems:'center',justifyContent:'center',paddingHorizontal:3}}><Text style={{color:'#FFF',fontSize:10,fontWeight:'700'}}>{count>99?'99+':count}</Text></View>:null}
    </View>
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
