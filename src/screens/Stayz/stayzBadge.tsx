import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { StayzTxt } from './stayzTxt';

interface Props {
  label: string;
  tone?: 'teal' | 'brand' | 'warn' | 'danger' | 'neutral';
  icon?: keyof typeof Ionicons.glyphMap;
}

export const StayzBadge = ({ label, tone = 'neutral', icon }: Props) => {
  const { colors } = useStayzTheme();
  const map = {
    teal: [colors.tealSoft, colors.teal],
    brand: [colors.brandSoft, colors.brand],
    warn: [colors.warnSoft, colors.warn],
    danger: [colors.dangerSoft, colors.danger],
    neutral: [colors.chip, colors.sub],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.b, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <StayzTxt v="caption" color={fg}>
        {label}
      </StayzTxt>
    </View>
  );
};

const styles = StyleSheet.create({
  b: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
});
