module.exports = ({ config }) => {
  const development = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    ...(development
      ? {
          name: 'Wantiss (Dev)',
          ios: { ...config.ios, bundleIdentifier: 'com.wantiss.app.development' },
          android: { ...config.android, package: 'com.wantiss.app.development' },
        }
      : {}),
    plugins: [
      ...(config.plugins || []),
      ['expo-dev-client', { addGeneratedScheme: development }],
    ],
  };
};
