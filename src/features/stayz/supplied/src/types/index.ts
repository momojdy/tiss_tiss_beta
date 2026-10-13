export type StayMode = 'hourly' | 'dayuse' | 'overnight' | 'extended';
export type PropertyType = 'Hotel' | 'Resort' | 'Apartment' | 'Guesthouse' | 'Villa';
export type CurrencyCode = 'USD' | 'HTG' | 'DOP';
export type SortKey = 'recommended' | 'price' | 'rating' | 'distance';

export interface Room {
  id: string;
  name: string;
  qty: number;
  sleeps: number;
  price: number;
  photos: string[];
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

export interface PhotoCategory {
  cat: string;
  count: number;
}

export interface Promo {
  id: string;
  title: string;
  percent: number;
  fundedBy: 'vendor' | 'platform';
}

export interface Listing {
  id: string;
  businessId: string;
  title: string;
  type: PropertyType;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  photos: string[];
  photoCats: PhotoCategory[];
  modes: StayMode[];
  guests: number;
  bedrooms: number;
  baths: number;
  amenities: string[];
  rooms: Room[];
  hourly: HourlyPrice[];
  hrFrom: string;
  hrUntil: string;
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
  checkin: string;
  checkout: string;
  rules: string;
  instant: boolean;
  verified: boolean;
  stays: number;
  rating: number;
  reviewCount: number;
  promo?: Promo;
}

export type BookingStatus = 'Requested' | 'Accepted' | 'Upcoming' | 'Checked in' | 'Completed' | 'Cancelled' | 'No-show';

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
}

export interface ExtensionRequest {
  units: number;
  unit: 'hour' | 'night';
  price: number;
  status: 'pending' | 'approved' | 'declined';
}

export interface ChangeRequest {
  start: string;
  end: string;
  diff: number;
  status: 'pending' | 'approved' | 'declined';
}

export interface Booking {
  id: string;
  listingId: string;
  title: string;
  city: string;
  photo?: string;
  mode: StayMode;
  start: string;
  end: string;
  guests: number;
  roomName?: string;
  status: BookingStatus;
  total: number;
  breakfast: boolean;
  breakfastAmount: number;
  cleaning: number;
  discount: number;
  deposit: number;
  paymentLabel: string;
  doorCode?: string;
  cxAllowed: boolean;
  cxFree: number;
  cxLate: number;
  extOn: boolean;
  extPrice?: number;
  special?: string;
  refund?: { amount: number; status: 'processing' | 'paid' };
  extension?: ExtensionRequest;
  change?: ChangeRequest;
  reviewed: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
}

export type CardBrand = 'Visa' | 'Mastercard' | 'Discover' | 'JCB' | 'UnionPay';

export interface PaymentMethod {
  id: string;
  kind: 'wallet' | 'card' | 'moncash' | 'natcash';
  label: string;
  detail?: string;
  brand?: CardBrand;
}

export interface Thread {
  id: string;
  listingId: string;
  title: string;
  last: string;
  updatedAt: string;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
}

export interface Place {
  label: string;
  sub?: string;
  lat: number;
  lng: number;
  current?: boolean;
}

export interface Filters {
  types: PropertyType[];
  minPrice: number;
  maxPrice: number;
  amenities: string[];
  freeCancel: boolean;
  sort: SortKey;
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
  quote: Quote;
}

export type BookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'insufficient_balance' | 'declined' | 'unavailable' | 'auth' | 'network' };

export interface SearchQuery {
  mode: StayMode;
  start: string;
  end: string;
}

export interface CardInput {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
}
