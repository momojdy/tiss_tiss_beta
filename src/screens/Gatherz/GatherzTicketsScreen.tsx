import React, { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { View, Pressable, Text, ScrollView, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { splitAdmissions, type TicketRow } from '../../lib/gatherz/rules';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { Header, Notice, Page, TicketFront } from '../../components/gatherz/shared';
export default function GatherzTicketsScreen() {
  const { repo, nav, now } = useGatherz(); const { width } = useWindowDimensions(); const t = useGatherzTheme();
  const { data, error, loading, reload } = useLoad(async () => { const [a, e] = await Promise.all([repo.listMyAdmissions(), repo.listEvents()]); return { a, e }; }, [repo]);
  const [seg, setSeg] = useState<'up' | 'transferred' | 'past'>('up');
  const transfers = useLoad(async () => await repo.listDemoTransfers?.() ?? [], [repo]);
  // Past events are not in listEvents(); load them individually so past tickets still resolve.
  const past = useLoad(async () => (await Promise.all([...new Set((data?.a ?? []).map(x => x.eventId))].map(id => repo.getEvent(id)))).flatMap(x => (x ? [x] : [])), [repo, data]);
  const events = past.data ?? data?.e ?? [];
  const { upcoming, past: done } = splitAdmissions(data?.a ?? [], events, now);
  const rows: TicketRow[] = seg === 'up' ? upcoming : seg === 'past' ? done : [];
  const open = (r: TicketRow) => nav.push('ticket', r.admission.id);
  const gap = 12, cardW = Math.round(width * 0.78);
  const scrollX = useRef(new Animated.Value(0)).current;
  const swayCard = (r: TicketRow, index: number) => {
    const stride = cardW + gap;
    const rotate = scrollX.interpolate({
      inputRange: [(index - 1) * stride, index * stride, (index + 1) * stride],
      outputRange: ['-7deg', '0deg', '7deg'],
      extrapolate: 'clamp',
    });
    const translateY = scrollX.interpolate({
      inputRange: [(index - 1) * stride, index * stride, (index + 1) * stride],
      outputRange: [10, 0, 10],
      extrapolate: 'clamp',
    });
    return <Animated.View style={{ width: cardW, transform: [{ rotate }, { translateY }] }}>
      <TicketFront admission={r.admission} event={r.event} width={cardW} onPress={() => open(r)} />
    </Animated.View>;
  };
  return (
    <Page>
      <Header title="Tickets" subtitle="Demo account" />
      <View style={{ marginHorizontal: 20, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: t.line }}>
          {([{ key: 'up', label: 'Upcoming', count: upcoming.length }, { key: 'transferred', label: 'Transferred', count: transfers.data?.length ?? 0 }, { key: 'past', label: 'Past', count: done.length }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: seg === item.key }} onPress={() => setSeg(item.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: seg === item.key ? 2 : 0, borderBottomColor: t.accent }}><Text numberOfLines={1} style={{ color: seg === item.key ? t.accent : t.mute, fontFamily: fonts.semibold, fontSize: 12 }}>{item.label} · {item.count}</Text></Pressable>)}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 18, paddingTop: 14, paddingBottom: 4 }}>
          {([{ label: 'Orders', icon: 'receipt-text-outline', route: 'ords' }, { label: 'Messages', icon: 'message-outline', route: 'msgs' }, { label: 'Claim ticket', icon: 'ticket-confirmation-outline', route: 'claim' }, { label: 'Demo', icon: 'cog-outline', route: 'dc' }] as const).map(item => <Pressable key={item.route} accessibilityRole="button" onPress={() => nav.push(item.route)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 }}><MaterialCommunityIcons name={item.icon} size={17} color={t.accent} /><Text style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 12 }}>{item.label}</Text></Pressable>)}
        </ScrollView>
      </View>
      {loading ? <Notice loading body="Loading tickets…" /> : null}
      {error ? <Notice title="Tickets could not load" body="Please try again." action="Try again" onAction={reload} /> : null}
      {seg === 'transferred' ? <View style={{ marginHorizontal: 20, gap: 10 }}>{(transfers.data ?? []).map(tr => <View key={tr.token} style={{ backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: 18, padding: 14, gap: 8 }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>{tr.recipient} · {tr.status}</Text><Pressable accessibilityRole="button" onPress={() => nav.push('claim', tr.token)}><Text style={{ color: t.accent }}>Open claim link</Text></Pressable>{tr.status === 'pending' ? <Pressable accessibilityRole="button" onPress={async () => { try { await repo.cancelDemoTransfer?.(tr.admissionId); transfers.reload(); reload(); } catch { /* Demo state may have changed */ } }}><Text style={{ color: t.accent }}>Cancel / Revoke transfer</Text></Pressable> : null}</View>)}{!transfers.data?.length ? <Notice title="No transferred tickets" body="Pending and completed demo transfers appear here." /> : null}</View> : null}
      {!loading && !error && seg !== 'transferred' && rows.length === 0 ? <Notice title={seg === 'up' ? 'No upcoming tickets' : 'No past tickets'} body={seg === 'up' ? 'Find something to go to and your tickets will appear here.' : 'Tickets from events you have attended show up here.'} action={seg === 'up' ? 'Explore events' : undefined} onAction={() => nav.push('explore')} /> : null}
      {/* Swaying horizontal ticket carousel is the default for any non-empty ticket list. */}
      {seg !== 'transferred' && rows.length >= 1 ? <Animated.FlatList horizontal data={rows} keyExtractor={r => r.admission.id} showsHorizontalScrollIndicator={false} snapToInterval={cardW + gap} decelerationRate="fast" snapToAlignment="start" onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 20, gap }} renderItem={({ item, index }) => swayCard(item, index)} /> : null}
    </Page>
  );
}