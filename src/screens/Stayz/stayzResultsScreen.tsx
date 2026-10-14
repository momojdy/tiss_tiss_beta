import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzChip } from './stayzChip';
import { StayzPropertyCard } from './stayzPropertyCard';
import { StayzScreen } from './stayzScreen';
import { StayzSheet } from './stayzSheet';
import { StayzSearchPanel } from './stayzSearchPanel';
import { StayzErrorView, StayzListSkeleton, StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { StayzResultsMap } from './stayzResultsMap';
import { useStayzAsync } from './stayzUseAsync';
import { fmtDate, fmtTime, addDays } from './stayzDates';
import { applyFilters, defaultFilters, filterCount, sortListings } from './stayzListings';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';
import { SortKey } from './stayzTypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'distance', label: 'Distance' },
];

export const StayzResultsScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { search, filters, setFilters } = useStayzSearch();
  const [map, setMap] = useState(false);
  const [searchPopup, setSearchPopup] = useState(false);
  const range = search.mode === 'overnight' || search.mode === 'extended';

  const { data, loading, error, reload } = useStayzAsync(
    () => api.searchListings({ mode: search.mode, start: search.date, end: range ? search.endDate : addDays(search.date, 1) }),
    [api, search.mode, search.date, search.endDate],
  );

  const list = useMemo(() => sortListings(applyFilters(data ?? [], filters, search), filters, search), [data, filters, search]);
  const count = filterCount(filters);

  const summary = `${search.place?.current ? 'Current location' : search.place?.label ?? 'Anywhere'} · ${range ? `${fmtDate(search.date)} → ${fmtDate(search.endDate)}` : fmtDate(search.date)}${search.mode === 'hourly' ? ` · ${fmtTime(search.time)} · ${search.hours}h` : ''}`;

  return (
    <StayzScreen
      title="Results"
      scroll={false}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel={map ? 'Show list' : 'Show map'} onPress={() => setMap(m => !m)} style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Ionicons name={map ? 'list' : 'map-outline'} size={20} color={colors.text} />
        </Pressable>
      }>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit location, dates, stay type and guests"
          hitSlop={8}
          onPress={() => setSearchPopup(true)}
          style={[styles.summaryPressable, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Ionicons name="location-outline" size={17} color={colors.teal} />
          <View style={styles.summaryText}>
            <StayzTxt v="small" sub numberOfLines={2}>
              {summary}
            </StayzTxt>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.sub} />
        </Pressable>
        <StayzSheet visible={searchPopup} title="Plan your stay" onClose={() => setSearchPopup(false)}>
          <StayzSearchPanel onSubmit={() => setSearchPopup(false)} />
        </StayzSheet>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <StayzChip label={count ? `Filters · ${count}` : 'Filters'} icon="options-outline" on={count > 0} onPress={() => nav.navigate('Filters')} />
          <StayzChip label="Free cancellation" on={filters.freeCancel} onPress={() => setFilters({ ...filters, freeCancel: !filters.freeCancel })} />
          {SORTS.map(s => (
            <StayzChip key={s.key} label={s.label} on={filters.sort === s.key} onPress={() => setFilters({ ...filters, sort: s.key })} />
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <StayzListSkeleton />
        </ScrollView>
      ) : error ? (
        <StayzErrorView message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <StayzStateView icon="search-outline" title="No stays match" body="Change your dates or clear some filters." action={count ? 'Clear filters' : 'Change search'} onAction={() => (count ? setFilters(defaultFilters()) : nav.goBack())} />
      ) : map ? (
        <StayzResultsMap listings={list} onOpen={id => nav.navigate('Property', { id })} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <StayzTxt v="small" sub>
            {list.length} stay{list.length > 1 ? 's' : ''} found
          </StayzTxt>
          {list.map(l => (
            <StayzPropertyCard key={l.id} listing={l} search={search} onPress={() => nav.navigate('Property', { id: l.id })} />
          ))}
        </ScrollView>
      )}
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  bar: { gap: 8, paddingBottom: 8 },
  summaryPressable: { minHeight: 44, marginTop: 3, marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { flex: 1, minWidth: 0 },
  chips: { paddingHorizontal: 16, gap: 8 },
  list: { padding: 16, gap: 24, paddingBottom: 120 },
  toggle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
