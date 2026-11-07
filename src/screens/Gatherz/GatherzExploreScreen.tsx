import React, { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { Chip, EventCard, Header, Notice, Page } from '../../components/gatherz/shared';
import { CATEGORIES } from './GatherzHomeScreen';
import type { EventCategory } from '../../types/gatherz';
export default function GatherzExploreScreen() {
  const t = useGatherzTheme(); const { repo, nav } = useGatherz();
  const { data, error, loading, reload } = useLoad(() => repo.listEvents(), [repo]);
  const [q, setQ] = useState(''); const [cat, setCat] = useState<'All' | EventCategory>('All');
  const [date, setDate] = useState('Any'); const [price, setPrice] = useState('All'); const [area, setArea] = useState('Anywhere'); const [sort, setSort] = useState('Soonest'); const [view, setView] = useState<'List' | 'Map'>('List'); const [recent, setRecent] = useState(['Jazz','Food','Comedy']); const [locationMessage, setLocationMessage] = useState('');
  const term = q.trim().toLowerCase();
  const now = Date.now(); const day = 864e5;
  const matchesDate = (start: string) => { const ts = Date.parse(start); if (date === 'Any') return true; if (date === 'Today') return new Date(ts).toDateString() === new Date(now).toDateString(); if (date === 'This week') return ts >= now && ts < now + 7 * day; const d = new Date(ts).getDay(); return d === 0 || d === 6; };
  const choose = (values: string[], selected: string, setter: (v: string) => void) => <FlatList horizontal showsHorizontalScrollIndicator={false} data={values} keyExtractor={x => x} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 5 }} renderItem={({ item }) => <Chip label={item} on={item === selected} onPress={() => setter(item)} />} />;
  const filterLabel = (label: string) => <Text style={{ color: t.text, fontFamily: fonts.semibold, marginHorizontal: 20, marginTop: 12, marginBottom: 5 }}>{label}</Text>;
  const list = (data ?? []).filter(e => (cat === 'All' || e.category === cat) && (!term || `${e.title} ${e.tagline} ${e.venue} ${e.area} ${e.category}`.toLowerCase().includes(term)) && matchesDate(e.startsAt) && (area === 'Anywhere' || e.area === area) && (price === 'All' || (price === 'Free' ? e.tiers.some(t => t.price === 0) : e.tiers.some(t => t.price > 0)))).sort((a,b) => sort === 'Popular' ? a.remaining - b.remaining : sort === 'Price' ? Math.min(...a.tiers.map(t=>t.price)) - Math.min(...b.tiers.map(t=>t.price)) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const reset = () => { setQ(''); setCat('All'); setDate('Any'); setPrice('All'); setArea('Anywhere'); setSort('Soonest'); setView('List'); setLocationMessage(''); };
  return (
    <Page>
      <Header title="Explore" onBack={nav.back} />
      <TextInput accessibilityLabel="Search events" value={q} onChangeText={setQ} placeholder="Search experiences, places…" placeholderTextColor={t.mute} returnKeyType="search" style={{ marginHorizontal: 20, height: 52, borderRadius: radius.input, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 16, color: t.text, fontFamily: fonts.regular }} />
      {filterLabel('Recent searches')}
      {choose(recent, '', value => { setQ(value); setRecent(v => [value,...v.filter(x => x !== value)]); })}
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} keyExtractor={c => c} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8 }} renderItem={({ item }) => <Chip label={item} on={item === cat} onPress={() => setCat(item)} />} />
      {filterLabel('Date')}{choose(['Any','Today','This week','Weekend'], date, setDate)}
      {filterLabel('Price')}{choose(['All','Free','Paid'], price, setPrice)}
      {filterLabel('Area')}{choose(['Anywhere','Makati','BGC','Pasig'], area, setArea)}
      <Pressable accessibilityRole="button" onPress={() => setLocationMessage('Location-based results are unavailable in this demo. Choose an area above.')} style={{ marginHorizontal: 20, marginTop: 10, padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.input }}><Text style={{ color: t.accent }}>Use my location</Text></Pressable>
      {locationMessage ? <Notice body={locationMessage} /> : null}
      {filterLabel('Sort')}{choose(['Soonest','Price','Popular'], sort, setSort)}
      <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 }}>
        <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{list.length} results</Text>
        <Pressable accessibilityRole="button" onPress={reset}><Text style={{ color: t.accent }}>Reset filters</Text></Pressable>
      </View>
      {choose(['List','Map'], view, value => setView(value as 'List' | 'Map'))}
      {loading ? <Notice loading body="Loading events…" /> : null}
      {error ? <Notice title="Search failed" body="Please try again." action="Try again" onAction={reload} /> : null}
      {!loading && !error && !list.length ? <Notice title="No events match" body={q ? `Nothing found for “${q}”.` : 'Nothing in this category yet.'} action="Reset filters" onAction={reset} /> : null}
      {view === 'Map' ? <Notice title="Demo map" body="Map tiles are not available in this offline demo. Select an event pin below to open its details." /> : null}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>{list.map(e => view === 'Map' ? <Pressable key={e.id} accessibilityRole="button" onPress={() => nav.push('event', e.id)} style={{ padding: 15, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, backgroundColor: t.card }}><Text style={{ color: t.text }}>📍 {e.title}</Text><Text style={{ color: t.mute }}>{e.area} · {e.venue}</Text></Pressable> : <EventCard key={e.id} event={e} onPress={() => nav.push('event', e.id)} />)}</View>
    </Page>
  );
}