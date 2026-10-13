import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../store/SettingsContext';
import { Quote } from '../types';
import { Txt } from './Txt';

export const PriceBreakdown = ({ quote }: { quote: Quote }) => {
  const { colors } = useTheme();
  const { money } = useSettings();
  return (
    <View style={{ gap: 8 }}>
      {quote.lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Txt sub style={{ flex: 1 }}>
            {l.label}
          </Txt>
          <Txt color={l.negative ? colors.teal : undefined}>{money(l.amount)}</Txt>
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="h3">Total</Txt>
        <Txt v="h3">{money(quote.total)}</Txt>
      </View>
      <Txt v="small" sub>
        Tax included
      </Txt>
    </View>
  );
};
