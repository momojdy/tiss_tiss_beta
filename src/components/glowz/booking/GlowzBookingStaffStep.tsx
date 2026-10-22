import React from 'react';
import { View } from 'react-native';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import type { BookingDraft } from '../../types/booking';
import type { Provider } from '../../types/provider';
import { GlowzArt } from '../GlowzArt';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzText } from '../GlowzText';

export function GlowzBookingStaffStep({ draft, provider: p, flow }: { draft: BookingDraft; provider: Provider; flow: BookingFlow }) {
  return (
    <View style={{ gap: 14 }}>
      <GlowzText kind="display" size={22}>Choose a professional</GlowzText>
      <View style={{ gap: 10 }}>
        <GlowzOptionRow selected={draft.staff === 'any'} onPress={() => flow.setStaff('any')}>
          <View style={{ flex: 1 }}>
            <GlowzText weight={600}>Any available</GlowzText>
            <GlowzText kind="small" muted>Earliest opening with the best match</GlowzText>
          </View>
        </GlowzOptionRow>
        {p.staff.map((s) => (
          <GlowzOptionRow key={s.id} selected={draft.staff === s.n} onPress={() => flow.setStaff(s.n)}>
            <GlowzArt h={p.h} icon="user" style={{ width: 44, height: 44, borderRadius: 22 }} />
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>{s.n}</GlowzText>
              <GlowzText kind="small" muted>{s.r}</GlowzText>
            </View>
          </GlowzOptionRow>
        ))}
      </View>
    </View>
  );
}
