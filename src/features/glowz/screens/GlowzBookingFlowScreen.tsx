import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useGlowzState } from '../hooks/GlowzStore';
import { useBookingFlow } from '../hooks/useBookingFlow';
import { useGlowzCommands } from '../hooks/useGlowzCommands';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { useGutter } from '../styles/LayoutContext';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzBookingDateTimeStep } from '../components/booking/GlowzBookingDateTimeStep';
import { GlowzBookingLocationStep } from '../components/booking/GlowzBookingLocationStep';
import { GlowzBookingReviewStep } from '../components/booking/GlowzBookingReviewStep';
import { GlowzBookingServicesStep } from '../components/booking/GlowzBookingServicesStep';
import { GlowzBookingStaffStep } from '../components/booking/GlowzBookingStaffStep';
import { GlowzButton } from '../components/GlowzButton';
import { GlowzEmptyState } from '../components/GlowzEmptyState';
import { GlowzIconButton } from '../components/GlowzIconButton';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzStickyBar } from '../components/GlowzStickyBar';
import { GlowzText } from '../components/GlowzText';
import { GlowzTopBar } from '../components/GlowzTopBar';
import { BOOKING_STEP_TITLES, resolveStaff, stepHint, stepsFor } from '../utils/bookingDraft';
import { getProvider } from '../utils/catalog';
import { peso } from '../utils/format';
import { bookingTotals } from '../utils/pricing';
import { GlowzBookingDoneScreen } from './GlowzBookingDoneScreen';

/**
 * Full-screen booking flow. Steps live in the shared draft, so moving back and forward keeps every choice.
 * Android back and the edge swipe step back through the flow instead of leaving it.
 */
export function GlowzBookingFlowScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const nav = useGlowzNav();
  const { bookings, wl } = useGlowzState();
  const flow = useBookingFlow();
  const cmd = useGlowzCommands();
  const scroll = useRef<ScrollView>(null);
  const { draft } = flow;
  const prev = flow.prev;

  useEffect(() => nav.registerBackHandler(prev), [nav, prev]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [draft?.step]);

  const p = draft ? getProvider(draft.pid) : undefined;
  if (!draft || !p) {
    return (
      <GlowzScreen header={<GlowzTopBar title="Booking" onBack={nav.back} />}>
        <GlowzEmptyState title="Booking not available" subtitle="Start again from a professional." action={<GlowzButton small label="Home" onPress={cmd.goHome} />} />
      </GlowzScreen>
    );
  }
  if (draft.step === 'done') return <GlowzBookingDoneScreen bookingRef={draft.ref} />;

  const steps = stepsFor(draft);
  const idx = steps.indexOf(draft.step);
  const t = bookingTotals(draft, p);
  const map = draft.step === 2 ? resolveStaff(draft, p, bookings) : {};
  let ok = true;
  let cta = 'Continue';
  if (draft.step === 0) ok = draft.items.length > 0;
  if (draft.step === 2) {
    ok = draft.time !== null && map[draft.time] !== undefined;
    if (draft.resched) cta = 'Confirm new time';
  }
  if (draft.step === 4) {
    ok = !!draft.pay && !draft.processing;
    cta = draft.processing ? 'Processing…' : t.now ? `Confirm and pay ${peso(t.now)}` : 'Confirm booking';
  }
  const hint = stepHint(draft, ok);

  const header = (
    <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <GlowzIconButton icon="back" label="Back" onPress={() => { prev(); }} />
        <View style={{ flex: 1 }}>
          <GlowzText kind="tiny" muted>{draft.resched ? 'Reschedule' : `Step ${idx + 1} of ${steps.length} · ${BOOKING_STEP_TITLES[draft.step]}`}</GlowzText>
          <GlowzText weight={600} numberOfLines={1}>{p.name}</GlowzText>
        </View>
        <GlowzIconButton icon="close" label="Close booking" onPress={flow.quit} />
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {steps.map((s, i) => <View key={s} style={{ flex: 1, height: 3, borderRadius: 4, backgroundColor: i <= idx ? c.accent : c.line }} />)}
      </View>
    </View>
  );

  const bar = (
    <GlowzStickyBar>
      <View style={{ minWidth: 78 }}>
        <GlowzText kind="small" muted>{draft.step === 4 ? 'Total' : 'Subtotal'}</GlowzText>
        <GlowzText size={18} price>{peso(draft.step === 4 ? t.total : t.sub)}</GlowzText>
      </View>
      <GlowzButton label={cta} disabled={!ok} onPress={flow.next} style={{ flex: 1 }} />
    </GlowzStickyBar>
  );

  return (
    <GlowzScreen header={header} bar={bar} scrollRef={scroll}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, paddingTop: 8, paddingBottom: 20, gap: 14 }}>
        {draft.step === 0 ? <GlowzBookingServicesStep draft={draft} provider={p} flow={flow} /> : null}
        {draft.step === 1 ? <GlowzBookingStaffStep draft={draft} provider={p} flow={flow} /> : null}
        {draft.step === 2 ? <GlowzBookingDateTimeStep draft={draft} provider={p} flow={flow} bookings={bookings} onWaitlisted={wl} /> : null}
        {draft.step === 3 ? <GlowzBookingLocationStep draft={draft} provider={p} flow={flow} /> : null}
        {draft.step === 4 ? <GlowzBookingReviewStep draft={draft} provider={p} flow={flow} /> : null}
        {hint ? <GlowzText kind="small" weight={500} color={c.warn} accessibilityLiveRegion="polite">{hint}</GlowzText> : null}
      </View>
    </GlowzScreen>
  );
}