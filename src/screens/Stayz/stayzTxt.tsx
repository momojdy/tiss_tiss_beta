import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { useStayzTheme } from './stayzThemeContext';

type Variant = 'hero' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'caption';

const sizes: Record<Variant, TextStyle> = {
  hero: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  h3: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
};

interface Props extends TextProps {
  v?: Variant;
  sub?: boolean;
  color?: string;
  bold?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

export const StayzTxt = ({ v = 'body', sub, color, bold, center, style, ...rest }: Props) => {
  const { colors } = useStayzTheme();
  return <Text {...rest} style={[sizes[v], { color: color ?? (sub ? colors.sub : colors.text) }, bold && { fontWeight: '700' }, center && { textAlign: 'center' }, style]} />;
};
