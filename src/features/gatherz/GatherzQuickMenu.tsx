import React from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from './GatherzContext';
import {useUnreadSummary} from '../../shared/inbox/useUnreadSummary';
import {ThinMenuIcon} from '../../shared/quickMenu/ThinMenuIcon';

export {ThinMenuIcon} from '../../shared/quickMenu/ThinMenuIcon';

export default function GatherzQuickMenu({ visible, close }: { visible: boolean; close: () => void }) {
  const t = useGatherzTheme();
  const { nav, toggleTheme, openWallet, openBusinessSpace, openRecentActivity, openMainHome, openMessages, openNotifications } = useGatherz();
  const inbox=useUnreadSummary();
  const unreadNotifications=inbox.notifications,unreadMessages=inbox.messages;
  const quickActions = [
    { label: 'Home', icon: 'home', action: () => openMainHome ? openMainHome() : nav.tab('home') },
    { label: 'Messages', icon: 'message-circle', action: () => openMessages ? openMessages() : nav.push('msgs') },
    { label: 'Notifications', icon: 'bell', action: () => openNotifications ? openNotifications() : nav.push('notif') },
    { label: 'Wallet', icon: 'credit-card', action: () => openWallet ? openWallet() : Alert.alert('Wallet', 'Available from the Wantiss main app.') },
    { label: 'Saved', icon: 'heart', action: () => nav.tab('favorites') },
    { label: 'My Orders', icon: 'package', action: () => nav.push('ords') },
    { label: 'Recent Activity', icon: 'clock', action: () => openRecentActivity ? openRecentActivity() : Alert.alert('Recent Activity', 'Available from the Wantiss main app.') },
    { label: 'Help Center', icon: 'help-circle', action: () => nav.push('help') },
    { label: 'Feedback', icon: 'edit-3', action: () => nav.push('cs') },
    { label: 'Business Space', icon: 'briefcase', action: () => openBusinessSpace ? openBusinessSpace() : Alert.alert('Business Space', 'Available from the Wantiss main app.') },
    { label: 'Dark Mode', icon: t.name === 'dark' ? 'sun' : 'moon', action: toggleTheme },
  ] as const;
  const launchQuickAction = (action: () => void) => { close(); action(); };

  return (      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => close()}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,8,25,0.45)' }}>
          <Pressable accessibilityLabel="Close menu" onPress={() => close()} style={{ flex: 1 }} />
          <View style={{ backgroundColor: t.name === 'dark' ? 'rgba(38,26,61,0.94)' : 'rgba(238,226,255,0.94)', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 28 }}>
            <View style={{ width: 38, height: 4, borderRadius: 3, backgroundColor: t.name === 'dark' ? '#806B9E' : '#BCA5D9', alignSelf: 'center', marginBottom: 22 }} />
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              {quickActions.slice(0, 5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: '20%', alignItems: 'center', minHeight: 78, gap: 8 }}>{item.label === 'Home' ? <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8CFE0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><Image source={{ uri: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG' }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" /></View> : <ThinMenuIcon name={item.icon} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} />}{(item.label === 'Notifications' || item.label === 'Messages') && (item.label === 'Notifications' ? unreadNotifications : unreadMessages) > 0 ? <View style={{ position: 'absolute', top: -8, right: 2, minWidth: 25, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: item.label === 'Notifications' ? inbox.notificationColor : inbox.messageColor }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{(item.label === 'Notifications' ? unreadNotifications : unreadMessages) > 99 ? '99+' : (item.label === 'Notifications' ? unreadNotifications : unreadMessages)}</Text></View> : null}{item.label !== 'Home' ? <Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text> : null}</Pressable>)}
            </View>
{inbox.status==='unavailable'?<Pressable accessibilityRole="button" onPress={inbox.retry} style={{paddingHorizontal:16,paddingVertical:8}}><Text style={{color:t.text,fontSize:11}}>Unread counts unavailable · Retry</Text></Pressable>:null}            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{ paddingLeft: 12, paddingRight: 12, paddingTop: 12 }}>
              {quickActions.slice(5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: 76, alignItems: 'center', minHeight: 78, gap: 8 }}><ThinMenuIcon name={item.icon} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} /><Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text></Pressable>)}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => close()} style={{ backgroundColor: t.name === 'dark' ? '#3B2B55' : '#FFFFFF', marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 14, alignItems: 'center' }}><Text style={{ fontFamily: fonts.semibold, color: t.text }}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>);
}
