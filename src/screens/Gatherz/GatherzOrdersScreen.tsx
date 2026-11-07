import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzOrdersScreen() {
 const { repo, nav } = useGatherz(); const t = useGatherzTheme();
 const { data, loading, error, reload } = useLoad(async () => { const orders = await repo.listOrders?.() ?? []; return await Promise.all(orders.map(async order => ({ order, event: await repo.getEvent(order.eventId) }))); }, [repo]);
 return <Page><Header title="Purchase history" onBack={nav.back} subtitle="Demo purchases and receipts" />
  {loading ? <Notice loading body="Loading orders…" /> : null}
  {error ? <Notice title="Orders unavailable" body="Please try again." action="Retry" onAction={reload} /> : null}
  {!loading && !data?.length ? <Notice title="No purchases yet" body="Completed demo orders will appear here." action="Explore events" onAction={() => nav.push('explore')} /> : null}
  {data?.map(({ order, event }) => <Pressable key={order.id} accessibilityRole="button" onPress={() => nav.push('rc', order.id)} style={{ marginHorizontal: 20, marginBottom: 12, padding: 16, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card }}>
   <Text style={{ color: t.text, fontFamily: fonts.bold }}>{event?.title ?? 'Event'}</Text>
   <Text style={{ color: t.mute, marginTop: 6 }}>{new Date(order.createdAt).toLocaleString()} · {order.tierName} · {order.id}</Text>
   <Text style={{ color: t.text, marginTop: 6 }}>{order.admissions} admissions · {order.total === 0 ? 'Free' : '$' + order.total}</Text>
   <Text style={{ color: t.accent, fontFamily: fonts.semibold, marginTop: 8 }}>{order.status.replace(/_/g, ' ')} · View receipt</Text>
  </Pressable>)}
 </Page>;
}