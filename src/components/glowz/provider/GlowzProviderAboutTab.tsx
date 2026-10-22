import React from 'react';
import { View } from 'react-native';
import { useChat } from '../../hooks/useChat';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { useGlowzTheme } from '../../styles/ThemeContext';
import type { Provider } from '../../types/provider';
import { GlowzButton } from '../GlowzButton';
import { GlowzCard } from '../GlowzCard';
import { GlowzIcon } from '../GlowzIcon';
import { GlowzText } from '../GlowzText';

const Field = ({ label, value }: { label: string; value: string }) => (
  <View>
    <GlowzText kind="tiny" muted>{label}</GlowzText>
    <GlowzText>{value}</GlowzText>
  </View>
);

export function GlowzProviderAboutTab({ provider: p }: { provider: Provider }) {
  const { c } = useGlowzTheme();
  const { openChat } = useChat();
  const { openSheet } = useGlowzSheet();
  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <GlowzCard gap={10}>
        <Field label="Opening hours" value={p.hours} />
        <Field label={p.home ? 'Service area' : 'Address'} value={p.addr} />
        <Field label="Arrival" value={p.park} />
        <Field label="Accepted payments" value={p.pay.join(', ')} />
        <Field label="Cancellation" value="Free until 24 hours before. Late cancellation: 50% fee. No-show: full price." />
      </GlowzCard>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <GlowzButton variant="ghost" label="Message" icon={<GlowzIcon name="chat" size={18} color={c.ink} />} onPress={() => openChat(p.id)} style={{ flex: 1 }} />
        <GlowzButton variant="ghost" label="Report" icon={<GlowzIcon name="flag" size={18} color={c.ink} />} onPress={() => openSheet({ kind: 'report', pid: p.id })} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
