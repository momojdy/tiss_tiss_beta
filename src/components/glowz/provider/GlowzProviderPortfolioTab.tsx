import React from 'react';
import { Pressable, View } from 'react-native';
import { PORTFOLIO_HUES } from '../../data/portfolio';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { useContentWidth, useGutter } from '../../styles/LayoutContext';
import type { Provider } from '../../types/provider';
import { categoryIcon } from '../../utils/catalog';
import { GlowzArt } from '../GlowzArt';
import { GlowzText } from '../GlowzText';

/** 3x3 sample portfolio. Tiles open a larger view. */
export function GlowzProviderPortfolioTab({ provider: p }: { provider: Provider }) {
  const { openSheet } = useGlowzSheet();
  const g = useGutter();
  const tile = (useContentWidth() - g.left - g.right - 12) / 3;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        {PORTFOLIO_HUES.map((h, i) => (
          <Pressable key={i} onPress={() => openSheet({ kind: 'photo', pid: p.id, index: i })} accessibilityRole="button" accessibilityLabel={`Open portfolio photo ${i + 1}`}>
            <GlowzArt h={h} icon={categoryIcon(p.cats[i % p.cats.length])} style={{ width: tile, height: tile, borderRadius: 12 }} />
          </Pressable>
        ))}
      </View>
      <GlowzText kind="small" muted style={{ marginTop: 10 }}>Client photos are shown only with the client's consent. See something that should not be here? Use Report.</GlowzText>
    </View>
  );
}
