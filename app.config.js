const fs = require('node:fs');

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
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  if (googleServicesFile) {
    let firebase;
    try { firebase = JSON.parse(fs.readFileSync(googleServicesFile, 'utf8')); }
    catch { throw new Error('GOOGLE_SERVICES_JSON must point to the Firebase Android client configuration file.'); }
    if (!firebase || typeof firebase !== 'object' || Array.isArray(firebase)) {
      throw new Error('GOOGLE_SERVICES_JSON must point to the Firebase Android client configuration file.');
    }
    if (firebase.type === 'service_account' || firebase.private_key || firebase.client_email) {
      throw new Error('Use Firebase google-services.json for the Android app. Server service-account credentials must stay in EAS managed push credentials.');
    }
    if (!firebase.project_info?.project_id || !firebase.project_info?.project_number ||
      !Array.isArray(firebase.client) ||
      !firebase.client.some(client => client?.client_info?.android_client_info?.package_name === android.package)) {
      throw new Error('Firebase Android client configuration must match the selected Wantiss application ID.');
    }
    android.googleServicesFile = googleServicesFile;
  }

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
