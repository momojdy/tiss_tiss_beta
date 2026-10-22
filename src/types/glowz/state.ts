import type { Booking, BookingDraft } from './booking';

export type ThemeMode = 'light' | 'dark';
export type ExploreView = 'providers' | 'map' | 'inspire';
export type SortKey = 'relevance' | 'distance' | 'rating' | 'price' | 'soon';
export type FavoritesTab = 'p' | 's' | 'x';
export type BookingsTab = 'up' | 'pend' | 'done' | 'canc';
export type NoteAction = 'bdetail' | 'chat' | 'goSearch';

export interface Filters {
  price: 'any' | 'lt1000' | '1to3' | 'gt3';
  rating: number;
  verified: boolean;
  loc: 'any' | 'salon' | 'home';
  promo: boolean;
  today: boolean;
}

export interface Preferences {
  promo: boolean;
  reminders: boolean;
  follow: boolean;
  /** Personalised recommendations: Book again and Recently viewed on Home. */
  private: boolean;
}

export interface ChatMessage {
  me: 0 | 1;
  t: string;
  auto?: 1;
}

export interface Notification {
  t: string;
  s: string;
  a: NoteAction;
  id: string;
  u: 0 | 1;
  k?: 'promo';
}

export interface Report {
  pid: string;
  r: string;
  t: string;
  at: number;
}

export interface Profile {
  name: string;
  phone: string;
}

/** A profile or cover picture: a picked image, or one of the built-in illustrations. */
export type PictureChoice = { kind: 'uri'; uri: string } | { kind: 'tone'; index: number } | null;

export interface GlowzState {
  area: string;
  q: string;
  cat: string | null;
  sort: SortKey;
  expl: ExploreView;
  mapSel: string | null;
  f: Filters;
  favP: string[];
  favS: string[];
  favX: string[];
  follow: string[];
  likes: string[];
  recent: string[];
  bookings: Booking[];
  reports: Report[];
  ftab: FavoritesTab;
  btab: BookingsTab;
  prefs: Preferences;
  chat: Record<string, ChatMessage[]>;
  chatU: Record<string, boolean>;
  profile: Profile;
  theme: ThemeMode;
  cover: PictureChoice;
  avatar: PictureChoice;
  wl: string[];
  notes: Notification[];
  bk: BookingDraft | null;
}
