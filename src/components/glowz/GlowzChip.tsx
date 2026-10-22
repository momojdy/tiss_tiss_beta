import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { radius, size } from '../../styles/Glowz/tokens';
import { GlowzText } from './GlowzText';

interface Props {
  label: string;
  onPress: () => void;
  selected?: boolean;
  /** Tinted style used for removable active-filter chips. */
  tinted?: boolean;
  right?: React.ReactNode;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function GlowzChip({ label, onPress, selected, tinted, right, height = size.chip, fontSize = 13, style, accessibilityLabel }: Props) {
  const { c } = useGlowzTheme();
  const bg = selected ? c.ink : tinted ? c.tint : c.surface;
  const fg = selected ? c.bg : tinted ? c.tintInk : c.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      style={[
        {
          height, paddingHorizontal: height < 34 ? 10 : 15, borderRadius: radius.pill, borderWidth: 1,
          borderColor: selected ? c.ink : tinted ? 'transparent' : c.line, backgroundColor: bg,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0,
        },
        style,
      ]}
    >
      <GlowzText weight={500} size={fontSize} color={fg} numberOfLines={1}>{label}</GlowzText>
      {right}
    </Pressable>
  );
}
