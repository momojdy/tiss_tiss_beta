export const BRAND = '#FF6B5A';
export const BRAND_DEEP = '#F04E3C';
export const BRAND_ACCENT = '#F4513F';
export const TEAL = '#14B8A6';

export interface Palette {
  bg: string;
  card: string;
  text: string;
  sub: string;
  line: string;
  brand: string;
  brandSoft: string;
  teal: string;
  tealSoft: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  chip: string;
  overlay: string;
  onBrand: string;
  placeholder: string;
}

export const light: Palette = {
  bg: '#FFFAF8',
  card: '#FFFFFF',
  text: '#1B2430',
  sub: '#6B7684',
  line: '#F0E4DF',
  brand: BRAND,
  brandSoft: '#FFE8E4',
  teal: TEAL,
  tealSoft: '#D9F5F1',
  danger: '#D93A2B',
  dangerSoft: '#FDE4E1',
  warn: '#B7791F',
  warnSoft: '#FFF3D6',
  chip: '#F8EFEB',
  overlay: 'rgba(15,20,28,0.5)',
  onBrand: '#FFFFFF',
  placeholder: '#F3DDD6',
};

export const dark: Palette = {
  bg: '#12161C',
  card: '#1B2129',
  text: '#F3F5F7',
  sub: '#9AA5B1',
  line: '#2A323D',
  brand: BRAND,
  brandSoft: '#3A211E',
  teal: TEAL,
  tealSoft: '#12332F',
  danger: '#FF7A6B',
  dangerSoft: '#3A1F1B',
  warn: '#F2C265',
  warnSoft: '#3A301A',
  chip: '#252C36',
  overlay: 'rgba(0,0,0,0.65)',
  onBrand: '#FFFFFF',
  placeholder: '#2B2F38',
};
