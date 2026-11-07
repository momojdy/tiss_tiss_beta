import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import GatherzPassV2 from '../../components/gatherz/GatherzPassV2';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';

import { Header, Notice, Page } from '../../components/gatherz/shared';
export default function GatherzTicketScreen({ id }: { id: string }) {
  const t = useGatherzTheme(); const { repo, nav } = useGatherz();
  const [details, setDetails] = useState(false);
  const { data, error, loading, reload } = useLoad(async () => { const a = (await repo.listMyAdmissions()).find(x => x.id === id); return a ? { a, e: await repo.getEvent(a.eventId) } : null; }, [repo, id]);
  if (loading) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice loading body="Loading ticket…" /></Page>;
  if (error) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice title="Ticket could not load" body="Please try again." action="Try again" onAction={reload} /></Page>;
  if (!data || !data.e) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice title="Ticket not found" body="It may have been transferred or refunded." action="Back to tickets" onAction={() => nav.tab('tickets')} /></Page>;
  const { a, e } = data, usable = a.status === 'valid' || a.status === 'checked_in';
  return (
    <Page>
      <Header title="Ticket Details" onBack={nav.back} />

      <View style={{ marginHorizontal: 20, marginTop: 12, padding: 14, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card, gap: 6 }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold }}>{e.title}</Text>
        <Text style={{ color: t.mute }}>{e.venue}, {e.area}</Text>
        <Text style={{ color: t.mute }}>Status: {a.status.replace(/_/g, ' ')}</Text>
        <Pressable accessibilityRole="button" onPress={() => setDetails(v => !v)}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{details ? 'Hide admission details' : 'Show admission details'}</Text></Pressable>
        {details ? <><Text style={{ color: t.mute }}>Admission ID: {a.id}</Text><Text style={{ color: t.mute }}>Order: {a.orderId}</Text><Text style={{ color: t.mute }}>Holder: {a.holderName ?? 'Not assigned'}</Text></> : null}
      </View>
      {usable ? <GatherzPassV2 admission={a} event={e} /> : <Notice title="This ticket cannot be used for entry" body={`Status: ${a.status.replace('_', ' ')}`} />}
      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 10 }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 18 }}>Ticket actions</Text>
        {(['send', 'rf', 'dl'] as const).map(route => <Pressable key={route} accessibilityRole="button" onPress={() => nav.push(route, a.id)} style={{ padding: 15, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>{route === 'send' ? a.status === 'pending_transfer' ? 'Manage pending transfer' : 'Transfer ticket' : route === 'rf' ? 'Request refund' : 'Download options'}</Text></Pressable>)}
        <Pressable accessibilityRole="button" onPress={() => nav.push('event', e.id)} style={{ padding: 15, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>Event details</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => nav.push('grp', a.orderId)} style={{ padding: 15, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>View order admissions</Text></Pressable>
      </View>
    </Page>
  );
}