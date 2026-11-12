const config=require('../app.config')({config:require('../app.json').expo});
const missing=[];
if(!config.android?.config?.googleMaps?.apiKey)missing.push('Android Google Maps API key and application/signature restrictions');
const location=config.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-location')?.[1];
if(!location?.isIosBackgroundLocationEnabled||!location?.isAndroidBackgroundLocationEnabled)missing.push('Native courier background location configuration');
if(missing.length){console.error('NOT VERIFIED: '+missing.join('; '));process.exitCode=1;}
else console.log('PASS: local native configuration is present; provider credentials, restrictions and device behavior still require verification.');
