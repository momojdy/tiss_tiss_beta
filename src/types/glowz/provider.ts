export type ProviderType = 'salon' | 'independent' | 'home';
export type PromoCode = 'GLOW10' | 'FIRST200';

export interface Category {
  id: string;
  name: string;
  icon: string;
  /** Tone hue key used to pick the illustration palette. */
  h: number;
  on: boolean;
}

export interface Banner {
  id: string;
  tag: string;
  title: string;
  sub: string;
  promo?: PromoCode;
  cat?: string;
}

export interface HomeSection {
  id: string;
  title: string;
  sub: string;
  on: boolean;
}

export interface Service {
  id: string;
  n: string;
  cat: string;
  /** Duration in minutes. */
  d: number;
  desc: string;
  add: [string, number][];
}

export interface StaffMember {
  id: string;
  n: string;
  r: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  area: string;
  km: number;
  rating: number;
  rv: number;
  h: number;
  v: boolean;
  sponsored: boolean;
  promo: PromoCode | null;
  cats: string[];
  pay: string[];
  hours: string;
  addr: string;
  park: string;
  home: boolean;
  isNew: boolean;
  travel?: number;
  staff: StaffMember[];
  bio: string;
  svc: Service[];
}

export interface Post {
  id: string;
  p: string;
  svc: string;
  cap: string;
  h: number;
  likes: number;
}

export interface Review {
  u: string;
  s: number;
  t: string;
  d: string;
  reply?: string;
}

export interface PromoRule {
  type: 'pct' | 'flat';
  v: number;
  min: number;
  label: string;
  funded: string;
}
