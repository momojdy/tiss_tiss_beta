import React from 'react';
import { View } from 'react-native';
import { PROMOS } from '../../data/promos';
import { useGlowzTheme } from '../../styles/ThemeContext';
import type { Provider, Service } from '../../types/provider';
import { categoryName } from '../../utils/catalog';
import { GlowzCard } from '../GlowzCard';
import { GlowzServiceRow } from '../GlowzServiceRow';
import { GlowzText } from '../GlowzText';

export function GlowzProviderServicesTab({ provider: p }: { provider: Provider }) {
  const { c } = useGlowzTheme();
  const groups: Record<string, Service[]> = {};
  p.svc.forEach((s) => { (groups[s.cat] = groups[s.cat] || []).push(s); });
  return (
    <View>
      {Object.keys(groups).map((cat) => (
        <View key={cat}>
          <GlowzText kind="display" size={16} style={{ marginTop: 14, marginBottom: 8 }} accessibilityRole="header">{categoryName(cat)}</GlowzText>
          <View style={{ gap: 8 }}>{groups[cat].map((s) => <GlowzServiceRow key={s.id} provider={p} service={s} />)}</View>
        </View>
      ))}
      {p.promo ? (
        <GlowzCard tone="tint" gap={2} style={{ marginTop: 14 }}>
          <GlowzText weight={600}>{PROMOS[p.promo].label} with code {p.promo}</GlowzText>
          <GlowzText kind="small" color={c.ink}>Funded by {PROMOS[p.promo].funded.toLowerCase()}. Applied and checked at checkout. Cannot be combined with other codes.</GlowzText>
        </GlowzCard>
      ) : null}
    </View>
  );
}
