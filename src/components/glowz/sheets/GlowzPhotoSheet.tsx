import React from 'react';
import { useBookingFlow } from '../../hooks/useBookingFlow';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { PORTFOLIO_HUES } from '../../data/portfolio';
import { categoryIcon, getProvider } from '../../utils/catalog';
import { GlowzArt } from '../GlowzArt';
import { GlowzButton } from '../GlowzButton';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';

export function GlowzPhotoSheet({ providerId, index }: { providerId: string; index: number }) {
  const { closeSheet } = useGlowzSheet();
  const flow = useBookingFlow();
  const p = getProvider(providerId);
  if (!p) return null;
  return (
    <GlowzSheet title={p.name} onClose={closeSheet}>
      <GlowzArt h={PORTFOLIO_HUES[index]} icon={categoryIcon(p.cats[index % p.cats.length])} style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }} />
      <GlowzText kind="small" muted>Sample portfolio illustration {index + 1} of 9. Real photos will appear here when providers upload them.</GlowzText>
      <GlowzButton label={`Book ${p.name}`} onPress={() => { closeSheet(); flow.start(p.id, null); }} />
    </GlowzSheet>
  );
}
