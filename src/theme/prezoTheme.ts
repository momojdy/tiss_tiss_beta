import { StyleSheet } from 'react-native';
import type { PrezoThemeMode } from '../types/prezo';

export interface PrezoColors {
  bg: string;
  s1: string;
  s2: string;
  ln: string;
  tx: string;
  mu: string;
  rd: string;
  rd2: string;
  on: string;
  ok: string;
  isDark: boolean;
}

export const prezoColors: Record<PrezoThemeMode, PrezoColors> = {
  light: {
    bg: '#f5f3f1',
    s1: '#ffffff',
    s2: '#eeebe8',
    ln: '#dedad6',
    tx: '#121212',
    mu: '#716c68',
    rd: '#c8101e',
    rd2: '#e3192a',
    on: '#ffffff',
    ok: '#18794e',
    isDark: false,
  },
  dark: {
    bg: '#000000',
    s1: '#0f0f10',
    s2: '#19191b',
    ln: '#262628',
    tx: '#f3f1ef',
    mu: '#8e8a87',
    rd: '#e3192a',
    rd2: '#ff3344',
    on: '#ffffff',
    ok: '#3ecf8e',
    isDark: true,
  },
};

export const prezoFonts = {
  display500: 'BricolageGrotesque_500Medium',
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'InterTight_400Regular',
  body500: 'InterTight_500Medium',
  body600: 'InterTight_600SemiBold',
} as const;

export const prezoRadii = {
  r1: 12,
  r2: 16,
  pill: 99,
} as const;

export const prezoLayout = {
  maxContentWidth: 1120,
  gutter: 20,
  headerHeight: 60,
  desktopBreakpoint: 820,
  tabletBreakpoint: 600,
  hairline: StyleSheet.hairlineWidth,
} as const;

export const heroGradientStops = ['#ff2a3b', '#8c0a15', '#120204'] as const;

export type ArtGradient =
  | { type: 'linear'; from: string; to: string; angle: number; stopAt: number }
  | { type: 'radial'; from: string; to: string; cx: number; cy: number; rx: number; ry: number };

export const artGradients: ArtGradient[] = [
  { type: 'linear', from: '#2a0508', to: '#000000', angle: 145, stopAt: 0.7 },
  { type: 'radial', from: '#c8101e', to: '#150204', cx: 0.7, cy: 0.2, rx: 0.9, ry: 0.9 },
  { type: 'linear', from: '#4a0b12', to: '#0b0b0c', angle: 160, stopAt: 1 },
  { type: 'radial', from: '#8c0a15', to: '#0a0a0b', cx: 0.25, cy: 0.15, rx: 0.8, ry: 0.8 },
];

