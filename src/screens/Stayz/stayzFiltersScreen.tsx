import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StayzButton } from './stayzButton';
import { StayzChip } from './stayzChip';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzTextField } from './stayzTextField';
import { StayzTxt } from './stayzTxt';
import { AMENITIES, PROPERTY_TYPES, defaultFilters } from './stayzListings';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';
import { Filters, PropertyType } from './stayzTypes';
import { convert } from './stayzMoney';

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

export const StayzFiltersScreen = () => {
  const nav = useNavigation();
  const { colors } = useStayzTheme();
  const { filters, setFilters } = useStayzSearch();
  const { currency, rates } = useStayzSettings();
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
    <StayzScreen
      title="Filters"
      footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StayzButton
            title="Reset"
            kind="secondary"
            style={{ flex: 1 }}
            onPress={() => {
              setF(defaultFilters());
              setMin('');
              setMax('');
            }}
          />
          <StayzButton title="Show stays" onPress={apply} style={{ flex: 2 }} />
        </View>
      }>
      <StayzSection title="Property type">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PROPERTY_TYPES.map(t => (
            <StayzChip key={t} label={t} on={f.types.includes(t as PropertyType)} onPress={() => setF({ ...f, types: toggle(f.types, t as PropertyType) })} />
          ))}
        </View>
      </StayzSection>
      <StayzSection title={`Price (${currency})`}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <StayzTextField label="Minimum" value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <StayzTextField label="Maximum" value={max} onChangeText={setMax} keyboardType="number-pad" placeholder="No limit" />
          </View>
        </View>
      </StayzSection>
      <StayzSection title="Amenities">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AMENITIES.map(a => (
            <StayzChip key={a} label={a} on={f.amenities.includes(a)} onPress={() => setF({ ...f, amenities: toggle(f.amenities, a) })} />
          ))}
        </View>
      </StayzSection>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <StayzTxt v="h3">Free cancellation</StayzTxt>
          <StayzTxt v="small" sub>
            Only properties that allow free cancellation
          </StayzTxt>
        </View>
        <Switch value={f.freeCancel} onValueChange={v => setF({ ...f, freeCancel: v })} trackColor={{ true: colors.brand, false: colors.line }} />
      </View>
    </StayzScreen>
  );
};
