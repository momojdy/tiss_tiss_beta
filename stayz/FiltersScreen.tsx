import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { TextField } from '../components/TextField';
import { Txt } from '../components/Txt';
import { AMENITIES, PROPERTY_TYPES, defaultFilters } from '../lib/listings';
import { useSearch } from '../store/SearchContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';
import { Filters, PropertyType } from '../types';
import { convert } from '../lib/money';

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

export const FiltersScreen = () => {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { filters, setFilters } = useSearch();
  const { currency, rates } = useSettings();
  const [f, setF] = useState<Filters>(filters);
  const factor = convert(1, currency, rates);
  const shown = (usd: number) => String(Math.round(usd * factor));
  const [min, setMin] = useState(f.minPrice > 0 ? shown(f.minPrice) : '');
  const [max, setMax] = useState(f.maxPrice < 1000 ? shown(f.maxPrice) : '');

  const apply = () => {
    const lo = min ? Math.max(0, Number(min) / factor) : 0;
    const hi = max ? Number(max) / factor : 1000;
    setFilters({ ...f, minPrice: Math.floor(lo), maxPrice: Math.ceil(Math.max(hi, lo)) });
    nav.goBack();
  };

  return (
    <Screen
      title="Filters"
      footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title="Reset"
            kind="secondary"
            style={{ flex: 1 }}
            onPress={() => {
              setF(defaultFilters());
              setMin('');
              setMax('');
            }}
          />
          <Button title="Show stays" onPress={apply} style={{ flex: 2 }} />
        </View>
      }>
      <Section title="Property type">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PROPERTY_TYPES.map(t => (
            <Chip key={t} label={t} on={f.types.includes(t as PropertyType)} onPress={() => setF({ ...f, types: toggle(f.types, t as PropertyType) })} />
          ))}
        </View>
      </Section>
      <Section title={`Price (${currency})`}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Minimum" value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Maximum" value={max} onChangeText={setMax} keyboardType="number-pad" placeholder="No limit" />
          </View>
        </View>
      </Section>
      <Section title="Amenities">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AMENITIES.map(a => (
            <Chip key={a} label={a} on={f.amenities.includes(a)} onPress={() => setF({ ...f, amenities: toggle(f.amenities, a) })} />
          ))}
        </View>
      </Section>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Txt v="h3">Free cancellation</Txt>
          <Txt v="small" sub>
            Only properties that allow free cancellation
          </Txt>
        </View>
        <Switch value={f.freeCancel} onValueChange={v => setF({ ...f, freeCancel: v })} trackColor={{ true: colors.brand, false: colors.line }} />
      </View>
    </Screen>
  );
};
