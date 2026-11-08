import React, { useEffect, useState } from 'react';
import { Alert, Animated, FlatList, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect, Line, Polyline, G } from 'react-native-svg';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { eventPhase } from '../../lib/gatherz/rules';
import { Art, Chip, EventCard, Header, IconButton, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import type { EventCategory } from '../../types/gatherz';
import { demoCircles } from '../../data/gatherz/communityDemo';
import { supabase } from '../../lib/supabase';
function ThinMenuIcon({ name, color }: { name: string; color: string }) {
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
export const CATEGORIES: ('All' | EventCategory)[] = ['All', 'Music', 'Nightlife', 'Culture', 'Food', 'Sports'];
export default function GatherzHomeScreen() {
  const t = useGatherzTheme(); const { repo, nav, now, toggleTheme, openWallet, openBusinessSpace, openRecentActivity, openMainHome, openMessages, openNotifications, unreadNotifications = 0, unreadMessages = 0 } = useGatherz();
  const { data, error, loading, reload } = useLoad(() => repo.listEvents(), [repo]);
  const [cat, setCat] = useState<'All' | EventCategory>('All');
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
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
  const launchQuickAction = (action: () => void) => { setQuickMenuOpen(false); action(); };
  const events = (data ?? []).filter(e => cat === 'All' || e.category === cat);
  const week = events.filter(e => Date.parse(e.startsAt) - now < 7 * 864e5 && eventPhase(e, now) !== 'past');
  const trending = [...events].sort((a, b) => a.remaining - b.remaining).filter(e => e.remaining > 0).slice(0, 5);
  const open = (id: string) => nav.push('event', id);
  return (
    <Page>
      <Header title="gatherz." onBack={nav.back} right={<Pressable accessibilityRole="button" accessibilityLabel="Open Wantiss menu" onPress={() => setQuickMenuOpen(true)} hitSlop={8} style={{ width: 44, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.text }} /><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.text }} /><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.text }} /></Pressable>} />
      <Modal visible={quickMenuOpen} transparent animationType="slide" onRequestClose={() => setQuickMenuOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,8,25,0.45)' }}>
          <Pressable accessibilityLabel="Close menu" onPress={() => setQuickMenuOpen(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: t.name === 'dark' ? 'rgba(38,26,61,0.94)' : 'rgba(238,226,255,0.94)', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 28 }}>
            <View style={{ width: 38, height: 4, borderRadius: 3, backgroundColor: t.name === 'dark' ? '#806B9E' : '#BCA5D9', alignSelf: 'center', marginBottom: 22 }} />
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              {quickActions.slice(0, 5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: '20%', alignItems: 'center', minHeight: 78, gap: 8 }}>{item.label === 'Home' ? <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8CFE0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><Image source={{ uri: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG' }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" /></View> : <ThinMenuIcon name={item.icon} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} />}{item.label === 'Notifications' && unreadNotifications > 0 ? <View style={{ position: 'absolute', top: -8, right: 2, minWidth: 24, height: 19, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: unreadNotifications > 99 ? '#BD279F' : notificationColors.length === 1 ? notificationColors[0] : '#BD279F', fontSize: 12, fontWeight: '700' }}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text></View> : null}{item.label === 'Messages' && unreadMessages > 0 ? <Animated.View style={{ position: 'absolute', top: 0, right: 15, width: 7, height: 7, borderRadius: 4, backgroundColor: messageColors[colorIndex % Math.max(messageColors.length, 1)] ?? '#BD279F', opacity: pulse }} /> : null}{item.label !== 'Home' ? <Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text> : null}</Pressable>)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{ paddingLeft: 12, paddingRight: 12, paddingTop: 12 }}>
              {quickActions.slice(5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: 76, alignItems: 'center', minHeight: 78, gap: 8 }}><ThinMenuIcon name={item.icon} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} /><Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text></Pressable>)}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setQuickMenuOpen(false)} style={{ backgroundColor: t.name === 'dark' ? '#3B2B55' : '#FFFFFF', marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 14, alignItems: 'center' }}><Text style={{ fontFamily: fonts.semibold, color: t.text }}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.8, color: t.text }}>Make moments happen.</Text><Text style={{ fontFamily: fonts.regular, fontSize: 15, color: t.mute, marginTop: 6 }}>Find your people. Live the experience.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Search experiences and places" onPress={() => nav.push('explore')} style={{ marginHorizontal: 20, marginTop: 16, height: 52, borderRadius: radius.input, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
        <MaterialCommunityIcons name="magnify" size={22} color={t.mute} /><Text style={{ fontFamily: fonts.regular, color: t.mute }}>Search experiences, places…</Text>
      </Pressable>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} keyExtractor={c => c} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 10 }} renderItem={({ item }) => { const active = item === cat; const icon = ({ All: 'view-grid-outline', Music: 'music-note-outline', Nightlife: 'glass-cocktail', Culture: 'drama-masks', Food: 'silverware-fork-knife', Sports: 'basketball' } as const)[item]; return <Pressable accessibilityRole="button" accessibilityLabel={item + ' events'} accessibilityState={{ selected: active }} onPress={() => setCat(item)} style={{ width: 60, height: 60, paddingHorizontal: 2, borderRadius: 16, borderWidth: 0.5, borderColor: active ? t.accent : t.line, backgroundColor: active ? t.soft : t.card, alignItems: 'center', justifyContent: 'center', gap: 4 }}><MaterialCommunityIcons name={icon} size={21} color={active ? t.accent : t.text} /><Text style={{ fontFamily: fonts.semibold, fontSize: 9, textAlign: 'center', includeFontPadding: false, color: active ? t.accent : t.text }}>{item === 'Food' ? 'Food & Drink' : item}</Text></Pressable>; }} />
      {loading ? <Notice loading body="Loading events…" /> : null}
      {error ? <Notice title="Events could not load" body="Please check your connection and try again." action="Try again" onAction={reload} /> : null}
      {!loading && !error && !events.length ? <Notice title="No events in this category" body="Try another category or check back soon." action="Show all" onAction={() => setCat('All')} /> : null}
      {events.length ? <>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 20 }}><SectionTitle title="Featured" /><MaterialCommunityIcons name="arrow-right" size={20} color={t.accent} accessibilityLabel="Swipe featured events" /></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={events.slice(0, 3)} keyExtractor={e => e.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <View><EventCard wide event={item} onPress={() => open(item.id)} /><View pointerEvents="none" style={{ position: 'absolute', top: 12, left: 12, borderRadius: 99, backgroundColor: t.accent, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: t.onAccent, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 }}>FEATURED</Text></View></View>} />
      </> : null}
      {events.length ? <Pressable accessibilityRole="button" onPress={() => nav.push('prefs')} style={{ marginHorizontal: 20, marginTop: 20, padding: 16, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', gap: 10 }}><MaterialCommunityIcons name="creation-outline" size={22} color={t.accent} /><View style={{ flex: 1 }}><Text style={{ color: t.text, fontFamily: fonts.bold }}>Recommended for you</Text><Text style={{ color: t.mute, marginTop: 4, fontSize: 12 }}>Choose your interests to personalize events.</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={t.mute} /></Pressable> : null}
      {week.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Happening This Week" /><Pressable accessibilityRole="button" onPress={() => nav.push('all', 'week')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>See all</Text></Pressable></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={week} keyExtractor={e => e.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <EventCard wide event={item} onPress={() => open(item.id)} />} />
      </> : null}
      {events.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Events Near You" /><Pressable accessibilityRole="button" onPress={() => nav.push('all', 'near')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>See all</Text></Pressable></View>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>{events.slice(0, 4).map(e => <EventCard key={e.id} event={e} onPress={() => open(e.id)} />)}</View>
      </> : null}
      {trending.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Trending Now" /><Pressable accessibilityRole="button" onPress={() => nav.push('all', 'trend')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>See all</Text></Pressable></View>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {[0, 1].map(column => <View key={column} style={{ flex: 1, gap: 12 }}>
            {trending.filter((_, index) => index % 2 === column).map((e, index) => {
              const tall = (column + index) % 2 === 0;
              const price = e.tiers.length ? Math.min(...e.tiers.map(tier => tier.price)) : 0;
              return <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={e.title} onPress={() => open(e.id)} style={{ backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, overflow: 'hidden' }}>
                <Art index={e.art} style={{ height: tall ? 174 : 122 }} />
                <View style={{ padding: 12, gap: 5 }}>
                  <Text numberOfLines={2} style={{ color: t.text, fontFamily: fonts.bold, fontSize: 15 }}>{e.title}</Text>
                  <Text numberOfLines={2} style={{ color: t.mute, fontFamily: fonts.regular, fontSize: 12 }}>{e.venue} · {e.area}</Text>
                  <Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 12 }}>{price === 0 ? 'Free' : `From ${price}`}</Text>
                </View>
              </Pressable>;
            })}
          </View>)}
        </View>
      </> : null}
      {events.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Friends' Plans" /><Pressable accessibilityRole="button" onPress={() => nav.tab('circles')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Find your circle</Text></Pressable></View>
        <View style={{ marginHorizontal: 20, padding: 16, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, backgroundColor: t.card }}>
          <Text style={{ color: t.text, fontFamily: fonts.semibold }}>Make plans together</Text>
          <Text style={{ color: t.mute, marginTop: 6 }}>Join a circle to discover events with friends. Friends' activity is not connected in this demo.</Text>
          <Pressable accessibilityRole="button" onPress={() => nav.tab('circles')} style={{ marginTop: 10 }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Explore circles ›</Text></Pressable>
        </View>
      </> : null}
      {events.some(e => e.remaining > 0 && Date.parse(e.startsAt) >= now && Date.parse(e.startsAt) - now <= 48 * 3600000) ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Last-Minute Deals" /><Pressable accessibilityRole="button" onPress={() => nav.push('explore')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Explore</Text></Pressable></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={events.filter(e => e.remaining > 0 && Date.parse(e.startsAt) >= now && Date.parse(e.startsAt) - now <= 48 * 3600000)} keyExtractor={e => e.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <View><EventCard wide event={item} onPress={() => open(item.id)} /><Text style={{ color: t.mute, fontSize: 12, marginTop: 5 }}>Starting soon · Standard ticket prices apply</Text></View>} />
      </> : null}
      {demoCircles.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Popular Circles" /><Pressable accessibilityRole="button" onPress={() => nav.tab('circles')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>See all</Text></Pressable></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={[...demoCircles].sort((a, b) => b.members - a.members).slice(0, 5)} keyExtractor={c => c.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => nav.push('ci', item.id)} style={{ width: 190, minHeight: 112, padding: 16, borderRadius: radius.card, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, justifyContent: 'space-between' }}><Text numberOfLines={2} style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 15 }}>{item.name}</Text><Text style={{ color: t.mute, fontFamily: fonts.regular, fontSize: 12 }}>{item.members} members · {item.category}</Text></Pressable>} />
      </> : null}
      {events.length ? <><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 20 }}><SectionTitle title="New in Your City" /><Pressable accessibilityRole="button" onPress={() => nav.push("explore")}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Explore</Text></Pressable></View><FlatList horizontal showsHorizontalScrollIndicator={false} data={[...events].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)).slice(0, 4)} keyExtractor={e => e.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <EventCard wide event={item} onPress={() => open(item.id)} />} /></> : null}
    </Page>
  );
}