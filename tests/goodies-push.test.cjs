const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),user=id(1),notification=id(2),business=id(3),project=id(4);
function load(file,imports={},extra={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,setTimeout,clearTimeout,require:name=>{if(imports[name])return imports[name];throw Error('Unexpected import '+name);},process:{env:{EXPO_PUBLIC_GOODIES_PUSH_RELEASED:'true'}},...extra});return module.exports;}
const routing=load('src/services/goodiesPushRouting.ts',{'../features/Goodies/notifications':load('src/features/Goodies/notifications.ts')});
test('push payloads only contain validated notification/account references and cannot inject routes',()=>{
 assert.equal(routing.parseGoodiesPushReference({feature:'Goodies',notification_id:'invalid',user_id:user}),null);
 const ref=routing.parseGoodiesPushReference({feature:'Goodies',notification_id:notification,user_id:user,page:'finance',url:'javascript:bad'});
 assert.deepEqual(JSON.parse(JSON.stringify(ref)),{feature:'Goodies',notification_id:notification,user_id:user});
 assert.equal(routing.goodiesPushDestination({user_id:id(7),feature_name:'Goodies'},user),null);
 assert.equal(routing.goodiesPushDestination({user_id:user,feature_name:'Goodies',notification_type:'goodies_admin_alert'},user),null);
});
test('canonical notification records route to existing buyer, vendor and courier pages',()=>{
 const row={user_id:user,feature_name:'Goodies',notification_type:'goodies_order',metadata:{order_id:notification}};
 assert.deepEqual(JSON.parse(JSON.stringify(routing.goodiesPushDestination(row,user))),{mode:'buyer',route:'orders'});
 assert.equal(routing.goodiesPushDestination({...row,destination:'goodies_courier'},user).mode,'courier');
 const vendor={...row,notification_type:'goodies_vendor_product_review',destination:'business_goodies_products',metadata:{business_id:business}};
 assert.equal(routing.goodiesPushDestination(vendor,user).mode,'vendor');
 assert.equal(routing.goodiesPushDestination({...vendor,metadata:{business_id:'invalid'}},user),null);
 assert.equal(routing.goodiesPushDestination({...row,notification_type:'store_message',metadata:{conversation_id:notification}},user).route,'messages');
 assert.equal(routing.goodiesPushDestination({...row,notification_type:'store_message',destination:'messages',metadata:{conversation_id:notification,business_id:business}},user).mode,'vendor');
});
function device({enabled=true,permission='granted',platform='android',environment='standalone',changeAccount=false,flag='true'}={}){
 const calls=[],storage=new Map();let sessions=0;
 const sdk={AndroidImportance:{HIGH:4},setNotificationChannelAsync:async()=>calls.push('channel'),getPermissionsAsync:async()=>{calls.push('permission');return{status:permission};},requestPermissionsAsync:async()=>{calls.push('request');return{status:permission};},getExpoPushTokenAsync:async args=>{calls.push(['token',args.projectId]);return{data:'ExponentPushToken[synthetic_device_123456]'};}};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:changeAccount&&sessions++>0?id(9):user},access_token:'synthetic-session'}},error:null})},rpc:async(name,args)=>{calls.push({name,args});return{data:name==='goodies_push_registration_status'?{enabled,project_id:project}:name==='goodies_register_push_device'?{status:'registered'}:null,error:null};}};
 const api=load('src/services/goodiesPush.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async key=>storage.get(key),setItem:async(key,v)=>storage.set(key,v),removeItem:async key=>storage.delete(key)}},'expo-constants':{__esModule:true,default:{executionEnvironment:environment,expoConfig:{extra:{eas:{projectId:project}}}}},'expo-notifications':sdk,'react-native':{Platform:{OS:platform}},'../lib/supabase':{supabase:client}},{process:{env:{EXPO_PUBLIC_GOODIES_PUSH_RELEASED:flag}}});
 return{...api,calls,storage};
}
test('push registration respects rollout, native support and permission denial before storing tokens',async()=>{
 for(const [options,state] of [[{flag:'false'},'disabled'],[{enabled:false},'disabled'],[{platform:'web'},'unsupported'],[{environment:'storeClient'},'unsupported'],[{permission:'denied'},'permission-denied']]){
  const h=device(options);assert.equal(await h.registerGoodiesPushDevice(()=>true),state);assert.ok(!h.calls.some(call=>call.name==='goodies_register_push_device'));assert.equal(h.storage.size,0);
 }
});
test('SDK 58 registration creates the Android channel before permission and uses the configured project',async()=>{
 const h=device();assert.equal(await h.registerGoodiesPushDevice(()=>true),'registered');assert.ok(h.calls.indexOf('channel')<h.calls.indexOf('permission'));
 assert.ok(h.calls.some(call=>Array.isArray(call)&&call[0]==='token'&&call[1]===project));assert.equal(h.calls.find(call=>call.name==='goodies_register_push_device').args.p_project_id,project);
 assert.equal(h.storage.size,1);await h.unregisterGoodiesPushDevice();assert.equal(h.storage.size,0);assert.equal(h.calls.at(-1).name,'goodies_unregister_push_device');
});
test('a registration interrupted by an account change cannot register or cache the previous device operation',async()=>{
 const h=device({changeAccount:true});assert.equal(await h.registerGoodiesPushDevice(()=>true),'unavailable');assert.equal(h.storage.size,0);assert.ok(!h.calls.some(call=>call.name==='goodies_register_push_device'));
});

