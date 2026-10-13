import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PhotoSlot } from '../components/PhotoSlot';
import { Screen } from '../components/Screen';
import { ErrorView, StateView } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { RootProps } from '../navigation/types';
import { useApi } from '../store/ApiContext';

export const PhotosScreen = ({ route }: RootProps<'Photos'>) => {
  const api = useApi();
  const { data, error, reload } = useAsync(() => api.getListing(route.params.id), [api, route.params.id]);
  return (
    <Screen title={data ? `${data.photos.length} photos` : 'Photos'}>
      {error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : data && data.photos.length === 0 ? (
        <StateView icon="images-outline" title="No photos yet" body="The property has not added photos." />
      ) : (
        <View style={styles.grid}>
          {(data?.photos ?? []).map((u, i) => (
            <PhotoSlot key={`${u}${i}`} uri={u} style={i % 3 === 0 ? styles.wide : styles.half} />
          ))}
        </View>
      )}
      {data && data.photoCats.length > 0 ? (
        <Txt v="small" sub>
          {data.photoCats.map(c => `${c.cat} (${c.count})`).join(' · ')}
        </Txt>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wide: { width: '100%', height: 220, borderRadius: 16 },
  half: { width: '48.5%', height: 150, borderRadius: 16 },
});
