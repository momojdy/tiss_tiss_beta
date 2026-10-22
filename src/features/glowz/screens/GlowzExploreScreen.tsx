import React, { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { CATEGORIES } from '../data/categories';
import { useExplore } from '../hooks/useExplore';
import { useGlowzSheet } from '../hooks/GlowzSheetContext';
import { useContentWidth, useGutter } from '../styles/LayoutContext';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzButton } from '../components/GlowzButton';
import { GlowzChip } from '../components/GlowzChip';
import { GlowzEmptyState } from '../components/GlowzEmptyState';
import { GlowzHorizontalRail } from '../components/GlowzHorizontalRail';
import { GlowzIcon } from '../components/GlowzIcon';
import { GlowzIconButton } from '../components/GlowzIconButton';
import { GlowzMapView } from '../components/GlowzMapView';
import { GlowzPostCard } from '../components/GlowzPostCard';
import { GlowzProviderRow } from '../components/GlowzProviderRow';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzSearchField } from '../components/GlowzSearchBar';
import { GlowzSegmented } from '../components/GlowzSegmented';
import { GlowzText } from '../components/GlowzText';
import { SORT_OPTIONS } from '../components/sheets/GlowzSortSheet';
import type { ExploreView } from '../types/state';
import { searchFocusBus } from '../utils/events';

const VIEWS: { id: ExploreView; label: string }[] = [
  { id: 'providers', label: 'List' },
  { id: 'map', label: 'Map' },
  { id: 'inspire', label: 'Inspiration' },
];

export function GlowzExploreScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const w = useContentWidth();
  const ex = useExplore();
  const { openSheet } = useGlowzSheet();
  const input = useRef<TextInput>(null);
  const { state } = ex;

  useEffect(() => searchFocusBus.subscribe(() => input.current?.focus()), []);

  const header = (
    <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <GlowzSearchField value={state.q} onChangeText={ex.setQuery} placeholder="Service, salon or area" inputRef={input} />
        <GlowzIconButton icon="filter" label={ex.activeCount ? `Filters, ${ex.activeCount} active` : 'Filters'} size={50} radiusValue={16} dot={ex.activeCount > 0} onPress={() => openSheet({ kind: 'filter' })} />
      </View>
      <GlowzSegmented options={VIEWS} value={state.expl} onChange={ex.setView} />
    </View>
  );

  const cardW = (Math.min(w, 480) - g.left - g.right - 12) / 2;
  const sel = state.mapSel ? ex.providers.find((p) => p.id === state.mapSel) ?? ex.providers[0] : ex.providers[0];
  const sortLabel = SORT_OPTIONS.find((o) => o.id === state.sort)?.label ?? 'Relevance';

  let results: React.ReactNode;
  if (state.expl === 'inspire') {
    results = ex.posts.length ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 14 }}>
        {ex.posts.map((x) => <GlowzPostCard key={x.id} post={x} width={cardW} />)}
      </View>
    ) : (
      <GlowzEmptyState title="No looks match" subtitle="Try a different style or category." />
    );
  } else if (!ex.providers.length) {
    results = (
      <GlowzEmptyState title="Nothing matches yet" subtitle="Loosen a filter or try another service." action={<GlowzButton small variant="soft" label="Clear filters" onPress={ex.clearAll} />} />
    );
  } else if (state.expl === 'map' && sel) {
    results = (
      <>
        <GlowzMapView providers={ex.providers} selectedId={sel.id} onSelect={ex.setMapSel} />
        <View style={{ marginTop: 12 }}><GlowzProviderRow provider={sel} /></View>
      </>
    );
  } else {
    results = <View style={{ gap: 14 }}>{ex.providers.map((p) => <GlowzProviderRow key={p.id} provider={p} />)}</View>;
  }

  return (
    <GlowzScreen header={header} bottom="root">
      <View style={{ marginTop: 6 }}>
        <GlowzHorizontalRail gap={12}>
          <GlowzChip label="All" selected={!state.cat} onPress={() => ex.setCategory(null)} />
          {CATEGORIES.filter((x) => x.on).map((x) => <GlowzChip key={x.id} label={x.name} selected={state.cat === x.id} onPress={() => ex.setCategory(x.id)} />)}
        </GlowzHorizontalRail>
      </View>
      {ex.chips.length ? (
        <View style={{ marginTop: 6 }}>
          <GlowzHorizontalRail gap={12}>
            {ex.chips.map((chip) => (
              <GlowzChip key={chip.key} tinted label={chip.label} accessibilityLabel={`Remove filter ${chip.label}`} onPress={() => ex.removeChip(chip.key)} right={<GlowzIcon name="close" size={12} color={c.tintInk} />} />
            ))}
            <GlowzChip label="Clear all" onPress={ex.clearAll} />
          </GlowzHorizontalRail>
        </View>
      ) : null}
      <View style={{ marginTop: 8, paddingLeft: g.left, paddingRight: g.right }}>
        {state.expl !== 'inspire' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <GlowzText kind="small" muted accessibilityLiveRegion="polite">{ex.providers.length} professionals</GlowzText>
            <Pressable onPress={() => openSheet({ kind: 'sort' })} accessibilityRole="button" accessibilityLabel={`Sort by ${sortLabel}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <GlowzText kind="small">Sort</GlowzText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 }}>
                <GlowzText kind="small">{sortLabel}</GlowzText>
                <GlowzText kind="small" muted>▾</GlowzText>
              </View>
            </Pressable>
          </View>
        ) : <View style={{ height: 12 }} />}
        {results}
      </View>
    </GlowzScreen>
  );
}