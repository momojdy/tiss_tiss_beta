// Frenzies home page theme (LIGHT mode), ported from the Flutter code.
// Every color/size lives here so screens never hard-code values.
// Gradient points are in 0..1 coordinates, ready for a LinearGradient.

export type Point = { x: number; y: number };
export type GradientDef = { colors: [string, string]; start: Point; end: Point };

const DIAGONAL = { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } };
const TOURNEY_DIAGONAL = { start: { x: 0.935, y: 1 }, end: { x: 0.065, y: 0 } };
const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };

export const colors = {
  pageBg: '#FFFFFF',
  textPrimary: '#15161B',
  textSecondary: '#6C7280',
  textDark: '#180C0C',
  white: '#FFFFFF',
  black: '#000000',
  header: { pillBg: 'rgba(243,236,236,0.80)', bolt: '#94C10B' },
  hero: { gradient: { colors: ['#F7E9C1', '#F3DEA7'], ...DIAGONAL } as GradientDef, subtext: '#6C7280' },
  gameCard: {
    badgeRps: 'rgba(244,241,234,0.38)',
    badgeRpsTime: 'rgba(244,241,234,0.376)',
    badgeKorido: 'rgba(244,241,234,0.655)',
    badgeKoridoTime: 'rgba(244,241,234,0.647)',
    playBg: '#173A12',
    playText: '#FFFFFF',
    challengeBg: '#FFFFFF',
    challengeText: '#173A12',
  },
  streak: {
    gradient: { colors: ['#FBDEC4', '#F6B68C'], ...DIAGONAL },
    flameBadgeBg: '#EE6B2E',
    flameIcon: '#180C0C',
    subtext: '#6C7280',
    progressFill: '#EE6B2E',
    progressTrack: 'rgba(0,0,0,0.10)',
    shieldPill: '#B3DF4B',
  },
  rankings: {
    cardBg: '#FFFFFF',
    cardBorder: '#EEF0F3',
    rowBorder: '#F1F2F4',
    rankMuted: '#B7BBC4',
    rankTop: '#E0862E',
    avatarBg: '#E7E9ED',
    avatarText: '#8A8F99',
    text: '#15161B',
    flamePillBg: '#FBE1D2',
    flamePillText: '#DE5A2A',
    youTint: 'rgba(201,242,75,0.06)',
    youRing: '#C9F24B',
  },
  pass: { bg: '#F7F8FA', border: '#EEF0F3', muted: '#9CA1AC', cta: '#C9F24B', ctaText: '#15161B' },
  nav: { bg: '#FFFFFF', active: '#173A12', inactive: '#6C7280' },
};

export type TournamentTierKey = 't1' | 't5' | 't20' | 't50' | 't100' | 'ultimate';

export const tournamentTiers: Record<TournamentTierKey, { gradient: GradientDef; text: string; track: string; shapeOpacity: number }> = {
  t1: { gradient: { colors: ['#DBF1CB', '#A9DE8C'], ...TOURNEY_DIAGONAL }, text: '#2E6A1D', track: 'rgba(0,0,0,0.10)', shapeOpacity: 0.32 },
  t5: { gradient: { colors: ['#D6EAFC', '#9DC8F0'], ...TOURNEY_DIAGONAL }, text: '#1F5FA0', track: 'rgba(0,0,0,0.098)', shapeOpacity: 0.32 },
  t20: { gradient: { colors: ['#FBEACB', '#EFC873'], ...TOURNEY_DIAGONAL }, text: '#8A5E10', track: 'rgba(0,0,0,0.098)', shapeOpacity: 0.32 },
  t50: { gradient: { colors: ['#E9DDF7', '#C1A3E8'], ...TOURNEY_DIAGONAL }, text: '#5B2E8C', track: 'rgba(0,0,0,0.098)', shapeOpacity: 0.32 },
  t100: { gradient: { colors: ['#FBD9D2', '#EE9C87'], ...TOURNEY_DIAGONAL }, text: '#A3311A', track: 'rgba(0,0,0,0.098)', shapeOpacity: 0.32 },
  ultimate: { gradient: { colors: ['#2C2A22', '#15140F'], ...VERTICAL }, text: '#F0C864', track: 'rgba(0,0,0,0.098)', shapeOpacity: 0.08 },
};

export const sizes = {
  pagePadding: 18,
  heroHeight: 100,
  heroRadius: 20,
  streakRadius: 20,
  streakHeight: 150,
  rankingsHeight: 200,
  rankingsRadius: 20,
  gameCard: { width: 150, height: 200, gap: 13 },
  tournamentCard: { width: 200, height: 200, gap: 15, radius: 20 },
  navHeight: 90,
};