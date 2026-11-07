import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzCheckoutScreen({ id }: { id: string }) {
  const { repo, nav } = useGatherz(); const t = useGatherzTheme();
  const { data: event, loading, error, reload } = useLoad(() => repo.getEvent(id), [repo, id]);
  const [tierName, setTierName] = useState(''); const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false); const [failure, setFailure] = useState('');
  if (loading) return <Page><Header title="Checkout" onBack={nav.back} /><Notice loading body="Loading ticket options…" /></Page>;
  if (error || !event) return <Page><Header title="Checkout" onBack={nav.back} /><Notice title="Checkout unavailable" body={error || 'Event not found'} action="Try again" onAction={reload} /></Page>;
  const selected = event.tiers.find(x => x.name === tierName) ?? event.tiers[0];
  const count = qty * selected.admissions, total = qty * selected.price;
  const allowed = !!repo.placeDemoOrder && !busy && count <= event.remaining && Date.parse(event.startsAt) > Date.now();
  const submit = async () => {
    if (!allowed || !repo.placeDemoOrder) return;
    setBusy(true); setFailure('');
    try { const order = await repo.placeDemoOrder(id, selected.name, qty); nav.push('rc', order.id); }
    catch (e) { setFailure(e instanceof Error ? e.message : 'Could not create demo order'); }
    finally { setBusy(false); }
  };
  return <Page>
    <Header title="Checkout" subtitle="Demo mode · no payment collected" onBack={nav.back} />
    <SectionTitle title={event.title} />
    <Text style={{ color: t.mute, marginHorizontal: 20, fontFamily: fonts.regular }}>{event.venue} · {event.area}</Text>
    <SectionTitle title="Choose admission" />
    <View style={{ paddingHorizontal: 20, gap: 8 }}>
      {event.tiers.map(tier => <Pressable key={tier.name} accessibilityRole="radio" accessibilityState={{ checked: selected.name === tier.name }} onPress={() => { setTierName(tier.name); setQty(1); }} style={{ borderWidth: 0.5, borderColor: selected.name === tier.name ? t.accent : t.line, borderRadius: radius.card, padding: 16, backgroundColor: selected.name === tier.name ? t.soft : t.card }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold }}>{tier.name} · {tier.price === 0 ? 'Free' : '$' + tier.price}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 4 }}>{tier.admissions} {tier.admissions === 1 ? 'admission' : 'admissions'} per package</Text>
      </Pressable>)}
    </View>
    <SectionTitle title="Quantity" />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" onPress={() => setQty(q => Math.max(1, q - 1))} style={{ padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: 16 }}><Text style={{ color: t.text, fontSize: 20 }}>−</Text></Pressable>
      <Text style={{ fontFamily: fonts.bold, color: t.text, fontSize: 20 }}>{qty}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" onPress={() => setQty(q => Math.min(10, q + 1))} style={{ padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: 16 }}><Text style={{ color: t.text, fontSize: 20 }}>+</Text></Pressable>
    </View>
    <SectionTitle title="Order summary" />
    <View style={{ marginHorizontal: 20, padding: 16, borderRadius: radius.card, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5 }}>
      <Text style={{ fontFamily: fonts.regular, color: t.text }}>{qty} × {selected.name} · {count} admissions</Text>
      <Text style={{ fontFamily: fonts.bold, color: t.text, fontSize: 22, marginTop: 8 }}>Total: {total === 0 ? 'Free' : '$' + total}</Text>
      <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 8 }}>This is a local demo. No money is charged and these tickets cannot be used for entry.</Text>
    </View>
    {failure ? <Notice title="Order not completed" body={failure} /> : null}
    {!allowed && !busy ? <Notice body={count > event.remaining ? 'Not enough tickets available.' : 'Checkout is not available.'} /> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !allowed }} disabled={!allowed} onPress={submit} style={{ marginHorizontal: 20, marginTop: 20, borderRadius: 999, backgroundColor: allowed ? t.accent : t.soft, minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
      {busy ? <ActivityIndicator color={t.onAccent} /> : <Text style={{ color: allowed ? t.onAccent : t.mute, fontFamily: fonts.bold }}>Confirm demo order</Text>}
    </Pressable>
  </Page>;
}