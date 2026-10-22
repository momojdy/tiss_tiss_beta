import { Platform, TextStyle } from 'react-native';

/**
 * The prototype uses Cormorant Garamond (display) and Jost (body). Font files are not bundled here.
 * Set GLOWZ_FONTS.loaded to true after loading them (for example with expo-font) and these names are used;
 * otherwise a close system serif and the system sans are used.
 */
export const GLOWZ_FONTS = {
  loaded: false,
  display: { 500: 'CormorantGaramond-Medium', 600: 'CormorantGaramond-SemiBold', 700: 'CormorantGaramond-Bold' },
  body: { 400: 'Jost-Regular', 500: 'Jost-Medium', 600: 'Jost-SemiBold' },
};

const systemSerif = Platform.select({ ios: 'Georgia', default: 'serif' }) as string;

export function displayFont(weight: 500 | 600 | 700 = 600): TextStyle {
  if (GLOWZ_FONTS.loaded) return { fontFamily: GLOWZ_FONTS.display[weight] };
  return { fontFamily: systemSerif, fontWeight: weight === 700 ? '700' : '600' };
}

export function bodyFont(weight: 400 | 500 | 600 = 400): TextStyle {
  if (GLOWZ_FONTS.loaded) return { fontFamily: GLOWZ_FONTS.body[weight] };
  return { fontWeight: String(weight) as TextStyle['fontWeight'] };
}
