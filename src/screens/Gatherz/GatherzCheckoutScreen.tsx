import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { useGatherzCheckout, checkoutTotals } from '../../features/gatherz/GatherzCheckoutContext';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzCheckoutScreen({ id }: { id: string }) {
  const { repo, nav } = useGatherz();
  const t = useGatherzTheme(); const { checkout, update } = useGatherzCheckout();
  const { data: event, loading, error, reload } = useLoad(() => repo.getEvent(id), [repo, id]);
  const tierName = checkout.eventId === id ? checkout.tierName : ''; const qty = checkout.eventId === id ? checkout.quantity : 1;
  const [promoInput, setPromoInput] = useState(checkout.promo);
  const [promoError, setPromoError] = useState('');
  if (loading) return <Page><Header title="Checkout" onBack={nav.back} /><Notice loading body="Loading ticket options…" /></Page>;
  if (error || !event) return <Page><Header title="Checkout" onBack={nav.back} /><Notice title="Checkout unavailable" body={error || 'Event not found'} action="Try again" onAction={reload} /></Page>;
  const selected = event.tiers.find(x => x.name === tierName) ?? event.tiers[0];
  const count = qty * selected.admissions;
  const allowed = !!repo.placeDemoOrder && count <= event.remaining && Date.parse(event.startsAt) > Date.now();
  const totals = checkoutTotals(selected.price, qty, checkout.eventId === id ? checkout.promo : '');
  const submit = () => { if (!allowed) return; update({ eventId: id, tierName: selected.name, quantity: qty }); nav.push('rv', id); };
  return <Page>
    <Header title="Checkout" subtitle="Demo mode · no payment collected" onBack={nav.back} />
    <SectionTitle title={event.title} />
    <Text style={{ color: t.mute, marginHorizontal: 20, fontFamily: fonts.regular }}>{event.venue} · {event.area}</Text>
    <SectionTitle title="Choose admission" />
    <View style={{ paddingHorizontal: 20, gap: 8 }}>
      {event.tiers.map(tier => <Pressable key={tier.name} accessibilityRole="radio" accessibilityState={{ checked: selected.name === tier.name }} onPress={() => { update({ eventId: id, tierName: tier.name, quantity: 1, promo: '' }); }} style={{ borderWidth: 0.5, borderColor: selected.name === tier.name ? t.accent : t.line, borderRadius: radius.card, padding: 16, backgroundColor: selected.name === tier.name ? t.soft : t.card }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold }}>{tier.name} · {tier.price === 0 ? 'Free' : '$' + tier.price}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 4 }}>{tier.admissions} {tier.admissions === 1 ? 'admission' : 'admissions'} per package</Text>
      </Pressable>)}
    </View>
    <SectionTitle title="Quantity" />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" onPress={() => update({ eventId: id, quantity: Math.max(1, qty - 1) })} style={{ padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: 16 }}><Text style={{ color: t.text, fontSize: 20 }}>−</Text></Pressable>
      <Text style={{ fontFamily: fonts.bold, color: t.text, fontSize: 20 }}>{qty}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" onPress={() => update({ eventId: id, quantity: Math.min(6, qty + 1) })} style={{ padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: 16 }}><Text style={{ color: t.text, fontSize: 20 }}>+</Text></Pressable>
    </View>
    <SectionTitle title="Promo code" />
    <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 8 }}>
      <TextInput accessibilityLabel="Promo code" value={promoInput} onChangeText={setPromoInput} autoCapitalize="characters" placeholder="Enter promo code" placeholderTextColor={t.mute} style={{ flex: 1, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.input, paddingHorizontal: 14, color: t.text, backgroundColor: t.card }} />
      <Pressable accessibilityRole="button" onPress={() => { const code = promoInput.trim().toUpperCase(); if (code && code !== 'GATHER10') { setPromoError('That promo code is not valid.'); return; } setPromoError(''); update({ eventId: id, promo: code }); }} style={{ padding: 14, backgroundColor: t.accent, borderRadius: radius.input }}><Text style={{ color: t.onAccent }}>Apply</Text></Pressable>
    </View>
    {promoError ? <Text style={{ marginHorizontal: 20, color: t.mute }}>{promoError}</Text> : null}
    <SectionTitle title="Order summary" />
    <View style={{ marginHorizontal: 20, padding: 16, borderRadius: radius.card, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5 }}>
      <Text style={{ fontFamily: fonts.regular, color: t.text }}>{qty} × {selected.name} · {count} admissions</Text>
      <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 8 }}>Subtotal: ${totals.subtotal.toFixed(2)}</Text>
      {totals.discount > 0 ? <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4 }}>Promo discount: −${totals.discount.toFixed(2)}</Text> : null}
      <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4 }}>Service fee (4%): ${totals.fee.toFixed(2)}</Text>
      <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4 }}>Taxes: none (demo)</Text>
      <Text style={{ fontFamily: fonts.bold, color: t.text, fontSize: 22, marginTop: 8 }}>Total: ${totals.total.toFixed(2)}</Text>
      <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 8 }}>This is a local demo. No money is charged and these tickets cannot be used for entry.</Text>
    </View>
    {!allowed ? <Notice body={count > event.remaining ? 'Not enough tickets available.' : 'Checkout is not available.'} /> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !allowed }} disabled={!allowed} onPress={submit} style={{ marginHorizontal: 20, marginTop: 20, borderRadius: 999, backgroundColor: allowed ? t.accent : t.soft, minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: allowed ? t.onAccent : t.mute, fontFamily: fonts.bold }}>Review order · ${totals.total.toFixed(2)}</Text>
    </Pressable>
  </Page>;
}