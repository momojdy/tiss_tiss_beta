const platform=process.env.EAS_BUILD_PLATFORM||process.argv[2]||'all';
if(!['android','ios','all'].includes(platform)){
 console.error('NOT VERIFIED: Select android, ios or all for the native configuration check.');process.exit(1);
}
let config;
try{config=require('../app.config')({config:require('../app.json').expo});}
catch{console.error('NOT VERIFIED: Native client configuration could not load. Check the Android client file and application ID.');process.exit(1);}
const android=platform!=='ios',ios=platform!=='android',missing=[];
if(process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/,'')!=='https://ycbirmgppwavorwudlrv.supabase.co')missing.push('Existing Wantiss Supabase runtime URL (EXPO_PUBLIC_SUPABASE_URL)');
if(!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)missing.push('Public Supabase runtime key (EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)');
if(android&&!config.android?.package)missing.push('Android application ID (WANTISS_ANDROID_APPLICATION_ID)');
if(ios&&!config.ios?.bundleIdentifier)missing.push('iOS bundle ID (WANTISS_IOS_BUNDLE_ID)');
if(!config.extra?.eas?.projectId)missing.push('Existing Expo/EAS project link (WANTISS_EAS_PROJECT_ID)');
if(android&&!config.android?.config?.googleMaps?.apiKey)missing.push('Android Google Maps API key (EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY)');
if(android&&!config.android?.googleServicesFile)missing.push('Android push client configuration file (GOOGLE_SERVICES_JSON)');
const location=(config.plugins||[]).find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-location')?.[1];
if(android&&!location?.isAndroidBackgroundLocationEnabled)missing.push('Android courier background location configuration');
if(ios&&!location?.isIosBackgroundLocationEnabled)missing.push('iOS courier background location configuration');
if(missing.length){console.error('NOT VERIFIED: '+missing.join('; '));process.exitCode=1;}
else console.log('PASS: '+platform+' native build fields are present; EAS FCM/APNs credentials, signing/account access, Maps restrictions and physical-device behavior still require verification.');
