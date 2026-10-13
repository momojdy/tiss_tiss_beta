import React from 'react';
import { View } from 'react-native';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ErrorView, ListSkeleton, StateView } from '../components/States';
import { Stars } from '../components/Stars';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { fmtDate } from '../lib/dates';
import { RootProps } from '../navigation/types';
import { useApi } from '../store/ApiContext';

export const ReviewsScreen = ({ route }: RootProps<'Reviews'>) => {
  const api = useApi();
  const { id } = route.params;
  const listing = useAsync(() => api.getListing(id), [api, id]);
  const reviews = useAsync(() => api.getReviews(id), [api, id]);
  return (
    <Screen title="Reviews">
      {listing.data && listing.data.reviewCount > 0 ? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Txt v="hero">{listing.data.rating.toFixed(1)}</Txt>
          <Stars value={listing.data.rating} size={20} />
          <Txt sub>{listing.data.reviewCount} reviews from guests who completed a stay</Txt>
        </View>
      ) : null}
      {reviews.loading ? (
        <ListSkeleton count={2} />
      ) : reviews.error ? (
        <ErrorView message={reviews.error} onRetry={reviews.reload} />
      ) : (reviews.data ?? []).length === 0 ? (
        <StateView icon="chatbubble-outline" title="No reviews yet" body="Only guests who complete a stay can leave a review." />
      ) : (
        (reviews.data ?? []).map(r => (
          <Card key={r.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt v="h3">{r.author}</Txt>
              <Txt v="small" sub>
                {fmtDate(r.createdAt.slice(0, 10))}
              </Txt>
            </View>
            <Stars value={r.rating} size={14} />
            {r.text ? <Txt>{r.text}</Txt> : null}
          </Card>
        ))
      )}
    </Screen>
  );
};
