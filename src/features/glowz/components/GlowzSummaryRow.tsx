import React from 'react';
import { View } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzText } from './GlowzText';

interface Props {
  label: string;
  value: string;
  muted?: boolean;
  total?: boolean;
  color?: string;
  /** Dashed divider above the row. */
  divider?: boolean;
}

/** Label and tabular amount, as in the booking summary and totals. */
export function GlowzSummaryRow({ label, value, muted, total, color, divider }: Props) {
  const { c } = useGlowzTheme();
  const size = total ? 17 : muted ? 13 : 15;
  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-between', gap: 10,
        ...(total || divider ? { borderTopWidth: 1, borderTopColor: c.line, borderStyle: 'dashed', paddingTop: total ? 10 : 8 } : null),
      }}
    >
      <GlowzText size={size} weight={total ? 600 : 400} muted={muted} color={color} style={{ flex: 1 }}>{label}</GlowzText>
      <GlowzText size={size} weight={total ? 600 : 400} muted={muted} color={color} style={{ fontVariant: ['tabular-nums'] }}>{value}</GlowzText>
    </View>
  );
}