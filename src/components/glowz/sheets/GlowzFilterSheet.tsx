import React from 'react';
import { View } from 'react-native';
import { useExplore } from '../../../hooks/Glowz/useExplore';
import { useGlowzSheet } from '../../../hooks/Glowz/GlowzSheetContext';
import type { Filters } from '../../../types/glowz/state';
import { GlowzButton } from '../GlowzButton';
import { GlowzChip } from '../GlowzChip';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';

const PRICES: { id: Filters['price']; label: string }[] = [
  { id: 'any', label: 'Any' }, { id: 'lt1000', label: 'Under ₱1,000' }, { id: '1to3', label: '₱1,000 to ₱3,000' }, { id: 'gt3', label: 'Over ₱3,000' },
];
const RATINGS = [0, 4.5, 4.7, 4.8];
const WHERE: { id: Filters['loc']; label: string }[] = [{ id: 'any', label: 'Anywhere' }, { id: 'salon', label: 'In salon' }, { id: 'home', label: 'At home' }];
const FLAGS: { id: 'verified' | 'promo' | 'today'; label: string }[] = [
  { id: 'verified', label: 'Verified only' }, { id: 'promo', label: 'Has an offer' }, { id: 'today', label: 'Open slots today' },
];

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 6 }}>
    <GlowzText kind="small" weight={600}>{title}</GlowzText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>
  </View>
);

/** Filters update the results behind the sheet as you tap. */
export function GlowzFilterSheet() {
  const { closeSheet } = useGlowzSheet();
  const ex = useExplore();
  const f = ex.state.f;
  return (
    <GlowzSheet title="Filters" onClose={closeSheet}>
      <Group title="Starting price">
        {PRICES.map((o) => <GlowzChip key={o.id} label={o.label} selected={f.price === o.id} onPress={() => ex.setFilter('price', o.id)} />)}
      </Group>
      <Group title="Minimum rating">
        {RATINGS.map((v) => <GlowzChip key={v} label={v ? `${v} and up` : 'Any'} selected={f.rating === v} onPress={() => ex.setFilter('rating', v)} />)}
      </Group>
      <Group title="Where">
        {WHERE.map((o) => <GlowzChip key={o.id} label={o.label} selected={f.loc === o.id} onPress={() => ex.setFilter('loc', o.id)} />)}
      </Group>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {FLAGS.map((o) => <GlowzChip key={o.id} label={o.label} selected={f[o.id]} onPress={() => ex.toggleFilter(o.id)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <GlowzButton variant="ghost" label="Reset" onPress={ex.clearAll} style={{ flex: 1 }} />
        <GlowzButton label={`Show ${ex.providers.length} results`} onPress={closeSheet} style={{ flex: 1 }} />
      </View>
    </GlowzSheet>
  );
}
