import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESTINATIONS } from './stayzPlaces';
import { geocodePlace } from './stayzLocation';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';
import { Place } from './stayzTypes';
import { StayzRow } from './stayzRow';
import { StayzSheet } from './stayzSheet';
import { StayzTextField } from './stayzTextField';
import { StayzTxt } from './stayzTxt';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const StayzWhereSheet = ({ visible, onClose }: Props) => {
  const { colors } = useStayzTheme();
  const { setSearch, locate, locationStatus, search } = useStayzSearch();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (q.trim().length < 3) {
      setFound([]);
      setBusy(false);
      return () => { active = false; };
    }
    setBusy(true);
    const t = setTimeout(async () => {
      const results = await geocodePlace(q.trim());
      if (active) {
        setFound(results);
        setBusy(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
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
    <StayzSheet visible={visible} title="Where to?" onClose={onClose}>
      <StayzTextField value={q} onChangeText={setQ} placeholder="Search a city or area" autoCorrect={false} returnKeyType="search" />
      <StayzRow icon="locate" label="Current location" sub={search.place?.current ? search.place.sub ?? 'Using your location' : 'Use where I am now'} onPress={useHere} right={locationStatus === 'locating' ? <ActivityIndicator color={colors.brand} /> : undefined} />
      {busy ? <ActivityIndicator color={colors.brand} /> : null}
      {found.map((p, i) => (
        <StayzRow key={`g${i}`} icon="location-outline" label={p.label} sub={p.sub} onPress={() => pick(p)} />
      ))}
      {filtered.map(p => (
        <StayzRow key={p.label} icon="navigate-outline" label={p.label} sub={p.sub} onPress={() => pick(p)} right={search.place?.label === p.label ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : undefined} />
      ))}
      {!busy && !filtered.length && !found.length && q.trim().length >= 3 ? <StayzTxt sub>No places found.</StayzTxt> : null}
    </StayzSheet>
  );
};
