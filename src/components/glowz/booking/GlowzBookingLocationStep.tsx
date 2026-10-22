import React from 'react';
import { View } from 'react-native';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { useGlowzTheme } from '../../styles/ThemeContext';
import type { BookingDraft } from '../../types/booking';
import type { Provider } from '../../types/provider';
import { peso } from '../../utils/format';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzText } from '../GlowzText';
import { GlowzTextField } from '../GlowzTextField';

export function GlowzBookingLocationStep({ draft, provider: p, flow }: { draft: BookingDraft; provider: Provider; flow: BookingFlow }) {
  const { c } = useGlowzTheme();
  const homeOnly = p.type === 'home';
  return (
    <View style={{ gap: 14 }}>
      <GlowzText kind="display" size={22}>Where should it happen?</GlowzText>
      <View style={{ gap: 10 }}>
        {homeOnly ? null : (
          <GlowzOptionRow selected={draft.loc === 'salon'} onPress={() => flow.setLocation('salon')}>
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>At the {p.type === 'independent' ? 'studio' : 'salon'}</GlowzText>
              <GlowzText kind="small" muted>{p.addr}</GlowzText>
            </View>
          </GlowzOptionRow>
        )}
        {p.home ? (
          <GlowzOptionRow selected={draft.loc === 'home'} onPress={() => flow.setLocation('home')}>
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>At your address</GlowzText>
              <GlowzText kind="small" muted>Travel fee {peso(p.travel ?? 0)}. Service area: {p.addr}</GlowzText>
            </View>
          </GlowzOptionRow>
        ) : (
          <GlowzOptionRow disabled control="radio">
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>At your address</GlowzText>
              <GlowzText kind="small" muted>Not offered by this provider</GlowzText>
            </View>
          </GlowzOptionRow>
        )}
      </View>
      {draft.loc === 'home' ? (
        <View style={{ gap: 6 }}>
          <GlowzText kind="small" weight={600}>Your address</GlowzText>
          <GlowzTextField value={draft.addr} onChangeText={flow.setAddress} multiline numberOfLines={2} placeholder="Unit, street, barangay, city" accessibilityLabel="Your address" />
          {draft.addrErr ? <GlowzText kind="small" weight={500} color={c.bad}>{draft.addrErr}</GlowzText> : null}
          <GlowzText kind="small" muted>Only shared with the professional once the booking is confirmed.</GlowzText>
        </View>
      ) : null}
    </View>
  );
}
