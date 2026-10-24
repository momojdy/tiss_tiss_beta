export type StayMode = 'hourly' | 'dayuse' | 'overnight' | 'extended';
export type CurrencyCode = 'USD' | 'HTG' | 'DOP';
export type CardBrand = 'Visa' | 'Mastercard' | 'Discover' | 'JCB' | 'UnionPay';
export type PropertyType = 'Hotel' | 'Resort' | 'Apartment' | 'Guesthouse' | 'Villa';
export type BookingStatus = 'Requested' | 'Accepted' | 'Upcoming' | 'Checked in' | 'Completed' | 'Cancelled' | 'No-show';
export type SortKey = 'recommended' | 'price' | 'rating' | 'distance';

export interface Place {
  label: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
  [key: string]: any;
}

export interface SearchState {
  mode: StayMode;
  place: Place | null;
  date: string;
  endDate: string;
  time: string;
  hours: number;
  windowIndex: number;
  adults: number;
  children: number;
  rooms: number;
  [key: string]: any;
}

export interface SearchQuery {
  mode: StayMode;
  start: string;
  end: string;
  [key: string]: any;
}

export interface Filters {
  types: string[];
  minPrice: number;
  maxPrice: number;
  amenities: string[];
  freeCancel: boolean;
  sort: 'recommended' | 'price' | 'rating' | 'distance' | string;
  [key: string]: any;
}

export interface Room {
  id: string;
  name: string;
  qty: number;
  sleeps: number;
  price: number;
  photos: string[];
  [key: string]: any;
}

export interface HourlyPrice {
  hours: number;
  price: number;
}

export interface DayUseWindow {
  from: string;
  until: string;
  price: number;
}

export interface Listing {
  id: string;
  businessId: string;
  title: string;
  type: string;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  photos: string[];
  photoCats: any[];
  modes: StayMode[];
  guests: number;
  bedrooms: number;
  baths: number;
  amenities: string[];
  rooms: Room[];
  hourly: HourlyPrice[];
  dayUse: DayUseWindow[];
  price: number;
  weekend?: number;
  weekly?: number;
  monthly?: number;
  minNights: number;
  maxNights?: number;
  breakfast?: number;
  deposit?: number;
  cxAllowed: boolean;
  cxFree: number;
  cxLate: number;
  cxNote?: string;
  extOn: boolean;
  extPrice?: number;
  hrFrom: string;
  hrUntil: string;
  checkin: string;
  checkout: string;
  rules: string;
  instant: boolean;
  verified: boolean;
  stays: number;
  rating: number;
  reviewCount: number;
  promo?: { id: string; title: string; percent: number; fundedBy?: string };
  [key: string]: any;
}

export interface QuoteLine {
  label: string;
  amount: number;
  negative?: boolean;
}

export interface Quote {
  base: number;
  breakfast: number;
  cleaning: number;
  discount: number;
  total: number;
  tax: number;
  deposit: number;
  lines: QuoteLine[];
  [key: string]: any;
}

export interface Booking {
  id: string;
  listingId: string;
  mode: StayMode;
  start: string;
  end: string;
  status: BookingStatus;
  cxAllowed: boolean;
  cxFree: number;
  cxLate: number;
  [key: string]: any;
}

export interface BookingInput {
  listingId: string;
  mode: StayMode;
  start: string;
  end: string;
  guests: number;
  roomId?: string;
  breakfast: boolean;
  special: string;
  methodId: string;
  [key: string]: any;
}

export type BookingResult = { ok: true; booking: Booking } | { ok: false; reason: 'declined' | 'unavailable' | 'auth' | 'network' };

export interface CardInput {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
  [key: string]: any;
}

export interface PaymentMethod {
  id: string;
  kind: string;
  label: string;
  [key: string]: any;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
  [key: string]: any;
}

export interface Thread {
  id: string;
  listingId: string;
  title: string;
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  [key: string]: any;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
  [key: string]: any;
}
