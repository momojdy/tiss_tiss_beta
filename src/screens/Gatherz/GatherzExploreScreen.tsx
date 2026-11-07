import React, { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
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
  const term = q.trim().toLowerCase();
  const list = (data ?? []).filter(e => (cat === 'All' || e.category === cat) && (!term || `${e.title} ${e.tagline} ${e.venue} ${e.area} ${e.category}`.toLowerCase().includes(term)));
  const reset = () => { setQ(''); setCat('All'); };
  return (
    <Page>
      <Header title="Explore" onBack={nav.back} />
      <TextInput accessibilityLabel="Search events" value={q} onChangeText={setQ} placeholder="Search experiences, places…" placeholderTextColor={t.mute} returnKeyType="search" style={{ marginHorizontal: 20, height: 52, borderRadius: radius.input, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 16, color: t.text, fontFamily: fonts.regular }} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATEGORIES} keyExtractor={c => c} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8 }} renderItem={({ item }) => <Chip label={item} on={item === cat} onPress={() => setCat(item)} />} />
      {loading ? <Notice loading body="Loading events…" /> : null}
      {error ? <Notice title="Search failed" body={error} action="Try again" onAction={reload} /> : null}
      {!loading && !error && !list.length ? <Notice title="No events match" body={q ? `Nothing found for “${q}”.` : 'Nothing in this category yet.'} action="Reset filters" onAction={reset} /> : null}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>{list.map(e => <EventCard key={e.id} event={e} onPress={() => nav.push('event', e.id)} />)}</View>
    </Page>
  );
}