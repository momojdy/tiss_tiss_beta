import { useCallback, useMemo } from 'react';
import type { ExploreView, Filters, SortKey } from '../types/state';
import { DEFAULT_FILTERS, activeFilterCount, filterPosts, filterProviders } from '../utils/filtering';
import { useGlowzStore } from './GlowzStore';
import { useGlowzSheet } from './GlowzSheetContext';

export type FilterChipKey = keyof Filters | 'q';

const PRICE_LABEL: Record<Filters['price'], string> = { any: '', lt1000: 'Under ₱1,000', '1to3': '₱1,000 to ₱3,000', gt3: 'Over ₱3,000' };

/** Search, filters, sort and view mode for Explore, plus the results they produce. */
export function useExplore() {
  const { state, update } = useGlowzStore();
  const { closeSheet } = useGlowzSheet();

  const providers = useMemo(
    () => filterProviders(state.q, state.cat, state.f, state.sort, state.bookings),
    [state.q, state.cat, state.f, state.sort, state.bookings],
  );
  const posts = useMemo(() => filterPosts(state.q, state.cat), [state.q, state.cat]);

  const setQuery = useCallback((q: string) => update((s) => ({ ...s, q })), [update]);
  const setView = useCallback((expl: ExploreView) => update((s) => ({ ...s, expl })), [update]);
  const setSort = useCallback((sort: SortKey) => update((s) => ({ ...s, sort })), [update]);
  const setMapSel = useCallback((id: string) => update((s) => ({ ...s, mapSel: id })), [update]);
  const setCategory = useCallback((cat: string | null) => update((s) => ({ ...s, cat })), [update]);
  const setFilter = useCallback(<K extends keyof Filters>(k: K, v: Filters[K]) => update((s) => ({ ...s, f: { ...s.f, [k]: v } })), [update]);
  const toggleFilter = useCallback((k: 'verified' | 'promo' | 'today') => update((s) => ({ ...s, f: { ...s.f, [k]: !s.f[k] } })), [update]);

  /** Reset filters, search and category, and close any sheet. */
  const clearAll = useCallback(() => {
    update((s) => ({ ...s, f: { ...DEFAULT_FILTERS }, q: '', cat: null }));
    closeSheet();
  }, [closeSheet, update]);

  const removeChip = useCallback(
    (k: FilterChipKey) =>
      update((s) => {
        if (k === 'q') return { ...s, q: '' };
        const f = { ...s.f };
        if (k === 'price') f.price = 'any';
        else if (k === 'rating') f.rating = 0;
        else if (k === 'loc') f.loc = 'any';
        else f[k] = false;
        return { ...s, f };
      }),
    [update],
  );

  const chips = useMemo(() => {
    const f = state.f;
    const out: { key: FilterChipKey; label: string }[] = [];
    if (f.price !== 'any') out.push({ key: 'price', label: PRICE_LABEL[f.price] });
    if (f.rating > 0) out.push({ key: 'rating', label: `${f.rating} and up` });
    if (f.verified) out.push({ key: 'verified', label: 'Verified' });
    if (f.loc !== 'any') out.push({ key: 'loc', label: f.loc === 'home' ? 'At home' : 'In salon' });
    if (f.promo) out.push({ key: 'promo', label: 'Has an offer' });
    if (f.today) out.push({ key: 'today', label: 'Open today' });
    if (state.q.trim()) out.push({ key: 'q', label: `"${state.q.trim().slice(0, 18)}"` });
    return out;
  }, [state.f, state.q]);

  return {
    state, providers, posts, chips, activeCount: activeFilterCount(state.f),
    setQuery, setView, setSort, setMapSel, setCategory, setFilter, toggleFilter, clearAll, removeChip,
  };
}