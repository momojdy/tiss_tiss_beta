import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { MyPrezoTabs } from '../../components/prezo/orders/MyPrezoTabs';
import { WaitlistRow } from '../../components/prezo/orders/WaitlistRow';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { FilterPill } from '../../components/prezo/shared/Selectors';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';
import type { WaitlistStatus } from '../../types/prezo';

type WaitlistFilter = 'all' | Extract<WaitlistStatus, 'active' | 'offer' | 'expired' | 'cancelled'>;

const filters: { key: WaitlistFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'offer', label: 'Offers' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const PrezoWaitlistScreen = () => {
  const data = usePrezoData();
  const [filter, setFilter] = useState<WaitlistFilter>('all');
  const entries = data.waitlist.data.filter((entry) => filter === 'all' || entry.status === filter);

  return (
    <ScreenScaffold>
      <PageTitle>Waitlist</PageTitle>
      <MyPrezoTabs active="wl" />
      {data.waitlist.status === 'error' ? (
        <LoadFailureState
          title="Couldn’t load your waitlist"
          message={data.waitlist.message}
          onRetry={() => data.reload(['waitlist'])}
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            contentContainerStyle={styles.filtersContent}
          >
            {filters.map((option) => (
              <FilterPill
                key={option.key}
                label={option.label}
                selected={filter === option.key}
                onPress={() => setFilter(option.key)}
              />
            ))}
          </ScrollView>
          {entries.length ? (
            entries.map((entry) => <WaitlistRow key={entry.id} entry={entry} />)
          ) : (
            <EmptyState
              title="No waitlist entries"
              message="Join a waitlist from a sold-out or paused campaign."
            />
          )}
          <PzText size={13} tone="mu">
            A waitlist spot is not a reservation or a purchase, and no queue position is promised.
          </PzText>
        </>
      )}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  filters: { marginVertical: 12, flexGrow: 0 },
  filtersContent: { gap: 8 },
});

