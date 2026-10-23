import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoExplore } from '../../features/prezo/PrezoExploreContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { CampaignGrid, CampaignSkeletonGrid } from '../../components/prezo/campaign/CampaignGrid';
import { FiltersSheet } from '../../components/prezo/campaign/FiltersSheet';
import { Button } from '../../components/prezo/shared/Button';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { FilterPill } from '../../components/prezo/shared/Selectors';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';
import { TextField } from '../../components/prezo/shared/TextField';
import {
  defaultExploreFilters,
  filterCampaigns,
  getPriceBounds,
  quickFilterOptions,
} from '../../lib/prezo/campaignFilters';

interface PrezoExploreScreenProps {
  category: string | null;
}

export const PrezoExploreScreen = ({ category }: PrezoExploreScreenProps) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const { filters, setFilters } = usePrezoExplore();
  const [text, setText] = useState(filters.query);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setFilters((prev) => (prev.category === category ? prev : { ...prev, category }));
  }, [category, setFilters]);

  useEffect(() => {
    setText(filters.query);
  }, [filters.query]);

  const campaigns = data.campaigns.data;
  const results = useMemo(
    () =>
      filterCampaigns(campaigns, filters, fmt.now, (sellerId) => data.getSeller(sellerId)?.name ?? ''),
    [campaigns, filters, fmt.now, data],
  );
  const priceBounds = useMemo(() => getPriceBounds(campaigns), [campaigns]);
  const topCategories = useMemo(
    () => [...new Set(campaigns.map((campaign) => campaign.category))].slice(0, 3),
    [campaigns],
  );

  const submit = () => {
    setFilters((prev) => ({ ...prev, query: text }));
    data.rememberSearch(text);
  };

  const clearQuery = () => {
    setText('');
    setFilters((prev) => ({ ...prev, query: '' }));
  };

  const reset = () => setFilters({ ...defaultExploreFilters, category: null });

  const showRecent = !filters.query && !filters.category && filters.status === 'all';
  const recent = data.preferences.data.recentSearches;

  return (
    <ScreenScaffold>
      <PageTitle>{filters.category ?? 'Explore'}</PageTitle>
      <PzText size={13} tone="mu">
        {filters.category ? `Campaigns in ${filters.category}.` : 'Live campaigns come first.'}
      </PzText>
      <View style={styles.searchRow}>
        <TextField
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Search campaigns, sellers, categories"
          accessibilityLabel="Search campaigns"
          style={styles.searchInput}
        />
        {filters.query ? <FilterPill label="Clear" onPress={clearQuery} /> : null}
        <FilterPill label="Filters" selected onPress={() => setFiltersOpen(true)} />
      </View>
      {data.campaigns.status === 'loading' ? (
        <CampaignSkeletonGrid />
      ) : data.campaigns.status === 'error' ? (
        <LoadFailureState
          title="Search failed"
          message={data.campaigns.message}
          onRetry={() => data.reload(['campaigns', 'sellers'])}
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickRow}
            contentContainerStyle={styles.quickContent}
          >
            {quickFilterOptions.map((option) => (
              <FilterPill
                key={option.key}
                label={option.label}
                selected={filters.quick === option.key}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    quick: prev.quick === option.key ? '' : option.key,
                  }))
                }
              />
            ))}
            <PzText size={13} tone="mu" style={styles.count}>
              {results.length} campaign{results.length === 1 ? '' : 's'}
            </PzText>
          </ScrollView>
          {showRecent && (recent.length || topCategories.length) ? (
            <View>
              <PzText size={13} tone="mu" style={{ marginBottom: 8 }}>
                Recent
              </PzText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickRow}
                contentContainerStyle={styles.quickContent}
              >
                {recent.map((term) => (
                  <FilterPill
                    key={`recent-${term}`}
                    label={term}
                    onPress={() => {
                      setText(term);
                      setFilters((prev) => ({ ...prev, query: term }));
                    }}
                  />
                ))}
                {topCategories.map((name) => (
                  <FilterPill
                    key={`category-${name}`}
                    label={name}
                    onPress={() => navigation.navigate({ name: 'explore', category: name })}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
          <CampaignGrid
            campaigns={results}
            empty={
              <EmptyState
                title="No campaigns match"
                message={
                  campaigns.length
                    ? 'Try fewer filters or a different search.'
                    : 'There are no campaigns to show yet.'
                }
              >
                {campaigns.length ? (
                  <Button
                    label="Reset filters"
                    variant="ghost"
                    onPress={() => {
                      setText('');
                      reset();
                    }}
                  />
                ) : null}
              </EmptyState>
            }
          />
        </>
      )}
      <FiltersSheet
        visible={filtersOpen}
        filters={filters}
        priceBounds={priceBounds}
        onApply={(next) => setFilters({ ...next, category: filters.category })}
        onClose={() => setFiltersOpen(false)}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    width: undefined,
  },
  quickRow: {
    marginBottom: 12,
    flexGrow: 0,
  },
  quickContent: {
    gap: 8,
    alignItems: 'center',
  },
  count: {
    paddingLeft: 6,
  },
});

