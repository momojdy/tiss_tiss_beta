import React, { useEffect, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Line, Polyline, G } from 'react-native-svg';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from './GatherzContext';
import { supabase } from '../../lib/supabase';
export function ThinMenuIcon({ name, color }: { name: string; color: string }) {
  const common = { fill: 'none' as const, stroke: color, strokeWidth: 1.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes: Record<string, React.ReactNode> = {
    'message-circle': <Path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.95L3 20l.95-4.5a9 9 0 0 1-.95-4A8.5 8.5 0 0 1 11.5 3 8.5 8.5 0 0 1 20 11.5Z" />,
    bell: <><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9Z" /><Path d="M10 21h4" /></>,
    'credit-card': <><Rect x="2.5" y="5" width="19" height="14" rx="2.5" /><Line x1="2.5" y1="10" x2="21.5" y2="10" /><Line x1="6" y1="15" x2="10" y2="15" /></>,
    heart: <Path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" />,
    package: <><Path d="M12 2.5 21 7v10l-9 4.5L3 17V7Z" /><Path d="M3 7l9 4.5L21 7M12 11.5v10M7.5 4.75l9 4.5" /></>,
    clock: <><Circle cx="12" cy="12" r="9" /><Polyline points="12,6 12,12 16,14" /></>,
    'help-circle': <><Circle cx="12" cy="12" r="9" /><Path d="M9.4 9a2.8 2.8 0 0 1 5.3 1.3c0 2-2.7 2.1-2.7 4" /><Circle cx="12" cy="17.5" r=".5" fill={color} stroke="none" /></>,
    'edit-3': <><Path d="M12 20H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10" /><Path d="m10 15 8.8-8.8a2 2 0 0 1 2.8 2.8L12.8 17.8 9 19Z" /></>,
    briefcase: <><Rect x="3" y="7" width="18" height="14" rx="2" /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0" /></>,
    sun: <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <Path d="M20.5 15.8A8.8 8.8 0 0 1 8.2 3.5a8.8 8.8 0 1 0 12.3 12.3Z" />,
  };
  return <Svg width={26} height={26} viewBox="0 0 24 24"><G {...common}>{shapes[name]}</G></Svg>;
}

export default function GatherzQuickMenu({ visible, close }: { visible: boolean; close: () => void }) {
  const t = useGatherzTheme();
  const { nav, toggleTheme, openWallet, openBusinessSpace, openRecentActivity, openMainHome, openMessages, openNotifications, unreadNotifications = 0, unreadMessages = 0 } = useGatherz();
  const [notificationColors, setNotificationColors] = useState<string[]>([]);
  const [messageColors, setMessageColors] = useState<string[]>([]);
  const [pulse] = useState(() => new Animated.Value(1));
  const [colorIndex, setColorIndex] = useState(0);
  useEffect(() => {
    let alive = true;
    const palette: Record<string, string> = { goodies: '#FD802E', flyz: '#4A67B0', gatherz: '#A36BE8', wallet: '#81C56C', frenzies: '#B3DF4B', konsoliss: '#DDB52B', woulib: '#FEC509', stayz: '#579BC7', glowz: '#D49E2B' };
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data: notices } = await supabase.from('notifications').select('feature_name').eq('user_id', user.id).eq('read', false);
      if (alive) setNotificationColors(Array.from(new Set((notices ?? []).map((n: any) => palette[String(n.feature_name ?? '').toLowerCase()] ?? '#BF008E'))));
      const { data: conversations } = await supabase.from('conversations').select('id,feature_name').contains('participant_ids', [user.id]);
      if (conversations?.length) {
        const { data: unread } = await supabase.from('messages').select('conversation_id').in('conversation_id', conversations.map((c: any) => c.id)).is('read_at', null).neq('sender_id', user.id).limit(500);
        const ids = new Set((unread ?? []).map((m: any) => m.conversation_id));
        if (alive) setMessageColors(Array.from(new Set(conversations.filter((c: any) => ids.has(c.id)).map((c: any) => palette[String(c.feature_name ?? '').toLowerCase()] ?? '#BF008E'))));
      } else if (alive) setMessageColors([]);
    };
    void load();
    const channel = supabase.channel('gatherz-universal-badges').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { void load(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load(); }).subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, []);
  useEffect(() => {
    if (!messageColors.length) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 0.2, duration: 550, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true })]));
    loop.start();
    const timer = setInterval(() => setColorIndex(i => i + 1), 1100);
    return () => { loop.stop(); clearInterval(timer); pulse.setValue(1); };
  }, [messageColors.join(','), pulse]);
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
              {quickActions.slice(0, 5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: '20%', alignItems: 'center', minHeight: 78, gap: 8 }}>{item.label === 'Home' ? <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8CFE0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><Image source={{ uri: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG' }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" /></View> : <ThinMenuIcon name={item.icon} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} />}{(item.label === 'Notifications' || item.label === 'Messages') && (item.label === 'Notifications' ? unreadNotifications : unreadMessages) > 0 ? <View style={{ position: 'absolute', top: -8, right: 2, minWidth: 25, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: item.label === 'Notifications' && notificationColors.length === 1 ? notificationColors[0] : '#BD279F' }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{(item.label === 'Notifications' ? unreadNotifications : unreadMessages) > 99 ? '99+' : (item.label === 'Notifications' ? unreadNotifications : unreadMessages)}</Text></View> : null}{item.label !== 'Home' ? <Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text> : null}</Pressable>)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{ paddingLeft: 12, paddingRight: 12, paddingTop: 12 }}>
              {quickActions.slice(5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: 76, alignItems: 'center', minHeight: 78, gap: 8 }}><ThinMenuIcon name={item.icon} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} /><Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text></Pressable>)}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => close()} style={{ backgroundColor: t.name === 'dark' ? '#3B2B55' : '#FFFFFF', marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 14, alignItems: 'center' }}><Text style={{ fontFamily: fonts.semibold, color: t.text }}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>);
}
