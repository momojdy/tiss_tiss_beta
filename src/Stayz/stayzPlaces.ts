import { Place } from './stayzTypes';

export const DESTINATIONS: Place[] = [
  { label: 'Port-au-Prince', sub: 'Ouest, Haiti', lat: 18.5944, lng: -72.3074 },
  { label: 'Pétion-Ville', sub: 'Ouest, Haiti', lat: 18.5125, lng: -72.2853 },
  { label: 'Jacmel', sub: 'Sud-Est, Haiti', lat: 18.2342, lng: -72.5347 },
  { label: 'Cap-Haïtien', sub: 'Nord, Haiti', lat: 19.7578, lng: -72.2043 },
  { label: 'Montrouis', sub: 'Artibonite, Haiti', lat: 18.9167, lng: -72.6833 },
  { label: 'Kenscoff', sub: 'Ouest, Haiti', lat: 18.4506, lng: -72.2842 },
  { label: 'Milot', sub: 'Nord, Haiti', lat: 19.6103, lng: -72.2146 },
  { label: 'Les Cayes', sub: 'Sud, Haiti', lat: 18.2, lng: -73.75 },
];

export const THEMES: { key: string; title: string; sub: string; icon: 'sunny-outline' | 'business-outline' | 'trail-sign-outline' | 'color-palette-outline'; place: Place }[] = [
  { key: 'beaches', title: 'Caribbean beaches', sub: 'Sand, sea and resorts', icon: 'sunny-outline', place: DESTINATIONS[4] },
  { key: 'towns', title: 'Historic towns', sub: 'Colonial streets and forts', icon: 'business-outline', place: DESTINATIONS[3] },
  { key: 'mountains', title: 'Mountain escapes', sub: 'Cool air and trails', icon: 'trail-sign-outline', place: DESTINATIONS[5] },
  { key: 'culture', title: 'Local culture', sub: 'Art, music and markets', icon: 'color-palette-outline', place: DESTINATIONS[2] },
];
