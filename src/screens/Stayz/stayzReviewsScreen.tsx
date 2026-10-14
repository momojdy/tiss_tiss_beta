import React from 'react';
import { View } from 'react-native';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzListSkeleton, StayzStateView } from './stayzStates';
import { StayzStars } from './stayzStars';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { fmtDate } from './stayzDates';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';

export const StayzReviewsScreen = ({ route }: RootProps<'Reviews'>) => {
  const api = useStayzApi();
  const { id } = route.params;
  const listing = useStayzAsync(() => api.getListing(id), [api, id]);
  const reviews = useStayzAsync(() => api.getReviews(id), [api, id]);
  return (
    <StayzScreen title="Reviews">
      {listing.data && listing.data.reviewCount > 0 ? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <StayzTxt v="hero">{listing.data.rating.toFixed(1)}</StayzTxt>
          <StayzStars value={listing.data.rating} size={20} />
          <StayzTxt sub>{listing.data.reviewCount} reviews from guests who completed a stay</StayzTxt>
        </View>
      ) : null}
      {reviews.loading ? (
        <StayzListSkeleton count={2} />
      ) : reviews.error ? (
        <StayzErrorView message={reviews.error} onRetry={reviews.reload} />
      ) : (reviews.data ?? []).length === 0 ? (
        <StayzStateView icon="chatbubble-outline" title="No reviews yet" body="Only guests who complete a stay can leave a review." />
      ) : (
        (reviews.data ?? []).map(r => (
          <StayzCard key={r.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <StayzTxt v="h3">{r.author}</StayzTxt>
              <StayzTxt v="small" sub>
                {fmtDate(r.createdAt.slice(0, 10))}
              </StayzTxt>
            </View>
            <StayzStars value={r.rating} size={14} />
            {r.text ? <StayzTxt>{r.text}</StayzTxt> : null}
          </StayzCard>
        ))
      )}
    </StayzScreen>
  );
};
