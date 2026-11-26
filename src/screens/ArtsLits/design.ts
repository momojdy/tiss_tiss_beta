import { Platform } from 'react-native';
import type { Theme } from './model';
export const palettes = {
  light:{paper:'#f4f0e8',ink:'#222522',teal:'#00635e',line:'#d2ccc1',muted:'#5e5b52',wallpaper:'#e3ddd8',panel:'#e8e0d2',outer:'#dedbd3',rust:'#a13517',frame:'#211b17',plaque:'#f7f3ed',wood:'#8c6a4b',shadow:'rgba(32,23,17,.26)'},
  dark:{paper:'#142021',ink:'#f0e9dd',teal:'#81c9c0',line:'#3c4a47',muted:'#b9c3bb',wallpaper:'#303c3c',panel:'#333e3a',outer:'#0e1617',rust:'#e19a79',frame:'#100f0d',plaque:'#202b2a',wood:'#6b523a',shadow:'rgba(0,0,0,.5)'},
} as const;
export type Palette = { [K in keyof typeof palettes[Theme]]: string };
// Georgia is the approved HTML font. Android uses its native serif family when Georgia is unavailable.
export const serif = Platform.select({ios:'Georgia',android:'serif',web:'Georgia',default:'serif'});
export const sans = Platform.select({ios:'Arial',android:'sans-serif',web:'Arial',default:'sans-serif'});
export const frameMax = 460;
export const sectionGap = 25;
export const touchSize = 44;
