import { Filters, Listing, Place, SearchState } from '../types';
import { distKm } from './distance';
import { startingPrice } from './pricing';

export const AMENITIES = ['WiFi', 'Air conditioning', 'Kitchen', 'Parking', 'Pool', 'Washer', 'TV', 'Workspace', 'Gym', 'Elevator', 'Balcony', 'Pet friendly', 'Security', 'Beach access', 'Breakfast available'];

export const PROPERTY_TYPES = ['Hotel', 'Resort', 'Apartment', 'Guesthouse', 'Villa'] as const;

export const HOURLY_OPTIONS = [1, 2, 3, 6, 8];

export const defaultFilters = (): Filters => ({ types: [], minPrice: 0, maxPrice: 1000, amenities: [], freeCancel: false, sort: 'recommended' });

export const isInspected = (l: Listing) => l.stays > 30;

export const distanceFrom = (l: Listing, place: Place | null) => (place ? distKm(place.lat, place.lng, l.lat, l.lng) : null);

export const applyFilters = (list: Listing[], f: Filters, s: SearchState) =>
  list.filter(l => {
    const p = startingPrice(l, s.mode, s.hours, s.windowIndex).amount;
    if (f.types.length && !f.types.includes(l.type)) return false;
    if (p < f.minPrice || p > f.maxPrice) return false;
    if (f.amenities.some(a => !l.amenities.includes(a))) return false;
    if (f.freeCancel && !l.cxAllowed) return false;
    return true;
  });

export const sortListings = (list: Listing[], f: Filters, s: SearchState) => {
  const out = [...list];
  if (f.sort === 'price') out.sort((a, b) => startingPrice(a, s.mode, s.hours, s.windowIndex).amount - startingPrice(b, s.mode, s.hours, s.windowIndex).amount);
  else if (f.sort === 'rating') out.sort((a, b) => b.rating - a.rating);
  else if (f.sort === 'distance') out.sort((a, b) => (distanceFrom(a, s.place) ?? 0) - (distanceFrom(b, s.place) ?? 0));
  else out.sort((a, b) => Number(isInspected(b)) - Number(isInspected(a)) || b.rating - a.rating);
  return out;
};

export const filterCount = (f: Filters) => f.types.length + f.amenities.length + (f.freeCancel ? 1 : 0) + (f.minPrice > 0 || f.maxPrice < 1000 ? 1 : 0);
