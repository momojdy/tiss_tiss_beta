import { ImageSourcePropType } from 'react-native';

const ASSET_BASE =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';

export const assets = {
  korido: { uri: ASSET_BASE + 'Korido.PNG' } as ImageSourcePropType,
  trophy: { uri: ASSET_BASE + 'Trophy.png' } as ImageSourcePropType,
  rps: { uri: ASSET_BASE + 'RPS_thumbnail.jpg' } as ImageSourcePropType,
  lls: { uri: ASSET_BASE + 'LLS_thumbnail.jpg' } as ImageSourcePropType,
};

export const gameImageFit = {
  rps: { width: 150, height: 200, resizeMode: 'cover' as const, radius: 20 },
  lls: { width: 150, height: 200, resizeMode: 'cover' as const, radius: 20 },
  korido: { width: 150, height: 200, resizeMode: 'contain' as const, radius: 20 },
};
