import React, { useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { eventPhase } from '../../lib/gatherz/rules';
import { Art, Chip, EventCard, Header, IconButton, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import type { EventCategory } from '../../types/gatherz';
import { demoCircles } from '../../data/gatherz/communityDemo';
export const CATEGORIES: ('All' | EventCategory)[] = ['All', 'Music', 'Nightlife', 'Culture', 'Food', 'Sports'];
export default function GatherzHomeScreen() {
  const t = useGatherzTheme(); const { repo, nav, now, toggleTheme, openWallet, openBusinessSpace, openRecentActivity } = useGatherz();
  const { data, error, loading, reload } = useLoad(() => repo.listEvents(), [repo]);
  const [cat, setCat] = useState<'All' | EventCategory>('All');
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const quickActions = [
    { label: 'Home', icon: 'home-outline', action: () => nav.tab('home') },
    { label: 'Messages', icon: 'message-outline', action: () => nav.push('msgs') },
    { label: 'Notifications', icon: 'bell-outline', action: () => nav.push('notif') },
    { label: 'Wallet', icon: 'wallet-outline', action: () => openWallet ? openWallet() : Alert.alert('Wallet', 'Available from the Wantiss main app.') },
    { label: 'Saved', icon: 'heart-outline', action: () => nav.tab('favorites') },
    { label: 'My Orders', icon: 'package-variant-closed', action: () => nav.push('ords') },
    { label: 'Recent Activity', icon: 'history', action: () => openRecentActivity ? openRecentActivity() : Alert.alert('Recent Activity', 'Available from the Wantiss main app.') },
    { label: 'Help Center', icon: 'help-circle-outline', action: () => nav.push('help') },
    { label: 'Feedback', icon: 'message-text-outline', action: () => nav.push('cs') },
    { label: 'Business Space', icon: 'storefront-outline', action: () => openBusinessSpace ? openBusinessSpace() : Alert.alert('Business Space', 'Available from the Wantiss main app.') },
    { label: 'Dark Mode', icon: t.name === 'dark' ? 'white-balance-sunny' : 'weather-night', action: toggleTheme },
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
          <View style={{ backgroundColor: t.name === 'dark' ? '#261A3D' : '#EEE2FF', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 28 }}>
            <View style={{ width: 38, height: 4, borderRadius: 3, backgroundColor: t.name === 'dark' ? '#806B9E' : '#BCA5D9', alignSelf: 'center', marginBottom: 22 }} />
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              {quickActions.slice(0, 5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: '20%', alignItems: 'center', minHeight: 78, gap: 8 }}>{item.label === 'Home' ? <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8CFE0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><Image source={{ uri: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG' }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" /></View> : <MaterialCommunityIcons name={item.icon} size={26} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} />}<Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text></Pressable>)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{ paddingLeft: 12, paddingRight: 12, paddingTop: 12 }}>
              {quickActions.slice(5).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => launchQuickAction(item.action)} style={{ width: 76, alignItems: 'center', minHeight: 78, gap: 8 }}><MaterialCommunityIcons name={item.icon} size={26} color={t.name === 'dark' ? '#F3E8FF' : '#392450'} /><Text style={{ fontFamily: fonts.semibold, color: t.name === 'dark' ? '#F3E8FF' : '#392450', fontSize: 10, textAlign: 'center' }}>{item.label}</Text></Pressable>)}
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