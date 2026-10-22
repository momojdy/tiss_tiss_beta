import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzText } from './GlowzText';

export type BadgeTone = 'default' | 'ok' | 'warn' | 'bad' | 'mute';

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlowzBadge({ label, tone = 'default', icon, small, style }: Props) {
  const { c } = useGlowzTheme();
  const look = {
    default: [c.tint, c.tintInk], ok: [c.sageSoft, c.sageInk], warn: [c.warnBg, c.warn], bad: [c.badBg, c.bad], mute: [c.line, c.muted],
  }[tone];
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 99, backgroundColor: look[0], paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 1 : 3 },
        style,
      ]}
    >
      {icon}
      <GlowzText weight={600} size={small ? 11 : 11.5} color={look[1]}>{label}</GlowzText>
    </View>
  );
}
