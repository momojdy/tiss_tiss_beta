import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzTxt } from './stayzTxt';
import { CURRENCIES, formatMoney } from './stayzMoney';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';
import { CurrencyCode } from './stayzTypes';

export const StayzCurrencyScreen = () => {
  const nav = useNavigation();
  const { colors } = useStayzTheme();
  const { currency, setCurrency, rates } = useStayzSettings();
  return (
    <StayzScreen title="Currency">
      {(Object.keys(CURRENCIES) as CurrencyCode[]).map(c => {
        const on = currency === c;
        return (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              setCurrency(c);
              nav.goBack();
            }}>
            <StayzCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? colors.brand : colors.line, borderWidth: on ? 2 : 1 }}>
              <View style={{ flex: 1 }}>
                <StayzTxt v="h3">
                  {c} · {CURRENCIES[c].name}
                </StayzTxt>
                <StayzTxt v="small" sub>
                  $100 = {formatMoney(100, c, rates)}
                </StayzTxt>
              </View>
              {on ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
            </StayzCard>
          </Pressable>
        );
      })}
      <StayzTxt v="small" sub>
        Gourde and peso prices use the live exchange rate plus a 0.77% margin.
      </StayzTxt>
    </StayzScreen>
  );
};
