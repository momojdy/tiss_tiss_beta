import React from 'react';
import { View } from 'react-native';
import { useStayzTheme } from './stayzThemeContext';
import { useStayzSettings } from './stayzSettingsContext';
import { Quote } from './stayzTypes';
import { StayzTxt } from './stayzTxt';

export const StayzPriceBreakdown = ({ quote }: { quote: Quote }) => {
  const { colors } = useStayzTheme();
  const { money } = useStayzSettings();
  return (
    <View style={{ gap: 8 }}>
      {quote.lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <StayzTxt sub style={{ flex: 1 }}>
            {l.label}
          </StayzTxt>
          <StayzTxt color={l.negative ? colors.teal : undefined}>{money(l.amount)}</StayzTxt>
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <StayzTxt v="h3">Total</StayzTxt>
        <StayzTxt v="h3">{money(quote.total)}</StayzTxt>
      </View>
      <StayzTxt v="small" sub>
        Tax included
      </StayzTxt>
    </View>
  );
};
