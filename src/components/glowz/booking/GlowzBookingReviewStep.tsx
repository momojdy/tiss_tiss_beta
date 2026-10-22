import React from 'react';
import { View } from 'react-native';
import { PRICE, STARTING } from '../../data/prices';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { useGlowzTheme } from '../../styles/ThemeContext';
import type { BookingDraft } from '../../types/booking';
import type { Provider } from '../../types/provider';
import { getServiceOf, providerIcon } from '../../utils/catalog';
import { fmtD, fmtT, peso } from '../../utils/format';
import { addOnPrice, bookingTotals, isEstimate } from '../../utils/pricing';
import { GlowzArt } from '../GlowzArt';
import { GlowzButton } from '../GlowzButton';
import { GlowzCard } from '../GlowzCard';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzSummaryRow } from '../GlowzSummaryRow';
import { GlowzText } from '../GlowzText';
import { GlowzTextField } from '../GlowzTextField';
import { GlowzHoldTimer } from './GlowzHoldTimer';

export function GlowzBookingReviewStep({ draft: b, provider: p, flow }: { draft: BookingDraft; provider: Provider; flow: BookingFlow }) {
  const { c } = useGlowzTheme();
  const t = bookingTotals(b, p);
  const est = isEstimate(b, STARTING);
  if (!b.date || b.time === null) return null;
  return (
    <View style={{ gap: 14 }}>
      <GlowzText kind="display" size={22}>Review and pay</GlowzText>
      <GlowzCard gap={6}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: 44, height: 44, borderRadius: 12 }} />
          <View style={{ flex: 1 }}>
            <GlowzText weight={600} numberOfLines={1}>{p.name}</GlowzText>
            <GlowzText kind="small" muted>{b.resolved} · {b.loc === 'home' ? 'At your address' : 'At the ' + (p.type === 'independent' ? 'studio' : 'salon')}</GlowzText>
          </View>
        </View>
        <GlowzText><GlowzText weight={600}>{fmtD(b.date, true)}</GlowzText> · {fmtT(b.time)} · {t.dur} min</GlowzText>
      </GlowzCard>
      <GlowzCard gap={8}>
        {b.items.map((it) => {
          const s = getServiceOf(p, it.id);
          if (!s) return null;
          return (
            <View key={it.id} style={{ gap: 8 }}>
              <GlowzSummaryRow label={s.n} value={peso(PRICE[it.id])} />
              {it.add.map((a) => <GlowzSummaryRow key={a} muted label={`+ ${a}`} value={peso(addOnPrice(p, it.id, a))} />)}
            </View>
          );
        })}
        <GlowzSummaryRow divider label="Subtotal" value={peso(t.sub)} />
        {t.disc ? <GlowzSummaryRow label={`Discount (${b.applied})`} value={`−${peso(t.disc)}`} color={c.ok} /> : null}
        <GlowzSummaryRow muted label="Service fee (3%)" value={peso(t.fee)} />
        {t.trav ? <GlowzSummaryRow muted label="Travel fee" value={peso(t.trav)} /> : null}
        <GlowzSummaryRow total label={est ? 'Estimated total' : 'Total'} value={peso(t.total)} />
        {est ? <GlowzText kind="small" color={c.warn}>Includes a starting price. The provider confirms the final price after consultation.</GlowzText> : null}
      </GlowzCard>
      <View style={{ gap: 6 }}>
        <GlowzText kind="small" weight={600}>Promo code</GlowzText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GlowzTextField value={b.promo} onChangeText={flow.setPromoText} autoCapitalize="characters" autoCorrect={false} placeholder="Try GLOW10 or FIRST200" accessibilityLabel="Promo code" style={{ flex: 1 }} onSubmitEditing={flow.applyPromo} />
          <GlowzButton small variant="soft" label="Apply" onPress={flow.applyPromo} style={{ height: 46 }} />
        </View>
        {b.promoMsg ? <GlowzText kind="small" weight={b.applied ? 600 : 500} color={b.applied ? c.ok : c.bad}>{b.promoMsg}</GlowzText> : null}
        <GlowzText kind="small" muted>Codes are checked again when you confirm.</GlowzText>
      </View>
      <View style={{ gap: 8 }}>
        <GlowzText kind="small" weight={600}>Payment method</GlowzText>
        {p.pay.map((m) => (
          <GlowzOptionRow key={m} selected={b.pay === m} onPress={() => flow.setPayment(m)}>
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>{m}</GlowzText>
              <GlowzText kind="small" muted>{m === 'Wantiss wallet' ? 'Pay from your Wantiss wallet' : m.startsWith('Pay at') ? 'Pay when you arrive' : 'Pay now'}</GlowzText>
            </View>
          </GlowzOptionRow>
        ))}
        {b.pay && !t.venue ? (
          <GlowzOptionRow control="check" selected={b.dep} onPress={flow.toggleDeposit}>
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>Pay a 30% deposit now</GlowzText>
              <GlowzText kind="small" muted>{peso(Math.round(t.total * 0.3))} now, the rest at the appointment</GlowzText>
            </View>
          </GlowzOptionRow>
        ) : null}
      </View>
      <GlowzCard tone="tint" gap={2}>
        <GlowzText kind="small" weight={600}>Cancellation policy</GlowzText>
        <GlowzText kind="small">Free cancellation until 24 hours before. Late cancellation: 50% fee. No-show: full price. Price and policy are saved with your booking.</GlowzText>
      </GlowzCard>
      <GlowzText kind="small" muted>Prototype: no payment is taken and nothing is sent to the provider.</GlowzText>
      <GlowzHoldTimer until={b.hold} paused={b.processing} onExpire={flow.expireHold} />
    </View>
  );
}
