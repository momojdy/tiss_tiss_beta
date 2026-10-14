import * as Location from 'expo-location';
import { Place } from './stayzTypes';

export type LocationResult = { status: 'granted'; place: Place } | { status: 'denied' } | { status: 'unavailable' };

export const getCurrentPlace = async (): Promise<LocationResult> => {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return { status: 'denied' };

    // Prefer a fresh GPS fix, but fall back to the device's last known fix if GPS is slow/unavailable.
    let position: Location.LocationObject | null = null;
    try {
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    } catch {
      position = await Location.getLastKnownPositionAsync();
    }
    if (!position?.coords || !Number.isFinite(position.coords.latitude) || !Number.isFinite(position.coords.longitude)) {
      return { status: 'unavailable' };
    }

    const { latitude, longitude } = position.coords;
    let label = 'Current location';
    let sub: string | undefined;
    try {
      const [geocoded] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded) {
        const area = geocoded.city || geocoded.subregion || geocoded.district || geocoded.region || geocoded.name;
        const country = geocoded.country;
        const placeName = [area, country].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(', ');
        if (placeName) sub = placeName;
      }
    } catch {
      // GPS coordinates are still useful even when reverse geocoding is unavailable.
    }
    return { status: 'granted', place: { label, sub, lat: latitude, lng: longitude, current: true } };
  } catch {
    return { status: 'unavailable' };
  }
};

export const geocodePlace = async (query: string): Promise<Place[]> => {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 3) return [];

  // Photon provides live place suggestions while the user types, without requiring an API key.
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=5`,
      { headers: { Accept: 'application/json' } },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] };
          properties?: { name?: string; city?: string; district?: string; state?: string; country?: string; postcode?: string };
        }>;
      };
      const suggestions = (data.features ?? []).flatMap(feature => {
        const coordinates = feature.geometry?.coordinates;
        const properties = feature.properties;
        if (!coordinates || !properties || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return [];
        const label = properties.name || properties.city || properties.district || cleanQuery;
        const sub = [properties.city && properties.city !== label ? properties.city : undefined, properties.state, properties.country]
          .filter(Boolean)
          .filter((value, index, all) => all.indexOf(value) === index)
          .join(', ');
        return [{ label, sub: sub || properties.country, lat: coordinates[1], lng: coordinates[0] }];
      });
      if (suggestions.length) return suggestions;
    }
  } catch {
    // Fall through to the device geocoder if the online suggestion service is unavailable.
  }

  try {
    const results = await Location.geocodeAsync(cleanQuery);
    const out: Place[] = [];
    for (const result of results.slice(0, 5)) {
      let sub: string | undefined;
      try {
        const [g] = await Location.reverseGeocodeAsync({ latitude: result.latitude, longitude: result.longitude });
        sub = g ? [g.city || g.subregion || g.region, g.country].filter(Boolean).join(', ') : undefined;
      } catch {
        sub = undefined;
      }
      out.push({ label: cleanQuery, sub, lat: result.latitude, lng: result.longitude });
    }
    return out;
  } catch {
    return [];
  }
};
