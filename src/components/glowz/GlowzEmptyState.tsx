import React from 'react';
import { View } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzIcon } from './GlowzIcon';
import { GlowzText } from './GlowzText';

interface Props {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  icon?: string;
}

/** Empty, not-found and error states share this layout. */
export function GlowzEmptyState({ title, subtitle, action, icon = 'explore' }: Props) {
  const { c } = useGlowzTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 20 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
        <GlowzIcon name={icon} size={26} color={c.tintInk} />
      </View>
      <GlowzText weight={600} center>{title}</GlowzText>
      <GlowzText muted center>{subtitle}</GlowzText>
      {action}
    </View>
  );
}
