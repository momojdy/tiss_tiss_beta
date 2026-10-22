import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzSheet } from '../../hooks/Glowz/GlowzSheetContext';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useBookings } from '../../hooks/Glowz/useBookings';
import { useChat } from '../../hooks/Glowz/useChat';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { BOOKING_STATUS } from '../../components/glowz/GlowzBookingCard';
import { GlowzArt } from '../../components/glowz/GlowzArt';
import { GlowzBadge } from '../../components/glowz/GlowzBadge';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzCard } from '../../components/glowz/GlowzCard';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzQRCode } from '../../components/glowz/GlowzQRCode';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzStarRow } from '../../components/glowz/GlowzStars';
import { GlowzSummaryRow } from '../../components/glowz/GlowzSummaryRow';
import { GlowzText } from '../../components/glowz/GlowzText';
import { GlowzTopBar } from '../../components/glowz/GlowzTopBar';
import { getProvider, providerIcon } from '../../util/Glowz/catalog';
import { fmtD, fmtT, peso } from '../../util/Glowz/format';

export function GlowzBookingDetailScreen({ bookingRef }: { bookingRef: string }) {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const nav = useGlowzNav();
  const cmd = useGlowzCommands();
  const { bookings } = useGlowzState();
  const { reschedule, openCancel } = useBookings();
  const { openChat } = useChat();
  const { openSheet } = useGlowzSheet();
  const b = bookings.find((x) => x.ref === bookingRef);
  const p = b ? getProvider(b.p) : undefined;

  if (!b || !p) {
    return (
      <GlowzScreen header={<GlowzTopBar title="Booking" onBack={nav.back} />}>
        <GlowzEmptyState title="Booking not found" subtitle="It may have been removed or the reference is wrong." action={<GlowzButton small label="Go to bookings" onPress={() => nav.goRoot('bookings')} />} />
      </GlowzScreen>
    );
  }
  const [label, tone] = BOOKING_STATUS[b.status];
  const live = b.status === 'confirmed' || b.status === 'pending';

  return (
    <GlowzScreen header={<GlowzTopBar title={`Booking ${b.ref}`} onBack={nav.back} />}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
        <GlowzCard gap={8}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <GlowzBadge label={label} tone={tone} />
            <GlowzText kind="small" muted>{b.ref}</GlowzText>
          </View>
          <GlowzText size={18} weight={600}>{fmtD(b.date, true)}</GlowzText>
          <GlowzText>{fmtT(b.time)} · {b.items.reduce((a, i) => a + i.dur, 0)} min with {b.staff}</GlowzText>
          {b.status === 'pending' ? (
            <View style={{ backgroundColor: c.warnBg, padding: 10, borderRadius: 12 }}>
              <GlowzText kind="small" color={c.warn}>Waiting for the professional to accept. If there is no reply within 12 hours the request expires and the held slot is released.</GlowzText>
            </View>
          ) : null}
        </GlowzCard>
        {b.status === 'confirmed' ? (
          <GlowzCard gap={8} style={{ alignItems: 'center' }}>
            <GlowzText weight={600}>Check-in code</GlowzText>
            <GlowzQRCode seed={b.ref} />
            <GlowzText kind="small" muted center>Demo code for this prototype. It is not a real check-in credential.</GlowzText>
          </GlowzCard>
        ) : null}
        <Pressable onPress={() => cmd.openProvider(p.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`}>
          <GlowzCard row>
            <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: 48, height: 48, borderRadius: 12 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <GlowzText weight={600} numberOfLines={1}>{p.name}</GlowzText>
              <GlowzText kind="small" muted>{b.loc === 'home' ? 'At your address' + (b.addr ? ': ' + b.addr : '') : p.addr}</GlowzText>
            </View>
            <GlowzText muted>›</GlowzText>
          </GlowzCard>
        </Pressable>
        <GlowzCard gap={8}>
          <GlowzText weight={600}>Services</GlowzText>
          {b.items.map((i) => <GlowzSummaryRow key={i.id} label={i.n} value={peso(i.price)} />)}
          <GlowzSummaryRow total label="Total" value={peso(b.total)} />
          <GlowzText kind="small" muted>Prices are saved at booking. Later changes by the provider do not affect this visit.</GlowzText>
        </GlowzCard>
        <GlowzCard gap={4}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GlowzText weight={600}>Payment</GlowzText>
            <GlowzBadge tone="mute" label="Demo" />
          </View>
          <GlowzText>{b.paid}</GlowzText>
        </GlowzCard>
        {b.review ? (
          <GlowzCard gap={4}>
            <GlowzText weight={600}>Your review (sample, saved on this device)</GlowzText>
            <GlowzStarRow value={b.review.s} />
            {b.review.t ? <GlowzText kind="small">{b.review.t}</GlowzText> : null}
          </GlowzCard>
        ) : null}
        <GlowzCard gap={4}>
          <GlowzText weight={600}>Cancellation terms</GlowzText>
          <GlowzText kind="small">{b.policy}</GlowzText>
        </GlowzCard>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <GlowzButton variant="ghost" label="Message" onPress={() => openChat(p.id)} style={{ flex: 1 }} />
          {live ? <GlowzButton variant="ghost" label="Reschedule" onPress={() => reschedule(b.ref)} style={{ flex: 1 }} /> : null}
        </View>
        {live ? <GlowzButton variant="danger" label="Cancel appointment" onPress={() => openCancel(b.ref)} /> : null}
        {b.status === 'completed' && !b.reviewed ? <GlowzButton label="Leave a review" onPress={() => openSheet({ kind: 'review', ref: b.ref })} /> : null}
        <Pressable onPress={() => openSheet({ kind: 'report', pid: p.id })} accessibilityRole="button" style={{ alignItems: 'center', padding: 8 }}>
          <GlowzText kind="small" muted>Report a problem with this booking</GlowzText>
        </Pressable>
      </View>
    </GlowzScreen>
  );
}
