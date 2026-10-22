import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzIcon } from './GlowzIcon';

interface Props {
  saved: boolean;
  onPress: () => void;
  label: string;
  size?: number;
  iconSize?: number;
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Heart toggle for providers and looks. Always a sibling of the card button, never inside it. */
export function GlowzHeartButton({ saved, onPress, label, size = 34, iconSize = 17, background, style }: Props) {
  const { c } = useGlowzTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: saved }}
      hitSlop={size < 44 ? Math.ceil((44 - size) / 2) : 0}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: background ?? c.surface, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <GlowzIcon name="heart" size={iconSize} color={c.roseInk} filled={saved} />
    </Pressable>
  );
}
