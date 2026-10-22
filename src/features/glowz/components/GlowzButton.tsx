import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { radius, size as sz } from '../styles/tokens';
import { GlowzText } from './GlowzText';

export type ButtonVariant = 'primary' | 'ghost' | 'soft' | 'sage' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  small?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Primary action button. Full width by default, compact with `small`. */
export function GlowzButton({ label, onPress, variant = 'primary', small, disabled, icon, style, accessibilityLabel }: Props) {
  const { c } = useGlowzTheme();
  const look = {
    primary: { bg: c.accent, fg: c.accentInk, border: 'transparent' },
    ghost: { bg: 'transparent', fg: c.ink, border: c.line },
    soft: { bg: c.tint, fg: c.tintInk, border: 'transparent' },
    sage: { bg: c.sageSoft, fg: c.sageInk, border: 'transparent' },
    danger: { bg: c.badBg, fg: c.bad, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={small ? { top: 6, bottom: 6, left: 4, right: 4 } : undefined}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.full,
        { backgroundColor: look.bg, borderColor: look.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      <GlowzText weight={600} size={small ? 13 : 15} color={look.fg} numberOfLines={1} style={styles.label}>
        {label}
      </GlowzText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  full: { height: sz.control, paddingHorizontal: 22, borderRadius: radius.lg, alignSelf: 'stretch' },
  small: { height: 36, paddingHorizontal: 15, borderRadius: radius.sm, alignSelf: 'flex-start' },
  label: { letterSpacing: 0.15 },
});