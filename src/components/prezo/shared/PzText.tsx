import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoFonts } from '../../../theme/prezoTheme';

export type PzTone = 'tx' | 'mu' | 'red' | 'ok' | 'on' | 'faint';

export interface PzTextProps extends TextProps {
  size?: number;
  weight?: 400 | 500 | 600;
  display?: 500 | 700 | 800;
  tone?: PzTone;
  lineHeight?: number;
  align?: TextStyle['textAlign'];
  underline?: boolean;
}

const bodyFamily = {
  400: prezoFonts.body400,
  500: prezoFonts.body500,
  600: prezoFonts.body600,
} as const;

const displayFamily = {
  500: prezoFonts.display500,
  700: prezoFonts.display700,
  800: prezoFonts.display800,
} as const;

export const PzText = ({
  size = 15,
  weight = 400,
  display,
  tone = 'tx',
  lineHeight,
  align,
  underline,
  style,
  children,
  ...rest
}: PzTextProps) => {
  const { colors } = usePrezoTheme();
  const color = {
    tx: colors.tx,
    mu: colors.mu,
    red: colors.rd2,
    ok: colors.ok,
    on: colors.on,
    faint: 'rgba(255,255,255,0.6)',
  }[tone];
  const base: TextStyle = display
    ? {
        fontFamily: displayFamily[display],
        fontSize: size,
        lineHeight: lineHeight ?? Math.round(size * 1.05 * 100) / 100,
        letterSpacing: -0.02 * size,
      }
    : {
        fontFamily: bodyFamily[weight],
        fontSize: size,
        lineHeight: lineHeight ?? size * 1.5,
      };
  return (
    <Text
      {...rest}
      style={[
        base,
        { color },
        align ? { textAlign: align } : null,
        underline ? { textDecorationLine: 'underline' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
};

