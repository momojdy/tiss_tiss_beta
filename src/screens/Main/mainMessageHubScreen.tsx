import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Icon } from '../../features/Goodies/components/Icon';
import MessagesScreen from './mainMessagesScreen';
import NotificationsScreen from './mainNotificationsScreen';

const MAGENTA = '#BF008E';
export default function MessageHubScreen({ onBack, onMessagesPress, onNotificationsPress, unreadMessages, unreadNotifications, onNotificationNavigate }: {
  onBack: () => void;
  onMessagesPress: () => void;
  onNotificationsPress: () => void;
  unreadMessages: number;
  unreadNotifications: number;
  onNotificationNavigate?: (screen: string, conversationId?: string) => void;
}) {
  const [tab, setTab] = useState<'messages' | 'notifications'>('messages');
  const [detailOpen,setDetailOpen] = useState(false);
  const [actions,setActions] = useState<{contacts:()=>void;search:()=>void;menu:()=>void}|null>(null);
  const receiveActions = useCallback((next:{contacts:()=>void;search:()=>void;menu:()=>void})=>setActions(next),[]);
  return <View style={s.root}>
    {!(tab==='messages'&&detailOpen)&&<View style={s.header}>
      <Pressable onPress={onBack} hitSlop={12} style={s.back} accessibilityLabel="Back"><Icon name="chevL" size={20} color={MAGENTA}/></Pressable>
      <Text style={[s.title,{flex:1}]}>My Activity</Text>
      {tab==='messages'&&actions&&<><Pressable accessibilityLabel="Contacts" onPress={actions.contacts} style={s.action}><MaterialCommunityIcons name="card-account-details-outline" size={22} color="#302631"/></Pressable><Pressable accessibilityLabel="Search conversations" onPress={actions.search} style={s.action}><MaterialCommunityIcons name="magnify" size={23} color="#302631"/></Pressable><Pressable accessibilityLabel="Message actions" onPress={actions.menu} style={s.action}><MaterialCommunityIcons name="plus" size={24} color="#302631"/></Pressable></>}
    </View>}
    {!(tab==='messages'&&detailOpen)&&<View style={s.tabs} accessibilityRole="tablist">
      <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='messages'}} onPress={()=>setTab('messages')} style={[s.tab,tab==='messages'&&s.selected]}>
        <Text style={[s.tabText,tab==='messages'&&s.selectedText]}>Messages{unreadMessages>0?' ('+(unreadMessages>99?'99+':unreadMessages)+')':''}</Text>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='notifications'}} onPress={()=>setTab('notifications')} style={[s.tab,tab==='notifications'&&s.selected]}>
        <Text style={[s.tabText,tab==='notifications'&&s.selectedText]}>Notifications{unreadNotifications>0?' ('+(unreadNotifications>99?'99+':unreadNotifications)+')':''}</Text>
      </Pressable>
    </View>}
    <View style={s.content}>
      {tab==='messages'
        ? <MessagesScreen embedded onDetailChange={setDetailOpen} onHeaderActions={receiveActions} onBack={onMessagesPress} />
        : <NotificationsScreen embedded onBack={onNotificationsPress} onNavigate={onNotificationNavigate || ((screen)=>{if(screen==='messages')onMessagesPress();else onNotificationsPress();})}/>}
    </View>
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#FFFFFF'},
  header:{height:100,paddingHorizontal:18,paddingBottom:12,backgroundColor:'#FBE8EF',flexDirection:'row',alignItems:'flex-end',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},
  back:{width:38,height:38,alignItems:'center',justifyContent:'center',marginRight:8},
  title:{fontSize:19,fontWeight:'600',color:MAGENTA,marginBottom:6},
  tabs:{flexDirection:'row',backgroundColor:'#FFFFFF',borderBottomWidth:1,borderBottomColor:'#F0E8ED',paddingHorizontal:16},
  tab:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:15,borderBottomWidth:2,borderBottomColor:'transparent'},
  selected:{borderBottomColor:MAGENTA},
  tabText:{fontSize:14,fontWeight:'500',color:'#827783'},
  selectedText:{color:MAGENTA,fontWeight:'700'},
  action:{width:38,height:38,alignItems:'center',justifyContent:'center'},
  content:{flex:1}
});