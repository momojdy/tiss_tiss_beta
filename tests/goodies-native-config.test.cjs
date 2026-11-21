const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
test('SDK 58 emits Stripe iOS frameworks, the Android maps key, courier permissions and notification channel without native file generation',()=>{
 const root=path.resolve(__dirname,'..'),nativeBefore=['android','ios'].map(name=>fs.existsSync(path.join(root,name)));
 const key='synthetic-native-configuration-test-key';
 const config=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/expo/bin/cli'),'config','--type','introspect','--json'],{
  cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,
  env:{...process.env,EXPO_OFFLINE:'1',EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY:key,WANTISS_ANDROID_APPLICATION_ID:'com.wantiss.synthetic',WANTISS_IOS_BUNDLE_ID:'com.wantiss.synthetic'},
 }));
 const manifest=config._internal.modResults.android.manifest.manifest,metadata=manifest.application[0]['meta-data'];
 assert.equal(metadata.find(row=>row.$['android:name']==='com.google.android.geo.API_KEY')?.$['android:value'],key);
 assert.equal(metadata.find(row=>row.$['android:name']==='com.google.firebase.messaging.default_notification_channel_id')?.$['android:value'],'goodies');
 const permissions=manifest['uses-permission'].map(row=>row.$['android:name']);
 for(const permission of ['android.permission.ACCESS_FINE_LOCATION','android.permission.ACCESS_BACKGROUND_LOCATION','android.permission.FOREGROUND_SERVICE_LOCATION'])assert.ok(permissions.includes(permission),permission+' missing');
 assert.ok(config._internal.modResults.ios.infoPlist.UIBackgroundModes.includes('location'));
 assert.equal(config._internal.modResults.ios.podfileProperties['ios.useFrameworks'],'dynamic','Stripe SPM requires dynamic frameworks');
 assert.equal(config._internal.modResults.ios.entitlements['aps-environment'],'development');
 assert.deepEqual(['android','ios'].map(name=>fs.existsSync(path.join(root,name))),nativeBefore,'Introspection must not write native projects');
});
