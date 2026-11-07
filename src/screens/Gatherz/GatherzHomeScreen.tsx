import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
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
  const t = useGatherzTheme(); const { repo, nav, now, toggleTheme } = useGatherz();
  const { data, error, loading, reload } = useLoad(() => repo.listEvents(), [repo]);
  const [cat, setCat] = useState<'All' | EventCategory>('All');
  const events = (data ?? []).filter(e => cat === 'All' || e.category === cat);
  const week = events.filter(e => Date.parse(e.startsAt) - now < 7 * 864e5 && eventPhase(e, now) !== 'past');
  const trending = [...events].sort((a, b) => a.remaining - b.remaining).filter(e => e.remaining > 0).slice(0, 5);
  const open = (id: string) => nav.push('event', id);
  return (
    <Page>
      <Header title="gatherz." onBack={nav.back} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><IconButton name="help-circle-outline" label="Help" onPress={() => nav.push('help')} /><IconButton name={t.name === 'dark' ? 'white-balance-sunny' : 'weather-night'} label="Toggle theme" onPress={toggleTheme} /><IconButton name="bell-outline" label="Notifications" onPress={() => nav.push('notif')} /></View>} />
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.8, color: t.text }}>Make moments happen.</Text><Text style={{ fontFamily: fonts.regular, fontSize: 15, color: t.mute, marginTop: 6 }}>Find your people. Live the experience.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Search experiences and places" onPress={() => nav.push('explore')} style={{ marginHorizontal: 20, marginTop: 16, height: 52, borderRadius: radius.input, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
        <MaterialCommunityIcons name="magnify" size={22} color={t.mute} /><Text style={{ fontFamily: fonts.regular, color: t.mute }}>Search experiences, places…</Text>
      </Pressable>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} keyExtractor={c => c} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8 }} renderItem={({ item }) => <Chip label={item} on={item === cat} onPress={() => setCat(item)} />} />
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