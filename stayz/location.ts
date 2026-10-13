import * as Location from 'expo-location';
import { Place } from '../types';

export type LocationResult = { status: 'granted'; place: Place } | { status: 'denied' } | { status: 'unavailable' };

export const getCurrentPlace = async (): Promise<LocationResult> => {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { status: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = pos.coords;
    let label = 'Current location';
    let sub: string | undefined;
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (g) {
        const city = g.city || g.subregion || g.district || g.region;
        if (city) sub = [city, g.country].filter(Boolean).join(', ');
      }
    } catch {
      sub = undefined;
    }
    return { status: 'granted', place: { label, sub, lat: latitude, lng: longitude, current: true } };
  } catch {
    return { status: 'unavailable' };
  }
};

export const geocodePlace = async (query: string): Promise<Place[]> => {
  try {
    const res = await Location.geocodeAsync(query);
    const out: Place[] = [];
    for (const r of res.slice(0, 4)) {
      let sub: string | undefined;
      try {
        const [g] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        sub = g ? [g.city || g.subregion || g.region, g.country].filter(Boolean).join(', ') : undefined;
      } catch {
        sub = undefined;
      }
      out.push({ label: query, sub, lat: r.latitude, lng: r.longitude });
    }
    return out;
  } catch {
    return [];
  }
};
