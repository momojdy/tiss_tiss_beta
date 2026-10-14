import React, { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzPropertyCard } from './stayzPropertyCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzListSkeleton, StayzStateView } from './stayzStates';
import { useStayzAsync } from './stayzUseAsync';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSaved } from './stayzSavedContext';
import { useStayzSearch } from './stayzSearchContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzSavedScreen = () => {
  const nav = useNavigation<Nav>();
  const api = useStayzApi();
  const saved = useStayzSaved();
  const { search } = useStayzSearch();
  const key = saved.ids.join(',');
  const { data, loading, error, reload } = useStayzAsync(() => api.getListings(saved.ids), [api, key]);

  useFocusEffect(
    useCallback(() => {
      saved.reload();
    }, []),
  );

  return (
    <StayzScreen title="Saved">
      {loading && !data ? (
        <StayzListSkeleton count={2} />
      ) : error ? (
        <StayzErrorView message={error} onRetry={reload} />
      ) : saved.ids.length === 0 ? (
        <StayzStateView icon="heart-outline" title="Nothing saved yet" body="Tap the heart on a stay to keep it here." action="Find a stay" onAction={() => nav.navigate('Tabs', { screen: 'Home' })} />
      ) : (
        (data ?? []).filter(l => saved.ids.includes(l.id)).map(l => <StayzPropertyCard key={l.id} listing={l} search={search} onPress={() => nav.navigate('Property', { id: l.id })} />)
      )}
    </StayzScreen>
  );
};
