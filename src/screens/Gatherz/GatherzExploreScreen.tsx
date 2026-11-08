import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [filtersOpen, setFiltersOpen] = useState(false); const [q, setQ] = useState(''); const [cat, setCat] = useState<'All' | EventCategory>('All');
  const [date, setDate] = useState('Any'); const [price, setPrice] = useState('All'); const [area, setArea] = useState('Anywhere'); const [sort, setSort] = useState('Soonest'); const [view, setView] = useState<'List' | 'Map'>('List'); const [recent, setRecent] = useState(['Jazz','Food','Comedy']); const [locationMessage, setLocationMessage] = useState('');
  const term = q.trim().toLowerCase();
  const now = Date.now(); const day = 864e5;
  const matchesDate = (start: string) => { const ts = Date.parse(start); if (date === 'Any') return true; if (date === 'Today') return new Date(ts).toDateString() === new Date(now).toDateString(); if (date === 'This week') return ts >= now && ts < now + 7 * day; const d = new Date(ts).getDay(); return ts >= now && (d === 0 || d === 6) && ts < now + 7 * day; };
  const choose = (values: string[], selected: string, setter: (v: string) => void) => <FlatList horizontal showsHorizontalScrollIndicator={false} data={values} keyExtractor={x => x} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 5 }} renderItem={({ item }) => <Chip label={item} on={item === selected} onPress={() => setter(item)} />} />;
  const filterLabel = (label: string) => <Text style={{ color: t.mute, fontFamily: fonts.semibold, fontSize: 12, marginHorizontal: 20, marginTop: 10, marginBottom: 2 }}>{label}</Text>;
  const activeFilters = Number(cat !== 'All') + Number(date !== 'Any') + Number(price !== 'All') + Number(area !== 'Anywhere') + Number(sort !== 'Soonest');
  const list = (data ?? []).filter(e => (cat === 'All' || e.category === cat) && (!term || `${e.title} ${e.tagline} ${e.venue} ${e.area} ${e.category}`.toLowerCase().includes(term)) && matchesDate(e.startsAt) && (area === 'Anywhere' || e.area === area) && (price === 'All' || (price === 'Free' ? e.tiers.some(t => t.price === 0) : e.tiers.some(t => t.price > 0)))).sort((a,b) => sort === 'Popular' ? a.remaining - b.remaining : sort === 'Price' ? Math.min(...a.tiers.map(t=>t.price)) - Math.min(...b.tiers.map(t=>t.price)) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const reset = () => { setQ(''); setCat('All'); setDate('Any'); setPrice('All'); setArea('Anywhere'); setSort('Soonest'); setView('List'); setLocationMessage(''); };
  return (
    <Page>
      <Header title="Explore" onBack={nav.back} />
      <TextInput accessibilityLabel="Search events" value={q} onChangeText={setQ} placeholder="Search experiences, places…" placeholderTextColor={t.mute} returnKeyType="search" style={{ marginHorizontal: 20, height: 52, borderRadius: radius.input, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 16, color: t.text, fontFamily: fonts.regular }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: filtersOpen || activeFilters ? t.soft : t.card, borderWidth: 0.5, borderColor: activeFilters ? t.accent : t.line }}>
          <MaterialCommunityIcons name="tune-variant" size={18} color={t.accent} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: t.text }}>Filters{activeFilters ? ' · ' + activeFilters : ''}</Text>
          <MaterialCommunityIcons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={16} color={t.mute} />
        </Pressable>
        <Text style={{ flex: 1, color: t.mute, fontFamily: fonts.regular, fontSize: 13 }}>{list.length} results</Text>
        {activeFilters || q ? <Pressable accessibilityRole="button" onPress={reset}><Text style={{ color: t.accent, fontFamily: fonts.semibold, fontSize: 13 }}>Clear</Text></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={view === 'List' ? 'Show map' : 'Show list'} onPress={() => setView(v => v === 'List' ? 'Map' : 'List')} style={{ flexDirection: 'row', gap: 5, alignItems: 'center', padding: 7 }}>
          <MaterialCommunityIcons name={view === 'List' ? 'map-outline' : 'format-list-bulleted'} size={20} color={t.accent} />
          <Text style={{ color: t.accent, fontSize: 12, fontFamily: fonts.semibold }}>{view === 'List' ? 'Map' : 'List'}</Text>
        </Pressable>
      </View>
      {filtersOpen ? <View style={{ paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: t.line }}>
        {filterLabel('Category')}{choose(CATEGORIES, cat, value => setCat(value as 'All' | EventCategory))}
        {filterLabel('Date')}{choose(['Any','Today','This week','Weekend'], date, setDate)}
        {filterLabel('Price')}{choose(['All','Free','Paid'], price, setPrice)}
        {filterLabel('Area')}{choose(['Anywhere','Makati','BGC','Pasig'], area, setArea)}
        {filterLabel('Sort by')}{choose(['Soonest','Price','Popular'], sort, setSort)}
        <Pressable accessibilityRole="button" onPress={() => setLocationMessage('Location-based results are unavailable in this demo. Choose an area above.')} style={{ marginHorizontal: 20, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 }}><MaterialCommunityIcons name="crosshairs-gps" size={18} color={t.accent} /><Text style={{ color: t.accent, fontSize: 13 }}>Use my location</Text></Pressable>
        {locationMessage ? <Notice body={locationMessage} /> : null}
        <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} style={{ marginHorizontal: 20, marginTop: 6, backgroundColor: t.accent, borderRadius: 999, padding: 12, alignItems: 'center' }}><Text style={{ color: t.onAccent, fontFamily: fonts.semibold }}>Show {list.length} results</Text></Pressable>
      </View> : null}
      {!filtersOpen && !q && recent.length ? <View style={{ flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center', gap: 10, paddingBottom: 12 }}><Text style={{ color: t.mute, fontSize: 12 }}>Recent</Text>{recent.slice(0,3).map(value => <Pressable key={value} accessibilityRole="button" onPress={() => { setQ(value); setRecent(v => [value,...v.filter(x => x !== value)]); }}><Text style={{ color: t.accent, fontSize: 12 }}>{value}</Text></Pressable>)}</View> : null}
      {loading ? <Notice loading body="Loading events…" /> : null}
      {error ? <Notice title="Search failed" body="Please try again." action="Try again" onAction={reload} /> : null}
      {!loading && !error && !list.length ? <Notice title="No events match" body={q ? `Nothing found for “${q}”.` : 'Nothing in this category yet.'} action="Reset filters" onAction={reset} /> : null}
      {view === 'Map' ? <Notice title="Demo map" body="Map tiles are not available in this offline demo. Select an event pin below to open its details." /> : null}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>{list.map(e => view === 'Map' ? <Pressable key={e.id} accessibilityRole="button" onPress={() => nav.push('event', e.id)} style={{ padding: 15, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, backgroundColor: t.card }}><Text style={{ color: t.text }}>📍 {e.title}</Text><Text style={{ color: t.mute }}>{e.area} · {e.venue}</Text></Pressable> : <EventCard key={e.id} event={e} onPress={() => nav.push('event', e.id)} />)}</View>
    </Page>
  );
}