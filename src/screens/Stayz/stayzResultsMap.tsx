import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { startingPrice } from './stayzPricing';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';
import { Listing } from './stayzTypes';
import { StayzPropertyCard } from './stayzPropertyCard';
import { StayzTxt } from './stayzTxt';

interface Props {
  listings: Listing[];
  onOpen: (id: string) => void;
}

const regionFor = (list: Listing[], place: { lat: number; lng: number } | null): Region => {
  const pts = list.map(l => ({ lat: l.lat, lng: l.lng }));
  if (place) pts.push(place);
  if (!pts.length) return { latitude: 18.9712, longitude: -72.2852, latitudeDelta: 3, longitudeDelta: 3 };
  const lats = pts.map(p => p.lat);
  const lngs = pts.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
  };
};

export const StayzResultsMap = ({ listings, onOpen }: Props) => {
  const { colors } = useStayzTheme();
  const { money } = useStayzSettings();
  const { search } = useStayzSearch();
  const ref = useRef<MapView>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const region = useMemo(() => regionFor(listings, search.place), [listings, search.place]);
  const current = listings.find(l => l.id === selected) ?? null;

  useEffect(() => {
    ref.current?.animateToRegion(region, 250);
  }, [region]);

  return (
    <View style={styles.fill}>
      <MapView ref={ref} style={styles.fill} initialRegion={region} showsUserLocation showsMyLocationButton onPress={() => setSelected(null)}>
        {listings.map(l => {
          const sp = startingPrice(l, search.mode, search.hours, search.windowIndex);
          const on = l.id === selected;
          return (
            <Marker key={l.id} coordinate={{ latitude: l.lat, longitude: l.lng }} onPress={() => setSelected(l.id)}>
              <View style={[styles.pin, { backgroundColor: on ? colors.brand : colors.card, borderColor: colors.brand }]}> 
                <StayzTxt v="small" bold color={on ? colors.onBrand : colors.text}>
                  {money(sp.amount)}
                </StayzTxt>
              </View>
            </Marker>
          );
        })}
      </MapView>
      {current ? (
        <Pressable style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.line }]} onPress={() => onOpen(current.id)}>
          <StayzPropertyCard listing={current} search={search} onPress={() => onOpen(current.id)} compact />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pin: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5 },
  sheet: { position: 'absolute', left: 16, right: 16, bottom: 16, padding: 12, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
});
