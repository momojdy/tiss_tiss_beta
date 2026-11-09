import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const PINK = '#FBE8EF', MAGENTA = '#BF008E', INK = '#302631', MUTED = '#827783';
export default function MessageHubScreen({ onBack, onMessagesPress, onNotificationsPress, unreadMessages, unreadNotifications }: { onBack: () => void; onMessagesPress: () => void; onNotificationsPress: () => void; unreadMessages: number; unreadNotifications: number }) {
  const insets = useSafeAreaInsets();
  return <View style={s.root}>
    <View style={[s.header,{paddingTop:insets.top}]}><Pressable onPress={onBack} hitSlop={12} style={s.back}><Ionicons name="chevron-back" size={23} color={MAGENTA}/></Pressable><Text style={s.title}>My Activity</Text></View>
    <View style={s.content}>
      <Pressable onPress={onMessagesPress} style={s.card}><View style={[s.icon,{backgroundColor:'#FBE8EF'}]}><MaterialCommunityIcons name="message-text-outline" size={25} color={MAGENTA}/></View><View style={s.copy}><Text style={s.cardTitle}>Messages</Text><Text style={s.desc}>Your conversations and chats</Text></View>{unreadMessages>0&&<View style={s.badge}><Text style={s.badgeText}>{unreadMessages>99?'99+':unreadMessages}</Text></View>}<MaterialCommunityIcons name="chevron-right" size={22} color="#A99AA6"/></Pressable>
      <Pressable onPress={onNotificationsPress} style={s.card}><View style={[s.icon,{backgroundColor:'#F5EAF8'}]}><MaterialCommunityIcons name="bell-outline" size={25} color="#9864A4"/></View><View style={s.copy}><Text style={s.cardTitle}>Notifications</Text><Text style={s.desc}>Wallet, Flyz and feature updates</Text></View>{unreadNotifications>0&&<View style={s.badge}><Text style={s.badgeText}>{unreadNotifications>99?'99+':unreadNotifications}</Text></View>}<MaterialCommunityIcons name="chevron-right" size={22} color="#A99AA6"/></Pressable>
    </View>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF'},header:{height:100,paddingHorizontal:10,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#ECEEF2'},back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:12},title:{fontSize:19,fontWeight:'600',color:MAGENTA},subtitle:{fontSize:12,color:MUTED,marginTop:3},content:{padding:16},card:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderWidth:1,borderColor:'#F0E8ED',borderRadius:15,padding:14,marginBottom:12},icon:{width:48,height:48,borderRadius:15,alignItems:'center',justifyContent:'center',marginRight:12},copy:{flex:1},cardTitle:{fontSize:15,fontWeight:'700',color:INK},desc:{fontSize:12,color:MUTED,marginTop:4},badge:{minWidth:22,height:22,borderRadius:11,paddingHorizontal:6,backgroundColor:MAGENTA,alignItems:'center',justifyContent:'center',marginRight:8},badgeText:{fontSize:11,color:'#FFF',fontWeight:'700'}});
