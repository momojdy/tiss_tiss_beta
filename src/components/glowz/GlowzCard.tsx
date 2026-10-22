import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { radius } from '../styles/tokens';

interface Props {
  children: React.ReactNode;
  /** Use the tinted background (next visit, policy, referral). */
  tone?: 'surface' | 'tint' | 'sage' | 'warn';
  row?: boolean;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function GlowzCard({ children, tone = 'surface', row, gap = 10, style }: Props) {
  const { c } = useGlowzTheme();
  const bg = { surface: c.surface, tint: c.tint, sage: c.sageSoft, warn: c.warnBg }[tone];
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: radius.lg, borderWidth: 1, borderColor: tone === 'surface' ? c.line : 'transparent', paddingVertical: 12, paddingHorizontal: 14, gap },
        row && { flexDirection: 'row', alignItems: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
