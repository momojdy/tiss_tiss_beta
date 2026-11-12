const {test}=require('node:test'),assert=require('node:assert/strict'),configure=require('../app.config');
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
