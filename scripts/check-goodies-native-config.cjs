const config=require('../app.config')({config:require('../app.json').expo});
const missing=[];
if(!config.android?.package)missing.push('Registered Android application ID (WANTISS_ANDROID_APPLICATION_ID)');
if(!config.ios?.bundleIdentifier)missing.push('Registered iOS bundle ID (WANTISS_IOS_BUNDLE_ID)');
if(!config.extra?.eas?.projectId)missing.push('Existing Expo/EAS project link (WANTISS_EAS_PROJECT_ID)');
if(!config.android?.config?.googleMaps?.apiKey)missing.push('Android Google Maps API key and application/signature restrictions');
const location=config.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-location')?.[1];
if(!location?.isIosBackgroundLocationEnabled||!location?.isAndroidBackgroundLocationEnabled)missing.push('Native courier background location configuration');
if(missing.length){console.error('NOT VERIFIED: '+missing.join('; '));process.exitCode=1;}
else console.log('PASS: local native build fields are present; signing/account access, provider restrictions and physical-device behavior still require verification.');
