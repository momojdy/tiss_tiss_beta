import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESTINATIONS } from '../../data/places';
import { geocodePlace } from '../../services/location';
import { useSearch } from '../../store/SearchContext';
import { useTheme } from '../../theme/ThemeContext';
import { Place } from '../../types';
import { Button } from '../Button';
import { Row } from '../Row';
import { Sheet } from '../Sheet';
import { TextField } from '../TextField';
import { Txt } from '../Txt';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const WhereSheet = ({ visible, onClose }: Props) => {
  const { colors } = useTheme();
  const { setSearch, locate, locationStatus, search } = useSearch();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 3) {
      setFound([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      setFound(await geocodePlace(q.trim()));
      setBusy(false);
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (p: Place) => {
    setSearch({ place: p });
    setQ('');
    onClose();
  };

  const filtered = DESTINATIONS.filter(d => d.label.toLowerCase().includes(q.trim().toLowerCase()));

  const useHere = async () => {
    const ok = await locate();
    if (ok) onClose();
  };

  return (
    <Sheet visible={visible} title="Where to?" onClose={onClose}>
      <TextField value={q} onChangeText={setQ} placeholder="Search a city or area" autoCorrect={false} returnKeyType="search" />
      <Row icon="locate" label="Current location" sub={search.place?.current ? search.place.sub ?? 'Using your location' : 'Use where I am now'} onPress={useHere} right={locationStatus === 'locating' ? <ActivityIndicator color={colors.brand} /> : undefined} />
      {locationStatus === 'denied' ? (
        <View style={{ gap: 8 }}>
          <Txt v="small" sub>
            Location access is off. Turn it on in Settings to search near you.
          </Txt>
          <Button title="Open Settings" kind="secondary" small onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
      {locationStatus === 'unavailable' ? (
        <Txt v="small" sub>
          Your location could not be read. Choose a place below.
        </Txt>
      ) : null}
      {busy ? <ActivityIndicator color={colors.brand} /> : null}
      {found.map((p, i) => (
        <Row key={`g${i}`} icon="location-outline" label={p.label} sub={p.sub} onPress={() => pick(p)} />
      ))}
      {filtered.map(p => (
        <Row key={p.label} icon="navigate-outline" label={p.label} sub={p.sub} onPress={() => pick(p)} right={search.place?.label === p.label ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : undefined} />
      ))}
      {!busy && !filtered.length && !found.length && q.trim().length >= 3 ? <Txt sub>No places found.</Txt> : null}
    </Sheet>
  );
};
