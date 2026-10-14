import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StayzPhotoSlot } from './stayzPhotoSlot';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';

export const StayzPhotosScreen = ({ route }: RootProps<'Photos'>) => {
  const api = useStayzApi();
  const { data, error, reload } = useStayzAsync(() => api.getListing(route.params.id), [api, route.params.id]);
  return (
    <StayzScreen title={data ? `${data.photos.length} photos` : 'Photos'}>
      {error ? (
        <StayzErrorView message={error} onRetry={reload} />
      ) : data && data.photos.length === 0 ? (
        <StayzStateView icon="images-outline" title="No photos yet" body="The property has not added photos." />
      ) : (
        <View style={styles.grid}>
          {(data?.photos ?? []).map((u, i) => (
            <StayzPhotoSlot key={`${u}${i}`} uri={u} style={i % 3 === 0 ? styles.wide : styles.half} />
          ))}
        </View>
      )}
      {data && data.photoCats.length > 0 ? (
        <StayzTxt v="small" sub>
          {data.photoCats.map(c => `${c.cat} (${c.count})`).join(' · ')}
        </StayzTxt>
      ) : null}
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wide: { width: '100%', height: 220, borderRadius: 16 },
  half: { width: '48.5%', height: 150, borderRadius: 16 },
});
