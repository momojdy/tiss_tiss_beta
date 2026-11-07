import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzReceiptScreen({ id }: { id: string }) {
  const { repo, nav } = useGatherz(); const t = useGatherzTheme();
  const { data, loading, error, reload } = useLoad(async () => {
    const order = (await repo.listOrders?.() ?? []).find(o => o.id === id);
    return order ? { order, event: await repo.getEvent(order.eventId) } : null;
  }, [repo, id]);
  if (loading) return <Page><Header title="Receipt" onBack={nav.back} /><Notice loading body="Loading receipt…" /></Page>;
  if (error || !data) return <Page><Header title="Receipt" onBack={nav.back} /><Notice title="Receipt unavailable" body={error || 'Order not found in this demo session'} action="Try again" onAction={reload} /></Page>;
  const { order, event } = data;
  return <Page>
    <Header title="Receipt" onBack={nav.back} />
    <View style={{ marginHorizontal: 20, padding: 20, backgroundColor: t.card, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line }}>
      <Text style={{ color: t.accent, fontFamily: fonts.bold }}>DEMO ORDER CONFIRMED</Text>
      <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 24, marginTop: 12 }}>{event?.title ?? 'Event'}</Text>
      <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 8 }}>{order.id}</Text>
      <Text style={{ color: t.text, fontFamily: fonts.regular, marginTop: 16 }}>{order.quantity} × {order.tierName}</Text>
      <Text style={{ color: t.text, fontFamily: fonts.regular, marginTop: 4 }}>{order.admissions} individual admissions</Text>
      <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 20, marginTop: 16 }}>Total: {order.total === 0 ? 'Free' : '$' + order.total}</Text>
      <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 12 }}>No payment was processed. These demonstration credentials are not valid for event entry.</Text>
    </View>
    <SectionTitle title="Next steps" />
    <Pressable accessibilityRole="button" onPress={() => nav.tab('tickets')} style={{ marginHorizontal: 20, backgroundColor: t.accent, padding: 16, borderRadius: 999, alignItems: 'center' }}>
      <Text style={{ color: t.onAccent, fontFamily: fonts.bold }}>View my tickets</Text>
    </Pressable>
  </Page>;
}