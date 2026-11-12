module.exports = ({ config }) => {
  const development = process.env.APP_VARIANT === 'development';
  const android = { ...config.android, ...(development ? { package: 'com.wantiss.app.development' } : {}) };
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
  if (mapsKey) android.config = {
    ...config.android?.config,
    googleMaps: { ...config.android?.config?.googleMaps, apiKey: mapsKey },
  };

  return {
    ...config,
    ...(development
      ? {
          name: 'Wantiss (Dev)',
          ios: { ...config.ios, bundleIdentifier: 'com.wantiss.app.development' },
        }
      : {}),
    android,
    plugins: [
      ...(config.plugins || []),
      ['expo-dev-client', { addGeneratedScheme: development }],
    ],
  };
};
