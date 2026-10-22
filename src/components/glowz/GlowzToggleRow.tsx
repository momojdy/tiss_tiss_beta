import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzText } from './GlowzText';

interface Props {
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle?: () => void;
  /** Always-on rows render dimmed and do nothing. */
  locked?: boolean;
}

export function GlowzToggleRow({ title, subtitle, value, onToggle, locked }: Props) {
  const { c } = useGlowzTheme();
  return (
    <Pressable
      onPress={locked ? undefined : onToggle}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value, disabled: !!locked }}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
    >
      <View style={{ flex: 1 }}>
        <GlowzText weight={600}>{title}</GlowzText>
        {subtitle ? <GlowzText kind="small" muted>{subtitle}</GlowzText> : null}
      </View>
      <View style={{ width: 46, height: 28, borderRadius: 99, backgroundColor: value ? c.sage : c.line, opacity: locked ? 0.5 : 1, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
      </View>
    </Pressable>
  );
}
