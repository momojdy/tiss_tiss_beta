import React from 'react';
import { View } from 'react-native';
import { AREAS } from '../../../data/glowz/areas';
import { useGlowzStore } from '../../../hooks/Glowz/GlowzStore';
import { useGlowzSheet } from '../../../hooks/Glowz/GlowzSheetContext';
import { useToast } from '../../../hooks/Glowz/GlowzToast';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';

export function GlowzAreaSheet() {
  const { closeSheet } = useGlowzSheet();
  const { state, update } = useGlowzStore();
  const toast = useToast();
  return (
    <GlowzSheet title="Where are you?" onClose={closeSheet}>
      <View style={{ gap: 8 }}>
        {AREAS.map((a) => (
          <GlowzOptionRow
            key={a}
            selected={state.area === a}
            onPress={() => { update((s) => ({ ...s, area: a })); closeSheet(); toast('Showing ' + a); }}
          >
            <GlowzText weight={600}>{a}</GlowzText>
          </GlowzOptionRow>
        ))}
      </View>
      <GlowzText kind="small" muted>At-home professionals show whether they cover this area.</GlowzText>
    </GlowzSheet>
  );
}