function hookHarness({cold=null}={}){
 const slots=[],effects=[],events=[],alerts=[],opens=[],queries=[];let cursor=0,scheduled=false,authenticated=false,account=user,fail=false,tap,cleared=0,last=cold;
 const render=()=>{cursor=0;api.useGoodiesPush(authenticated,true,destination=>opens.push(destination));for(const run of effects.splice(0))run();};
 const schedule=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;render();});};
 const react={useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{const result=typeof next==='function'?next(slots[i]):next;if(result!==slots[i]){slots[i]=result;schedule();}}];},useEffect(fn,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((value,n)=>value!==previous.deps[n])){effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}};
 const notifications={addNotificationResponseReceivedListener:fn=>{tap=fn;return{remove(){tap=null;}};},getLastNotificationResponseAsync:async()=>last,clearLastNotificationResponseAsync:async()=>{last=null;cleared++;},addPushTokenListener:()=>({remove(){}})};
 const client={auth:{getUser:async()=>({data:{user:{id:account}},error:null}),getSession:async()=>({data:{session:{user:{id:account}}},error:null})},from(){const filters={};return{select(){return this;},eq(key,value){filters[key]=value;return this;},async maybeSingle(){queries.push(filters);if(fail)return{data:null,error:Error('private database credentials')};return{data:{id:filters.id,user_id:filters.user_id,feature_name:'Goodies',notification_type:'goodies_order',metadata:{order_id:notification}},error:null};}};}};
 const api=load('src/services/useGoodiesPush.ts',{'react':react,'react-native':{Alert:{alert:(_title,body)=>alerts.push(body)},AppState:{addEventListener:(_event,fn)=>{events.push(fn);return{remove(){const i=events.indexOf(fn);if(i>=0)events.splice(i,1);}};}}},'expo-notifications':notifications,'../lib/supabase':{supabase:client},'../features/Goodies/content':{label:(_key,fallback)=>fallback},'./goodiesPush':{GOODIES_PUSH_RELEASED:true,isGoodiesPushSupported:()=>true,registerGoodiesPushDevice:async()=> 'registered'},'./goodiesPushRouting':routing});
 render();return{opens,alerts,queries,signIn(id=user){account=id;authenticated=true;render();},emit(reference){tap?.({notification:{request:{content:{data:reference}}}});},foreground(){for(const event of [...events])event('active');},offline(value){fail=value;},get cleared(){return cleared;}};
}
const drain=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
test('cold-start push waits for sign-in and routes one canonical notification after authentication',async()=>{
 const ref={feature:'Goodies',notification_id:notification,user_id:user},h=hookHarness({cold:{notification:{request:{content:{data:ref}}}}});
 await drain();assert.equal(h.queries.length,0);assert.equal(h.opens.length,0);h.signIn();await drain();assert.equal(h.opens.length,1);assert.equal(h.opens[0].route,'orders');assert.equal(h.cleared,1);
 h.emit(ref);await drain();assert.equal(h.opens.length,1);assert.equal(h.queries.length,1);
});
test('push addressed to another account cannot fetch or open that account notification',async()=>{
 const h=hookHarness();h.signIn(id(8));await drain();h.emit({feature:'Goodies',notification_id:notification,user_id:user});await drain();assert.equal(h.queries.length,0);assert.equal(h.opens.length,0);
});
test('offline push opening shows a safe failure and retries the stored reference on recovery',async()=>{
 const h=hookHarness();h.signIn();h.offline(true);await drain();h.emit({feature:'Goodies',notification_id:notification,user_id:user});await drain();assert.equal(h.opens.length,0);assert.equal(h.alerts.length,1);assert.doesNotMatch(h.alerts[0],/private|database|credentials/);assert.equal(h.cleared,0);
 h.offline(false);h.foreground();await drain();assert.equal(h.opens.length,1);assert.equal(h.cleared,1);
});
