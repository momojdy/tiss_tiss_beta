module.exports = ({ config }) => {
  const development = process.env.APP_VARIANT === 'development';
  const android = { ...config.android, ...(process.env.WANTISS_ANDROID_APPLICATION_ID ? {package: process.env.WANTISS_ANDROID_APPLICATION_ID} : {}), ...(development ? { package: 'com.wantiss.app.development' } : {}) };
  const ios = {...config.ios, ...(process.env.WANTISS_IOS_BUNDLE_ID ? {bundleIdentifier: process.env.WANTISS_IOS_BUNDLE_ID} : {}), ...(development ? {bundleIdentifier: 'com.wantiss.app.development'} : {})};
  const extra = {...config.extra, ...(process.env.WANTISS_EAS_PROJECT_ID ? {eas: {...config.extra?.eas, projectId: process.env.WANTISS_EAS_PROJECT_ID}} : {})};
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
  if (mapsKey) android.config = {
    ...config.android?.config,
    googleMaps: { ...config.android?.config?.googleMaps, apiKey: mapsKey },
  };

  return {
    ...config,
    ios,
    extra,
    ...(development
      ? {
          name: 'Wantiss (Dev)',
        }
      : {}),
    android,
    plugins: [
      ...(config.plugins || []),
      ['expo-dev-client', { addGeneratedScheme: development }],
    ],
  };
};
