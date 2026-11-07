import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzCheckout, checkoutTotals } from '../../features/gatherz/GatherzCheckoutContext';
import { useGatherzActivity } from '../../features/gatherz/GatherzActivityContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
 const t = useGatherzTheme();
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ marginHorizontal: 20, marginTop: 12, padding: 15, borderRadius: 999, backgroundColor: disabled ? t.soft : t.accent, alignItems: 'center' }}><Text style={{ color: disabled ? t.mute : t.onAccent, fontFamily: fonts.semibold }}>{label}</Text></Pressable>;
}
function Summary({ id }: { id: string }) {
 const { repo } = useGatherz(); const t = useGatherzTheme(); const { checkout } = useGatherzCheckout();
 const { data: event, loading } = useLoad(() => repo.getEvent(id), [repo, id]);
 if (loading) return <Notice loading body="Loading order…" />;
 if (!event) return <Notice title="Event unavailable" />;
 const tier = event.tiers.find(x => x.name === checkout.tierName) ?? event.tiers[0];
 const totals = checkoutTotals(tier.price, checkout.quantity, checkout.promo);
 return <View style={{ marginHorizontal: 20, padding: 16, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, gap: 9 }}>
  <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 18 }}>{event.title}</Text>
  <Text style={{ color: t.mute }}>{checkout.quantity} × {tier.name} · {checkout.quantity * tier.admissions} admissions</Text>
  <Text style={{ color: t.text }}>Subtotal: ${totals.subtotal.toFixed(2)}</Text>
  {totals.discount > 0 ? <Text style={{ color: t.text }}>Promo GATHER10: −${totals.discount.toFixed(2)}</Text> : null}
  <Text style={{ color: t.text }}>Service fee (4%): ${totals.fee.toFixed(2)}</Text>
  <Text style={{ color: t.mute }}>Taxes: none (demo)</Text>
  <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 21 }}>Total: ${totals.total.toFixed(2)}</Text>
 </View>;
}
export function GatherzReviewScreen({ id }: { id: string }) {
 const { nav } = useGatherz(); const { checkout } = useGatherzCheckout();
 return <Page><Header title="Review order" onBack={nav.back} /><SectionTitle title="Your order" /><Summary id={id} />
 <Notice body="This is a demo. No real payment will be collected and tickets cannot be used for admission." />
 <Button label="Choose payment method" disabled={checkout.eventId !== id} onPress={() => nav.push('pm', id)} /></Page>;
}
export function GatherzPaymentScreen({ id }: { id: string }) {
 const { repo, nav } = useGatherz(); const { checkout, update } = useGatherzCheckout(); const activity = useGatherzActivity();
 const [busy, setBusy] = useState(false); const locked = useRef(false); const t = useGatherzTheme();
 const { data: event } = useLoad(() => repo.getEvent(id), [repo, id]);
 const tier = event?.tiers.find(x => x.name === checkout.tierName) ?? event?.tiers[0];
 const total = checkoutTotals(tier?.price ?? 0, checkout.quantity, checkout.promo).total;
 const pay = async () => {
  if (locked.current || !repo.placeDemoOrder || !tier || checkout.eventId !== id) return;
  locked.current = true; setBusy(true);
  try { await new Promise(resolve => setTimeout(resolve, 900)); const order = await repo.placeDemoOrder(id, tier.name, checkout.quantity); update({ orderId: order.id, failure: '' }); activity.notify('tickets', 'Order confirmed', 'Your demo order is ready.', 'rc', order.id); nav.push('ok', order.id); }
  catch { update({ failure: 'Your demo payment could not be completed.' }); nav.push('pf', id); }
  finally { setBusy(false); }
 };
 return <Page><Header title="Payment" onBack={busy ? undefined : nav.back} /><SectionTitle title="Choose payment method" />
 {(['wallet','card'] as const).map(method => <Pressable key={method} accessibilityRole="radio" accessibilityState={{ checked: checkout.paymentMethod === method }} onPress={() => update({ paymentMethod: method })} style={{ marginHorizontal: 20, marginBottom: 10, padding: 18, borderWidth: 0.5, borderColor: checkout.paymentMethod === method ? t.accent : t.line, backgroundColor: t.card, borderRadius: radius.card }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>{method === 'wallet' ? 'Wantiss Wallet · $250 demo balance' : 'Demo card ···· 4242'}</Text></Pressable>)}
 <SectionTitle title="Order summary" /><Summary id={id} />
 <Button label={busy ? 'Processing…' : 'Pay $' + total.toFixed(2) + ' (demo)'} disabled={busy || !tier || checkout.eventId !== id || !!checkout.orderId} onPress={pay} />
 {busy ? <ActivityIndicator color={t.accent} /> : null}
 <Button label="Cancel payment" disabled={busy} onPress={nav.back} /></Page>;
}
export function GatherzPaymentFailedScreen({ id }: { id: string }) {
 const { nav } = useGatherz(); const { checkout } = useGatherzCheckout();
 return <Page><Header title="Payment failed" onBack={nav.back} /><Notice title="Payment not completed" body={checkout.failure || 'Please try again. No payment was collected.'} />
 <Button label="Try again" onPress={() => nav.push('pm', id)} /><Button label="Cancel order" onPress={() => nav.tab('home')} /></Page>;
}
export function GatherzConfirmationScreen({ id }: { id: string }) {
 const { nav, repo } = useGatherz(); const { data: order } = useLoad(async () => (await repo.listOrders?.() ?? []).find(o => o.id === id), [repo, id]);
 return <Page><Header title="Order confirmed" onBack={() => nav.tab("tickets")} /><Notice title="Your tickets are ready" body={order ? order.admissions + ' demo admissions have been added to your tickets.' : 'Your demo order is confirmed.'} />
 <Button label="View my tickets" onPress={() => nav.tab('tickets')} /><Button label="View receipt" onPress={() => nav.push('rc', id)} />
 {order && order.admissions > 1 ? <Button label="Open group manager" onPress={() => nav.push('grp', id)} /> : null}</Page>;
}
