import React, { useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { splitAdmissions, type TicketRow } from '../../lib/gatherz/rules';
import { Chip, Header, Notice, Page, TicketFront } from '../../components/gatherz/shared';
export default function GatherzTicketsScreen() {
  const { repo, nav, now } = useGatherz(); const { width } = useWindowDimensions();
  const { data, error, loading, reload } = useLoad(async () => { const [a, e] = await Promise.all([repo.listMyAdmissions(), repo.listEvents()]); return { a, e }; }, [repo]);
  const [seg, setSeg] = useState<'up' | 'past'>('up');
  // Past events are not in listEvents(); load them individually so past tickets still resolve.
  const past = useLoad(async () => (await Promise.all([...new Set((data?.a ?? []).map(x => x.eventId))].map(id => repo.getEvent(id)))).flatMap(x => (x ? [x] : [])), [repo, data]);
  const events = past.data ?? data?.e ?? [];
  const { upcoming, past: done } = splitAdmissions(data?.a ?? [], events, now);
  const rows: TicketRow[] = seg === 'up' ? upcoming : done;
  const open = (r: TicketRow) => nav.push('ticket', r.admission.id);
  const gap = 12, cardW = Math.round(width * 0.78);
  return (
    <Page>
      <Header title="My Tickets" subtitle="Your admissions in one place" />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Chip label={`Upcoming (${upcoming.length})`} on={seg === 'up'} onPress={() => setSeg('up')} />
        <Chip label={`Past (${done.length})`} on={seg === 'past'} onPress={() => setSeg('past')} />
      </View>
      {loading ? <Notice loading body="Loading tickets…" /> : null}
      {error ? <Notice title="Tickets could not load" body={error} action="Try again" onAction={reload} /> : null}
      {!loading && !error && rows.length === 0 ? <Notice title={seg === 'up' ? 'No upcoming tickets' : 'No past tickets'} body={seg === 'up' ? 'Find something to go to and your tickets will appear here.' : 'Tickets from events you have attended show up here.'} action={seg === 'up' ? 'Explore events' : undefined} onAction={() => nav.push('explore')} /> : null}
      {/* 0: empty state. 1-2: regular stacked layout. 3+: horizontal snapping row with the next card peeking. */}
      {rows.length >= 1 && rows.length <= 2 ? <View style={{ paddingHorizontal: 20, gap }}>{rows.map(r => <TicketFront key={r.admission.id} admission={r.admission} event={r.event} width="100%" onPress={() => open(r)} />)}</View> : null}
      {rows.length >= 3 ? <FlatList horizontal data={rows} keyExtractor={r => r.admission.id} showsHorizontalScrollIndicator={false} snapToInterval={cardW + gap} decelerationRate="fast" snapToAlignment="start" contentContainerStyle={{ paddingHorizontal: 20, gap }} renderItem={({ item }) => <TicketFront admission={item.admission} event={item.event} width={cardW} onPress={() => open(item)} />} /> : null}
    </Page>
  );
}