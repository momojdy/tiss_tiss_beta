import React from 'react';
import { View } from 'react-native';
import { useExplore } from '../../../hooks/Glowz/useExplore';
import { useGlowzSheet } from '../../../hooks/Glowz/GlowzSheetContext';
import type { SortKey } from '../../../types/glowz/state';
import { GlowzOptionRow } from '../GlowzOptionRow';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'relevance', label: 'Relevance' }, { id: 'distance', label: 'Distance' }, { id: 'rating', label: 'Rating' }, { id: 'price', label: 'Price' }, { id: 'soon', label: 'Earliest slot' },
];

/** Replaces the web dropdown with a native choice sheet. */
export function GlowzSortSheet() {
  const { closeSheet } = useGlowzSheet();
  const ex = useExplore();
  return (
    <GlowzSheet title="Sort by" onClose={closeSheet}>
      <View style={{ gap: 8 }}>
        {SORT_OPTIONS.map((o) => (
          <GlowzOptionRow key={o.id} selected={ex.state.sort === o.id} onPress={() => { ex.setSort(o.id); closeSheet(); }}>
            <GlowzText weight={600}>{o.label}</GlowzText>
          </GlowzOptionRow>
        ))}
      </View>
    </GlowzSheet>
  );
}
