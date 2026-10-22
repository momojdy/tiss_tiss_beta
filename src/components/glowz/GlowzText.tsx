import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { bodyFont, displayFont } from '../styles/typography';

export type TextKind = 'body' | 'small' | 'tiny' | 'display';

interface Props extends TextProps {
  kind?: TextKind;
  size?: number;
  weight?: 400 | 500 | 600 | 700;
  muted?: boolean;
  color?: string;
  center?: boolean;
  price?: boolean;
  style?: StyleProp<TextStyle>;
}

/** The one text component: applies the theme ink colour, body or display font, and the prototype's sizes. */
export function GlowzText({ kind = 'body', size, weight, muted, color, center, price, style, children, ...rest }: Props) {
  const { c } = useGlowzTheme();
  const base: TextStyle =
    kind === 'display'
      ? { ...displayFont((weight === 700 ? 700 : 600) as 600 | 700), fontSize: size ?? 26, lineHeight: Math.round((size ?? 26) * 1.12) }
      : kind === 'tiny'
        ? { ...bodyFont(600), fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 16 }
        : kind === 'small'
          ? { ...bodyFont((weight as 400 | 500 | 600) ?? 400), fontSize: size ?? 13, lineHeight: Math.round((size ?? 13) * 1.45) }
          : { ...bodyFont((weight as 400 | 500 | 600) ?? 400), fontSize: size ?? 15, lineHeight: Math.round((size ?? 15) * 1.45) };
  return (
    <Text {...rest} style={[base, { color: color ?? (muted ? c.muted : c.ink) }, center && { textAlign: 'center' }, price && { fontVariant: ['tabular-nums'], fontWeight: '600' }, style]}>
      {children}
    </Text>
  );
}
