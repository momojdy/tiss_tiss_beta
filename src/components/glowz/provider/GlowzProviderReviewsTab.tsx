import React from 'react';
import { View } from 'react-native';
import { REVIEWS } from '../../data/reviews';
import { useGlowzTheme } from '../../styles/ThemeContext';
import type { Provider } from '../../types/provider';
import { GlowzBadge } from '../GlowzBadge';
import { GlowzCard } from '../GlowzCard';
import { GlowzStarRow } from '../GlowzStars';
import { GlowzText } from '../GlowzText';

const SHARE: Record<number, number> = { 5: 0.78, 4: 0.15, 3: 0.04, 2: 0.02, 1: 0.01 };

export function GlowzProviderReviewsTab({ provider: p }: { provider: Provider }) {
  const { c } = useGlowzTheme();
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: Math.round(p.rv * SHARE[n]) }));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 14 }}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <GlowzText kind="display" size={56} style={{ lineHeight: 56 }}>{p.rating.toFixed(1)}</GlowzText>
          <GlowzStarRow value={5} />
          <GlowzText kind="small" muted>{p.rv} verified visits</GlowzText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {dist.map((d) => (
            <View key={d.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GlowzText kind="small" style={{ width: 10 }}>{d.n}</GlowzText>
              <View style={{ flex: 1, height: 6, borderRadius: 6, backgroundColor: c.line, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${(d.c / p.rv) * 100}%`, backgroundColor: c.star }} />
              </View>
              <GlowzText kind="small" muted style={{ width: 28, textAlign: 'right' }}>{d.c}</GlowzText>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 14 }}>
        {REVIEWS.map((r) => (
          <GlowzCard key={r.u} gap={6}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <GlowzText weight={600}>{r.u}</GlowzText>
              <GlowzText kind="small" muted>{r.d}</GlowzText>
            </View>
            <GlowzStarRow value={r.s} />
            <GlowzText>{r.t}</GlowzText>
            <GlowzBadge label="Verified booking" tone="ok" />
            {r.reply ? (
              <View style={{ backgroundColor: c.tint, padding: 10, borderRadius: 12 }}>
                <GlowzText kind="small" weight={600}>Reply from {p.name}</GlowzText>
                <GlowzText kind="small">{r.reply}</GlowzText>
              </View>
            ) : null}
          </GlowzCard>
        ))}
      </View>
      <GlowzText kind="small" muted style={{ marginTop: 10 }}>Only customers with a completed booking can review. Providers can reply but not remove reviews.</GlowzText>
    </View>
  );
}
