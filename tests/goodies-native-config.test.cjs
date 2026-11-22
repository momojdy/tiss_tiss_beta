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
test('Firebase build configuration accepts the matching Android client and refuses server credentials or another application',()=>{
 const root=path.resolve(__dirname,'..'),configure=require('../app.config'),base=require('../app.json').expo;
 const directory=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'goodies-firebase-config-'));
 const filename=path.join(directory,'google-services.json'),previous=process.env.GOOGLE_SERVICES_JSON,variant=process.env.APP_VARIANT;
 try{
  process.env.GOOGLE_SERVICES_JSON=filename;process.env.APP_VARIANT='development';
  const client={project_info:{project_id:'synthetic-config-only',project_number:'123456789'},client:[{client_info:{android_client_info:{package_name:'com.wantiss.app.development'}}}]};
  fs.writeFileSync(filename,JSON.stringify(client));
  assert.equal(configure({config:base}).android.googleServicesFile,filename);
  fs.writeFileSync(filename,JSON.stringify({...client,type:'service_account',private_key:'SYNTHETIC-NOT-A-KEY'}));
  assert.throws(()=>configure({config:base}),/Server service-account credentials must stay in EAS/);
  fs.writeFileSync(filename,JSON.stringify({...client,client:[{client_info:{android_client_info:{package_name:'com.other.application'}}}]}));
  assert.throws(()=>configure({config:base}),/must match the selected Wantiss application ID/);
  fs.writeFileSync(filename,'not-json');
  assert.throws(()=>configure({config:base}),/Firebase Android client configuration file/);
  fs.rmSync(filename);
  assert.throws(()=>configure({config:base}),/Firebase Android client configuration file/);
 }finally{
  fs.rmSync(directory,{recursive:true,force:true});
  if(previous===undefined)delete process.env.GOOGLE_SERVICES_JSON;else process.env.GOOGLE_SERVICES_JSON=previous;
  if(variant===undefined)delete process.env.APP_VARIANT;else process.env.APP_VARIANT=variant;
 }
 assert.equal(fs.existsSync(path.join(root,'android')),false);
});
