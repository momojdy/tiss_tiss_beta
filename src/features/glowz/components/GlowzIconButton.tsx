import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzIcon } from './GlowzIcon';

interface Props {
  icon: string;
  onPress: () => void;
  label: string;
  size?: number;
  iconSize?: number;
  color?: string;
  filled?: boolean;
  /** Small accent dot (unread, active filters). */
  dot?: boolean;
  background?: string;
  borderless?: boolean;
  radiusValue?: number;
  style?: StyleProp<ViewStyle>;
}

/** Round icon button with the surface fill and hairline border used across headers. */
export function GlowzIconButton({ icon, onPress, label, size = 40, iconSize = 19, color, filled, dot, background, borderless, radiusValue, style }: Props) {
  const { c } = useGlowzTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size < 44 ? Math.ceil((44 - size) / 2) : 0}
      style={({ pressed }) => [
        {
          width: size, height: size, borderRadius: radiusValue ?? size / 2, alignItems: 'center', justifyContent: 'center',
          backgroundColor: background ?? c.surface, borderWidth: borderless ? 0 : 1, borderColor: c.line, opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <GlowzIcon name={icon} size={iconSize} color={color ?? c.ink} filled={filled} />
      {dot ? <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, borderWidth: 2, borderColor: c.surface }} /> : null}
    </Pressable>
  );
}