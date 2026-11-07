import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { eventPhase } from '../../lib/gatherz/rules';
import { Art, Chip, EventCard, Header, IconButton, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import type { EventCategory } from '../../types/gatherz';
export const CATEGORIES: ('All' | EventCategory)[] = ['All', 'Music', 'Nightlife', 'Culture', 'Food', 'Sports'];
export default function GatherzHomeScreen() {
  const t = useGatherzTheme(); const { repo, nav, now, toggleTheme } = useGatherz();
  const { data, error, loading, reload } = useLoad(() => repo.listEvents(), [repo]);
  const [cat, setCat] = useState<'All' | EventCategory>('All');
  const events = (data ?? []).filter(e => cat === 'All' || e.category === cat);
  const week = events.filter(e => Date.parse(e.startsAt) - now < 7 * 864e5 && eventPhase(e, now) !== 'past');
  const trending = [...events].sort((a, b) => a.remaining - b.remaining).filter(e => e.remaining > 0).slice(0, 4);
  const open = (id: string) => nav.push('event', id);
  return (
    <Page>
      <Header title="gatherz." subtitle="Make moments happen." right={<IconButton name={t.name === 'dark' ? 'white-balance-sunny' : 'weather-night'} label="Toggle theme" onPress={toggleTheme} />} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        {([{ label: 'Notifications', route: 'notif' }, { label: 'Help', route: 'help' }, { label: 'Preferences', route: 'prefs' }] as const).map(item => <Pressable key={item.route} accessibilityRole="button" onPress={() => nav.push(item.route)} style={{ borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }}><Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 12 }}>{item.label}</Text></Pressable>)}
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: t.text, paddingHorizontal: 20 }}>Find your people.{'\n'}Live the experience.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Search experiences and places" onPress={() => nav.push('explore')} style={{ marginHorizontal: 20, marginTop: 16, height: 52, borderRadius: radius.input, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
        <MaterialCommunityIcons name="magnify" size={22} color={t.mute} /><Text style={{ fontFamily: fonts.regular, color: t.mute }}>Search experiences, places…</Text>
      </Pressable>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} keyExtractor={c => c} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8 }} renderItem={({ item }) => <Chip label={item} on={item === cat} onPress={() => setCat(item)} />} />
      {loading ? <Notice loading body="Loading events…" /> : null}
      {error ? <Notice title="Events could not load" body="Please check your connection and try again." action="Try again" onAction={reload} /> : null}
      {!loading && !error && !events.length ? <Notice title="No events in this category" body="Try another category or check back soon." action="Show all" onAction={() => setCat('All')} /> : null}
      {events.length ? <>
        <SectionTitle title="Featured" />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={events.slice(0, 3)} keyExtractor={e => e.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <EventCard wide event={item} onPress={() => open(item.id)} />} />
      </> : null}
      {week.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Happening This Week" /><Pressable accessibilityRole="button" onPress={() => nav.push('all', 'week')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>See all</Text></Pressable></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={week} keyExtractor={e => e.id} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} renderItem={({ item }) => <EventCard wide event={item} onPress={() => open(item.id)} />} />
      </> : null}
      {events.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}><SectionTitle title="Events Near You" /><Pressable accessibilityRole="button" onPress={() => nav.push('all', 'near')}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>See all</Text></Pressable></View>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>{events.map(e => <EventCard key={e.id} event={e} onPress={() => open(e.id)} />)}</View>
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
    </Page>
  );
}