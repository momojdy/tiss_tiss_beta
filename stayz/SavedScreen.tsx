import React, { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PropertyCard } from '../components/PropertyCard';
import { Screen } from '../components/Screen';
import { ErrorView, ListSkeleton, StateView } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useSaved } from '../store/SavedContext';
import { useSearch } from '../store/SearchContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const SavedScreen = () => {
  const nav = useNavigation<Nav>();
  const api = useApi();
  const saved = useSaved();
  const { search } = useSearch();
  const key = saved.ids.join(',');
  const { data, loading, error, reload } = useAsync(() => api.getListings(saved.ids), [api, key]);

  useFocusEffect(
    useCallback(() => {
      saved.reload();
    }, []),
  );

  return (
    <Screen title="Saved" back={false}>
      {loading && !data ? (
        <ListSkeleton count={2} />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : saved.ids.length === 0 ? (
        <StateView icon="heart-outline" title="Nothing saved yet" body="Tap the heart on a stay to keep it here." action="Find a stay" onAction={() => nav.navigate('Tabs', { screen: 'Home' })} />
      ) : (
        (data ?? []).filter(l => saved.ids.includes(l.id)).map(l => <PropertyCard key={l.id} listing={l} search={search} onPress={() => nav.navigate('Property', { id: l.id })} />)
      )}
    </Screen>
  );
};
