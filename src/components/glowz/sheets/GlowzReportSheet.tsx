import React, { useState } from 'react';
import { View } from 'react-native';
import { useBookings } from '../../../hooks/Glowz/useBookings';
import { useGlowzSheet } from '../../../hooks/Glowz/GlowzSheetContext';
import { getProvider } from '../../../util/Glowz/catalog';
import { GlowzButton } from '../GlowzButton';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';
import { GlowzTextField } from '../GlowzTextField';

export const REPORT_REASONS = ['Misleading service or price', 'Photo used without permission', 'Unprofessional conduct', 'Unsafe practice', 'Suspected fraud', 'Harassment', 'Other'];

export function GlowzReportSheet({ providerId }: { providerId: string }) {
  const { closeSheet } = useGlowzSheet();
  const { submitReport } = useBookings();
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState('');
  const p = getProvider(providerId);
  return (
    <GlowzSheet title={`Report ${p ? p.name : ''}`} onClose={closeSheet}>
      <View style={{ gap: 8 }}>
        {REPORT_REASONS.map((r) => (
          <GlowzOptionRow key={r} selected={reason === r} onPress={() => setReason(r)}>
            <GlowzText weight={600} style={{ flex: 1 }}>{r}</GlowzText>
          </GlowzOptionRow>
        ))}
      </View>
      <GlowzTextField value={text} onChangeText={setText} multiline numberOfLines={2} maxLength={500} placeholder="Add details (optional)" accessibilityLabel="Report details" />
      <GlowzButton label="Send report" disabled={!reason} onPress={() => reason && submitReport(providerId, reason, text)} />
    </GlowzSheet>
  );
}
