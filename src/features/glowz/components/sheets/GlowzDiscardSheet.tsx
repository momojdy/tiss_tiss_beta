import React from 'react';
import { useBookingFlow } from '../../hooks/useBookingFlow';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { GlowzButton } from '../GlowzButton';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';

export function GlowzDiscardSheet() {
  const { closeSheet } = useGlowzSheet();
  const flow = useBookingFlow();
  return (
    <GlowzSheet title="Discard this booking?" onClose={closeSheet} hideClose>
      <GlowzText kind="small" muted>Your selections will be lost.</GlowzText>
      <GlowzButton label="Keep editing" onPress={closeSheet} />
      <GlowzButton variant="danger" label="Discard" onPress={flow.discard} />
    </GlowzSheet>
  );
}