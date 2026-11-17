const {test}=require('node:test'),assert=require('node:assert/strict'),configure=require('../app.config');
test('approved production identity can be supplied without inventing IDs or replacing unrelated native settings',()=>{
 const keys=['WANTISS_ANDROID_APPLICATION_ID','WANTISS_IOS_BUNDLE_ID','WANTISS_EAS_PROJECT_ID','APP_VARIANT'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  Object.assign(process.env,{WANTISS_ANDROID_APPLICATION_ID:'registered.android.app',WANTISS_IOS_BUNDLE_ID:'registered.ios.app',WANTISS_EAS_PROJECT_ID:'synthetic-linked-project',APP_VARIANT:'production'});
  const config={android:{permissions:['ACCESS_FINE_LOCATION']},ios:{supportsTablet:true},extra:{existing:true,eas:{other:true}}},result=configure({config});
  assert.equal(result.android.package,'registered.android.app');assert.equal(result.ios.bundleIdentifier,'registered.ios.app');assert.equal(result.extra.eas.projectId,'synthetic-linked-project');assert.equal(result.extra.eas.other,true);assert.equal(result.extra.existing,true);assert.equal(result.ios.supportsTablet,true);assert.deepEqual(result.android.permissions,config.android.permissions);
  process.env.APP_VARIANT='development';const dev=configure({config});assert.equal(dev.android.package,'com.wantiss.app.development');assert.equal(dev.ios.bundleIdentifier,'com.wantiss.app.development');
 }finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});
test('store release profile uses native device builds and the same existing Wantiss backend',()=>{
 const profile=require('../eas.json').build.production;assert.equal(profile.developmentClient,false);assert.equal(profile.android.buildType,'app-bundle');assert.equal(profile.ios.simulator,false);assert.equal(profile.distribution,'store');assert.equal(profile.env.EXPO_PUBLIC_SUPABASE_URL,'https://ycbirmgppwavorwudlrv.supabase.co');
});
test('development builds retain production settings and use separate application identifiers',()=>{
 const previous=process.env.APP_VARIANT;
 try{
  const config={name:'Wantiss',android:{package:'existing.id',permissions:['ACCESS_FINE_LOCATION']},ios:{bundleIdentifier:'existing.id',supportsTablet:true},plugins:['expo-location']};
  delete process.env.APP_VARIANT;const normal=configure({config});assert.equal(normal.android.package,'existing.id');assert.equal(normal.ios.bundleIdentifier,'existing.id');
  process.env.APP_VARIANT='development';const dev=configure({config});assert.equal(dev.android.package,'com.wantiss.app.development');assert.equal(dev.ios.bundleIdentifier,'com.wantiss.app.development');assert.deepEqual(dev.android.permissions,config.android.permissions);assert.equal(dev.ios.supportsTablet,true);assert.deepEqual(dev.plugins[0],'expo-location');
 }finally{if(previous===undefined)delete process.env.APP_VARIANT;else process.env.APP_VARIANT=previous;}
});
test('the native Android Maps key comes from the build environment without discarding existing native config',()=>{
 const previous=process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
 try{process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY='synthetic-config-test';const result=configure({config:{android:{config:{other:true,googleMaps:{extra:true}}}}});assert.equal(result.android.config.googleMaps.apiKey,'synthetic-config-test');assert.equal(result.android.config.googleMaps.extra,true);assert.equal(result.android.config.other,true);}
 finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;else process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=previous;}
});
