import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chip } from '../components/Chip';
import { PropertyCard } from '../components/PropertyCard';
import { Screen } from '../components/Screen';
import { ErrorView, ListSkeleton, StateView } from '../components/States';
import { Txt } from '../components/Txt';
import { ResultsMap } from '../components/ResultsMap';
import { useAsync } from '../hooks/useAsync';
import { fmtDate, fmtTime, addDays } from '../lib/dates';
import { applyFilters, defaultFilters, filterCount, sortListings } from '../lib/listings';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useSearch } from '../store/SearchContext';
import { useTheme } from '../theme/ThemeContext';
import { SortKey } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'distance', label: 'Distance' },
];

export const ResultsScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { search, filters, setFilters } = useSearch();
  const [map, setMap] = useState(false);
  const range = search.mode === 'overnight' || search.mode === 'extended';

  const { data, loading, error, reload } = useAsync(
    () => api.searchListings({ mode: search.mode, start: search.date, end: range ? search.endDate : addDays(search.date, 1) }),
    [api, search.mode, search.date, search.endDate],
  );

  const list = useMemo(() => sortListings(applyFilters(data ?? [], filters, search), filters, search), [data, filters, search]);
  const count = filterCount(filters);

  const summary = `${search.place?.current ? 'Current location' : search.place?.label ?? 'Anywhere'} · ${range ? `${fmtDate(search.date)} → ${fmtDate(search.endDate)}` : fmtDate(search.date)}${search.mode === 'hourly' ? ` · ${fmtTime(search.time)} · ${search.hours}h` : ''}`;

  return (
    <Screen
      title="Results"
      scroll={false}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel={map ? 'Show list' : 'Show map'} onPress={() => setMap(m => !m)} style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Ionicons name={map ? 'list' : 'map-outline'} size={20} color={colors.text} />
        </Pressable>
      }>
      <View style={styles.bar}>
        <Txt v="small" sub numberOfLines={1} style={{ paddingHorizontal: 16 }}>
          {summary}
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={count ? `Filters · ${count}` : 'Filters'} icon="options-outline" on={count > 0} onPress={() => nav.navigate('Filters')} />
          <Chip label="Free cancellation" on={filters.freeCancel} onPress={() => setFilters({ ...filters, freeCancel: !filters.freeCancel })} />
          {SORTS.map(s => (
            <Chip key={s.key} label={s.label} on={filters.sort === s.key} onPress={() => setFilters({ ...filters, sort: s.key })} />
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <ListSkeleton />
        </ScrollView>
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <StateView icon="search-outline" title="No stays match" body="Change your dates or clear some filters." action={count ? 'Clear filters' : 'Change search'} onAction={() => (count ? setFilters(defaultFilters()) : nav.goBack())} />
      ) : map ? (
        <ResultsMap listings={list} onOpen={id => nav.navigate('Property', { id })} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Txt v="small" sub>
            {list.length} stay{list.length > 1 ? 's' : ''} found
          </Txt>
          {list.map(l => (
            <PropertyCard key={l.id} listing={l} search={search} onPress={() => nav.navigate('Property', { id: l.id })} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  bar: { gap: 8, paddingBottom: 8 },
  chips: { paddingHorizontal: 16, gap: 8 },
  list: { padding: 16, gap: 24, paddingBottom: 40 },
  toggle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
