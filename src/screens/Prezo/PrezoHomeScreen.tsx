import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoExplore } from '../../features/prezo/PrezoExploreContext';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { CampaignSkeletonGrid } from '../../components/prezo/campaign/CampaignGrid';
import { CampaignStrip } from '../../components/prezo/campaign/CampaignStrip';
import { HeroBanner } from '../../components/prezo/campaign/HeroBanner';
import { FilterPill } from '../../components/prezo/shared/Selectors';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';
import { getPopularityScore } from '../../lib/prezo/campaignRules';
import { defaultExploreFilters } from '../../lib/prezo/campaignFilters';

export const PrezoHomeScreen = () => {
  const data = usePrezoData();
  const navigation = usePrezoNavigation();
  const explore = usePrezoExplore();
  const campaigns = data.campaigns.data;

  const sections = useMemo(() => {
    const live = campaigns.filter((campaign) => campaign.status === 'live');
    return {
      categories: [...new Set(campaigns.map((campaign) => campaign.category))],
      featured: campaigns.filter((campaign) => campaign.featured),
      endingSoon: [...live]
        .filter((campaign) => campaign.closesAt !== null)
        .sort((a, b) => (a.closesAt ?? 0) - (b.closesAt ?? 0)),
      popular: [...live].sort((a, b) => getPopularityScore(b) - getPopularityScore(a)),
      trending: campaigns
        .filter((campaign) => campaign.waitlistEnabled || campaign.status === 'live')
        .slice(0, 3),
      recent: [...campaigns].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3),
    };
  }, [campaigns]);

  const openSearch = () => {
    explore.setFilters(defaultExploreFilters);
    navigation.navigate({ name: 'explore', category: null });
  };

  return (
    <ScreenScaffold>
      <HeroBanner onSearch={openSearch} />
      {data.campaigns.status === 'loading' ? (
        <CampaignSkeletonGrid />
      ) : data.campaigns.status === 'error' ? (
        <LoadFailureState
          title="Couldn’t load campaigns"
          message={data.campaigns.message}
          onRetry={() => data.reload(['campaigns', 'sellers'])}
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categories}
            contentContainerStyle={styles.categoriesContent}
          >
            {sections.categories.map((category) => (
              <FilterPill
                key={category}
                label={category}
                onPress={() => navigation.navigate({ name: 'explore', category })}
              />
            ))}
          </ScrollView>
          <CampaignStrip title="Featured" campaigns={sections.featured} />
          <CampaignStrip title="Ending soon" campaigns={sections.endingSoon} />
          <CampaignStrip title="Popular" campaigns={sections.popular} />
          <CampaignStrip title="Trending" campaigns={sections.trending} />
          <CampaignStrip title="Recently added" campaigns={sections.recent} />
        </>
      )}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  categories: {
    marginVertical: 12,
    flexGrow: 0,
  },
  categoriesContent: {
    gap: 8,
  },
});

