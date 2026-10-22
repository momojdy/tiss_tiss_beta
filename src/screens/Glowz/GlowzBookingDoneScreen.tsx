import React from 'react';
import { View } from 'react-native';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useBookingFlow } from '../../hooks/Glowz/useBookingFlow';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzCard } from '../../components/glowz/GlowzCard';
import { GlowzIcon } from '../../components/glowz/GlowzIcon';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzText } from '../../components/glowz/GlowzText';
import { GlowzTopBar } from '../../components/glowz/GlowzTopBar';
import { getProvider } from '../../util/Glowz/catalog';
import { fmtD, fmtT } from '../../util/Glowz/format';

/** Booking completion: reference, summary and where to go next. */
export function GlowzBookingDoneScreen({ bookingRef }: { bookingRef: string }) {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const { bookings } = useGlowzState();
  const flow = useBookingFlow();
  const cmd = useGlowzCommands();
  const bk = bookings.find((x) => x.ref === bookingRef);
  const p = bk ? getProvider(bk.p) : undefined;
  if (!bk || !p) return null;
  const ok = bk.status === 'confirmed';
  return (
    <GlowzScreen header={<GlowzTopBar onBack={cmd.goHome} backLabel="Back to home"><View style={{ flex: 1 }} /></GlowzTopBar>}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, paddingTop: 12, gap: 14, alignItems: 'center' }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: ok ? c.okBg : c.warnBg, alignItems: 'center', justifyContent: 'center' }}>
          <GlowzIcon name="check" size={44} color={ok ? c.ok : c.warn} />
        </View>
        <GlowzText kind="display" size={26} accessibilityRole="header">{ok ? 'You are booked' : 'Request sent'}</GlowzText>
        <GlowzText muted center>{ok ? 'This provider confirms instantly.' : 'The professional has up to 12 hours to accept. This is a sample request.'}</GlowzText>
        <GlowzCard gap={6} style={{ alignSelf: 'stretch' }}>
          <GlowzText kind="tiny" muted>Booking reference</GlowzText>
          <GlowzText kind="display" weight={700} size={24}>{bk.ref}</GlowzText>
          <GlowzText weight={600}>{bk.items.map((i) => i.n).join(', ')}</GlowzText>
          <GlowzText>{fmtD(bk.date, true)} · {fmtT(bk.time)}</GlowzText>
          <GlowzText kind="small" muted>{p.name} · {bk.staff}</GlowzText>
          <GlowzText kind="small">{bk.paid}</GlowzText>
        </GlowzCard>
        <GlowzText kind="small" muted center>Sample booking. Nothing was charged and no provider was contacted.</GlowzText>
        <GlowzButton label="View booking" onPress={() => flow.viewBooking(bk.ref)} />
        <GlowzButton variant="ghost" label="Back to home" onPress={cmd.goHome} />
      </View>
    </GlowzScreen>
  );
}
