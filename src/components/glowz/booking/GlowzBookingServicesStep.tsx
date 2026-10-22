import React from 'react';
import { View } from 'react-native';
import { PRICE } from '../../../data/glowz/prices';
import type { BookingFlow } from '../../../hooks/Glowz/useBookingFlow';
import type { BookingDraft } from '../../../types/glowz/booking';
import type { Provider } from '../../../types/glowz/provider';
import { peso } from '../../../util/Glowz/format';
import { GlowzChip } from '../GlowzChip';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzText } from '../GlowzText';

export function GlowzBookingServicesStep({ draft, provider: p, flow }: { draft: BookingDraft; provider: Provider; flow: BookingFlow }) {
  return (
    <View style={{ gap: 14 }}>
      <GlowzText kind="display" size={22}>Choose your services</GlowzText>
      <View style={{ gap: 10 }}>
        {p.svc.map((s) => {
          const it = draft.items.find((i) => i.id === s.id);
          return (
            <View key={s.id} style={{ gap: 8 }}>
              <GlowzOptionRow control="check" selected={!!it} onPress={() => flow.toggleService(s.id)} accessibilityLabel={`${s.n}, ${s.d} minutes, ${peso(PRICE[s.id])}`}>
                <View style={{ flex: 1 }}>
                  <GlowzText weight={600}>{s.n}</GlowzText>
                  <GlowzText kind="small" muted>{s.d} min</GlowzText>
                </View>
                <GlowzText price>{peso(PRICE[s.id])}</GlowzText>
              </GlowzOptionRow>
              {it && s.add.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 6 }}>
                  {s.add.map((a) => (
                    <GlowzChip key={a[0]} selected={it.add.includes(a[0])} label={`+ ${a[0]} ${peso(a[1])}`} onPress={() => flow.toggleAddon(s.id, a[0])} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
