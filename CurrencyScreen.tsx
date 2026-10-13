import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { CURRENCIES, formatMoney } from '../lib/money';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';
import { CurrencyCode } from '../types';

export const CurrencyScreen = () => {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { currency, setCurrency, rates } = useSettings();
  return (
    <Screen title="Currency">
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
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? colors.brand : colors.line, borderWidth: on ? 2 : 1 }}>
              <View style={{ flex: 1 }}>
                <Txt v="h3">
                  {c} · {CURRENCIES[c].name}
                </Txt>
                <Txt v="small" sub>
                  $100 = {formatMoney(100, c, rates)}
                </Txt>
              </View>
              {on ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
            </Card>
          </Pressable>
        );
      })}
      <Txt v="small" sub>
        Gourde and peso prices use the live exchange rate plus a 0.77% margin.
      </Txt>
    </Screen>
  );
};
