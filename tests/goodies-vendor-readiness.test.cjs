const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const vendor='src/screens/businessSpace/BusinessSpaceGoodies.tsx',orders='src/screens/businessSpace/BusinessSpaceGoodiesOrders.tsx',account='src/screens/businessSpace/BusinessSpaceAccountScreens.tsx';
function source(file){return ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);}
function find(file,name,kind='function'){const ast=source(file);let found;function visit(n){if(kind==='function'&&ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n;if(kind==='variable'&&ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)found=n.initializer;ts.forEachChild(n,visit);}visit(ast);assert.ok(found,'Missing actual '+name);return {ast,node:found};}
function compile(code,context){const label=(_id,fallback,vars)=>fallback.replace(/\{(\w+)\}/g,(match,key)=>String(vars?.[key]??match));const text=value=>value;const vendorLabels=()=>({label,text,money:value=>'$'+Number(value).toFixed(2),locale:'en',canManage:true,requireManage:()=>true});context={label,text,requireManage:()=>true,useGoodiesVendorLabels:vendorLabels,...context};const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports='+code.replace(/^export\s+/,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{module,exports:module.exports,React,...context});return module.exports;}
function elements(node,out=[]){if(Array.isArray(node))node.forEach(n=>elements(n,out));else if(node&&typeof node==='object'){out.push(node);elements(node.props?.children,out);}return out;}
function component(file,name,context){const {node,ast}=find(file,name),tags=new Set();function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))tags.add(n.tagName.getText(ast));ts.forEachChild(n,visit);}visit(node);return compile(node.getText(ast),{...Object.fromEntries([...tags].map(t=>[t,t])),...context});}
test('vendor application documents use the SDK58 working filesystem entry point before upload and server submission',async()=>{
 const ast=source(account),binding=ast.statements.find(n=>ts.isImportDeclaration(n)&&n.importClause?.namedBindings?.name?.text==='FileSystem');assert.ok(binding);
 const calls=[],legacy=binding.moduleSpecifier.text==='expo-file-system/legacy';
 const FileSystem={EncodingType:{Base64:'base64'},readAsStringAsync:async(uri)=>{if(!legacy)throw Error('Deprecated root filesystem method always throws in SDK58');calls.push(['read',uri]);return 'U1lOVEhFVElD';}};
 const {node}=find(account,'uploadApplicationDocument','variable');
 const upload=compile(node.getText(ast),{applicationDocs:{d:{application:{id:'application'}},reload:async()=>{}},DocumentPicker:{getDocumentAsync:async()=>({canceled:false,assets:[{name:'proof.pdf',uri:'file:///synthetic.pdf',size:12,mimeType:'application/pdf'}]})},FileSystem,decode:raw=>raw,uuid:()=> 'synthetic-key',app:{toast(){},bump(){}},a:{run:async work=>work()},supabase:{storage:{from:bucket=>({upload:async(path)=>{calls.push(['upload',bucket,path]);return{};}})},rpc:async(name,args)=>{calls.push(['rpc',name,args.p_application_id]);return{};}}});
 await upload('owner_id');assert.equal(calls[0][0],'read');assert.equal(calls[1][0],'upload');assert.equal(calls[2][1],'submit_business_application_document');
});
test('vendor private delivery proof resolves signed storage links and supplies loading/error/retry states',async()=>{
 const reference='11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/photo.jpg',captured=[];
 for(const state of [{d:null,l:true,e:null},{d:null,l:false,e:'private storage failure'},{d:'https://signed.example.test/photo?token=synthetic',l:false,e:null}]){
  let reloads=0;const view=component(orders,'GoodiesVendorDeliveryProof',{useState:()=>[false,()=>{}],useEffect(){},useQ:(load)=>{captured.push(load);return {...state,reload:async()=>{reloads++;}};},resolveGoodiesDeliveryProof:async ref=>{assert.equal(ref,reference);return 'https://signed.example.test/photo?token=synthetic';}});
  const nodes=elements(view({reference}));assert.ok(!JSON.stringify(nodes).includes(reference));assert.ok(!JSON.stringify(nodes).includes('private storage failure'));
  if(state.l)assert.ok(nodes.some(n=>n.type==='Skel'));
  else if(state.e){const error=nodes.find(n=>n.type==='ErrBox');assert.ok(error?.props.retry);await error.props.retry();assert.equal(reloads,1);}
  else{const image=nodes.find(n=>n.type==='Image');assert.equal(image.props.source.uri,state.d);assert.equal(typeof image.props.onError,'function');}
 }
 await Promise.all(captured.map(load=>load()));
});
test('product save cannot delete newly committed photos if cleanup of removed photos loses its response',async()=>{
 const {node,ast}=find(vendor,'ProductSheet'),decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];
 const events=[],uploaded=[],f={name:'New item',description:'',price:'2.00',stock:'3',emoji:'',restriction:'none',photoUrls:[],photoUris:['file:///photo.jpg']};
 const save=compile(decl.initializer.getText(ast),{check:()=>'',setBusy(){},operationLock:{current:false},app:{biz:{id:'business'},toast:text=>events.push(['toast',text])},f,product:{id:'product',photoUrls:['https://storage.test/storage/v1/object/public/listing-photos/business/old.jpg']},ImageManipulator:{manipulateAsync:async()=>({uri:'file:///resized.jpg'}),SaveFormat:{JPEG:'jpeg'}},FileSystem:{readAsStringAsync:async()=> 'base64',EncodingType:{Base64:'base64'}},uid:()=> 'synthetic',decode:v=>v,errText:()=> 'Safe failure',goodiesApi:{saveProduct:async()=>events.push(['saved'])},onSaved:()=>events.push(['closed']),supabase:{storage:{from:()=>({upload:async path=>{uploaded.push(path);return{};},getPublicUrl:path=>({data:{publicUrl:'https://storage.test/storage/v1/object/public/listing-photos/'+path}}),remove:async paths=>{events.push(['removed',paths]);throw Error('Storage response lost');}})}},console:{warn(){}}});
 await save();assert.ok(events.some(e=>e[0]==='saved'));assert.ok(events.some(e=>e[0]==='closed'));assert.ok(!events.some(e=>e[0]==='removed'&&e[1].some(path=>uploaded.includes(path))));
});
test('shared vendor actions synchronously lock repeated taps, release after a failure and keep server errors private',async()=>{
 const {node,ast}=find('src/screens/businessSpace/BusinessSpaceShared.tsx','useAct');let calls=0,finish,bumps=0;const toasts=[];
 const actions=compile(node.getText(ast),{useState:()=>[false,()=>{}],useRef:v=>({current:v}),useApp:()=>({bump(){bumps++;},toast:text=>toasts.push(text)}),errText:()=> 'Safe failure'})();
 const first=actions.run(async()=>{calls++;await new Promise(resolve=>finish=resolve);},'Saved');const duplicate=await actions.run(async()=>{calls++;});assert.equal(duplicate,false);assert.equal(calls,1);finish();assert.equal(await first,true);assert.equal(bumps,1);
 assert.equal(await actions.run(async()=>{throw Error('private server configuration');}),false);assert.ok(!toasts.join(' ').includes('private'));assert.equal(await actions.run(async()=>{calls++;}),true);assert.equal(calls,2);
});
test('vendor ingredient history requests the selected server page beyond the old 200-row cutoff',async()=>{
 const ast=source(vendor);let callback;function visit(n){if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='listRequests')callback=n.initializer;ts.forEachChild(n,visit);}visit(ast);assert.ok(callback);const requests=[];
 const load=compile(callback.getText(ast),{rpc:async(name,args)=>{requests.push({name,args});return [{id:'request-201',name:'Real request',builder:'pizza',status:'submitted',created_at:'2026-11-18T00:00:00Z'}];}});
 const rows=await load('business',4);assert.equal(requests[0].name,'goodies_list_ingredient_requests_page');assert.equal(requests[0].args.p_offset,200);assert.equal(requests[0].args.p_limit,50);assert.equal(requests[0].args.p_business,'business');assert.equal(rows[0].id,'request-201');
});
test('failed store-publication refresh remains visible and prevents stale go-live actions',()=>{
 const render=state=>component(vendor,'GoLiveCard',{useApp:()=>({biz:{id:'business'},tick:0}),useS:()=>({row:{},g:{},title:{},mut:{}}),useTheme:()=>({}),useQ:()=>({...state,reload(){}}),useState:initial=>[initial,()=>{}],useRef:v=>({current:v}),goodiesApi:{getLive(){throw Error('Not invoked until loader callback');}}})();
 const loading=elements(render({d:null,l:true,e:null}));assert.ok(loading.some(n=>n.type==='Skel'));
 const failed=elements(render({d:{live:false},l:false,e:'Safe unavailable'}));assert.ok(failed.some(n=>n.type==='ErrBox'&&n.props.retry));assert.equal(failed.find(n=>n.type==='Btn').props.disabled,true);
});
function apiMethod(name,context){const ast=source(vendor);let node;function visit(n){if(ts.isPropertyAssignment(n)&&n.name.getText(ast)===name)node=n.initializer;ts.forEachChild(n,visit);}visit(ast);assert.ok(node);return compile(node.getText(ast),context);}
test('an authoritative empty builder list cannot resurrect removed or sample builders from a stale device cache',async()=>{
 let writes=0;const load=apiMethod('listBuilders',{supabase:{from:()=>({select(){return this;},eq(){return this;},order:async()=>({data:[],error:null})})},q:async request=>(await request).data,rd:async()=>[{id:'removed-builder',groups:[]}],k:()=> 'cache-key',goodiesApi:{saveBuilders:async()=>{writes++;}}});
 const rows=await load('business');assert.equal(rows.length,0);assert.equal(writes,0);
});
test('a confirmed builder save remains successful if only the nonauthoritative device cache is full',async()=>{
 let writes=0;const save=apiMethod('saveBuilders',{rpc:async()=>{writes++;},k:()=> 'cache-key',AsyncStorage:{setItem:async()=>{throw Error('Local cache full');},getItem:async()=>null}});
 await save('business',[{id:'builder',groups:[]}]);assert.equal(writes,1);
});
test('new product save prevents repeated taps before the first server response arrives',async()=>{
 const {node,ast}=find(vendor,'ProductSheet'),decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];let writes=0,finish;
 const save=compile(decl.initializer.getText(ast),{operationLock:{current:false},check:()=>'',setBusy(){},app:{biz:{id:'business'},toast(){}},f:{name:'New',description:'',price:'2.00',stock:'1',photoUris:[],photoUrls:[]},product:{photoUrls:[]},goodiesApi:{saveProduct:async()=>{writes++;await new Promise(resolve=>finish=resolve);}},onSaved(){},errText:()=> 'Safe failure'});
 const first=save();await save();assert.equal(writes,1);finish();await first;
});
test('existing custom builder products remain reachable and editable from the vendor product list',()=>{
 let query=0;const destination=[],builder={id:'custom-builder',type:'custom',name:'Custom bowl',base:'4',enabled:true,available:true,productCreated:true};
 const view=component(vendor,'GoodiesProductsPage',{useApp:()=>({biz:{id:'business'},tick:0,go:(...args)=>destination.push(args)}),useArg:()=>undefined,useS:()=>({cardFlat:{},row:{}}),useTheme:()=>({}),useState:initial=>[initial,()=>{}],useEffect(){},useRef:initial=>({current:initial}),useQ:()=>({d:query++===0?[]:[builder],l:false,e:null,reload(){}}),dollars:n=>'$'+n});
 const row=elements(view()).find(n=>n.type==='Row'&&n.props.title==='Custom bowl');assert.ok(row);row.props.onPress();assert.equal(destination[0][0],'goodiesBuilder');assert.equal(destination[0][1].id,'custom-builder');assert.match(row.props.sub,/Custom/);
});
test('historical partial business hours cannot crash the actual form or silently open missing days',()=>{
 const file='src/screens/businessSpace/BusinessSpaceShared.tsx',ast=source(file);let daysNode,defaultsNode;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='DAYS')daysNode=n.initializer;if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='defaultHours')defaultsNode=n.initializer;ts.forEachChild(n,visit);}visit(ast);
 const DAYS=compile(daysNode.getText(ast)),defaultHours=compile(defaultsNode.getText(ast),{DAYS}),normalized=find(file,'normalizeBusinessHours'),normalizeBusinessHours=compile(normalized.node.getText(normalized.ast),{DAYS,defaultHours});
 const info=find(account,'BusinessInfoPage');let initialize;function read(n){if(ts.isVariableDeclaration(n)&&n.name.getText(info.ast)==='[f, setF]')initialize=n.initializer.arguments[0];ts.forEachChild(n,read);}read(info.node);assert.ok(initialize);
 const b={name:'Historical shop',hours:{Monday:{open:'10:00',close:'18:00',closed:false}}},state=compile(initialize.getText(info.ast),{b,defaultHours,normalizeBusinessHours})();assert.equal(state.hours.Monday.closed,false);assert.equal(state.hours.Monday.open,'10:00');for(const day of DAYS.slice(1)){assert.equal(state.hours[day].closed,true);assert.equal(typeof state.hours[day].open,'string');}
 assert.equal(normalizeBusinessHours({Monday:{open:'bad',close:'18:00',closed:false}}).Monday.closed,true);assert.deepEqual(JSON.parse(JSON.stringify(normalizeBusinessHours(null))),JSON.parse(JSON.stringify(defaultHours())));
});
function appBridge(componentName,attribute){const ast=source('App.tsx');let value;function visit(n){if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)===componentName){const attr=n.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)===attribute);value=attr?.initializer?.expression;}ts.forEachChild(n,visit);}visit(ast);assert.ok(value,componentName+' '+attribute+' bridge is missing');return value.getText(ast);}
test('vendor Wallet button opens the existing Wantiss Wallet destination instead of buyer home',()=>{
 const calls=[];const open=compile(appBridge('BusinessSpaceScreen','onOpenWallet'),{setAppMode:v=>calls.push(['mode',v]),setBuyerScreen:v=>calls.push(['screen',v])});open();assert.deepEqual(calls,[['mode','buyer'],['screen','wallet']]);
});
test('vendor and courier App signout bridges preserve auth state when Supabase returns an error',async()=>{
 for(const componentName of ['BusinessSpaceScreen','GoodiesCourierScreen']){const state=[],context={supabase:{auth:{signOut:async()=>({error:Error('private signout failure')})}},setAuthenticated:v=>state.push(v),setAppMode:v=>state.push(v),setScreen:v=>state.push(v),setBuyerScreen:v=>state.push(v),unregisterGoodiesPushDevice:async()=>{}},helper=find('App.tsx','signOutAccount','variable');context.signOutAccount=compile(helper.node.getText(helper.ast),context);const signout=compile(appBridge(componentName,'onSignOut'),context);await assert.rejects(signout());assert.equal(state.length,0);context.supabase.auth.signOut=async()=>({error:null});await signout();assert.deepEqual(state,[false,'buyer','auth','home']);}
});
test('vendor signout boundary shows a safe failure instead of an unhandled server rejection',async()=>{
 const {node,ast}=find('src/screens/businessSpace/BusinessSpaceScreen.tsx','signOut','variable'),alerts=[];const signout=compile(node.getText(ast),{onSignOut:async()=>{throw Error('private server detail');},Alert:{alert:(...args)=>alerts.push(args)}});await signout();assert.equal(alerts.length,1);assert.ok(!alerts.flat().join(' ').includes('private'));assert.equal(alerts[0][0],'Could not sign out');
});


test('editing a hidden or unavailable custom product never silently republishes it',async()=>{
 const {node,ast}=find(vendor,'GoodiesBuilderEditPage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];
 const makeSave=(b,all,onSaved)=>compile(decl.initializer.getText(ast),{
  b,all,builderSaveLock:{current:false},validateBuilder:()=>[],setErrs(){},setSaving(){},requireManage:()=>true,
  app:{biz:{id:'merchant'},toast(){},bump(){},back(){}},
  goodiesApi:{listBuilders:async()=>all,saveBuilders:async(_business,rows)=>onSaved(JSON.parse(JSON.stringify(rows)))},
  errText:()=> 'Safe failure',
 });
 const other={id:'another-product',enabled:true,available:true,productCreated:true};
 for(const [enabled,available] of [[false,false],[true,false],[false,true],[true,true]]){
  const existing={id:'custom-existing',name:'Existing bowl',enabled,available,productCreated:true};
  let written=null;
  await makeSave(existing,[existing,other],rows=>{written=rows;})();
  assert.equal(written.length,2);
  assert.equal(written[0].enabled,enabled);
  assert.equal(written[0].available,available);
  assert.equal(written[0].productCreated,true);
  assert.equal(written[1].enabled,true);
  assert.equal(written[1].available,true);
 }
 let created=null;
 const fresh={id:'new-builder',name:'Fresh bowl',enabled:true,available:true,productCreated:false};
 await makeSave(fresh,[],rows=>{created=rows;})();
 assert.equal(created.length,1);
 assert.equal(created[0].productCreated,true);
 assert.equal(created[0].enabled,true);
 assert.equal(created[0].available,true);
});


test('own-driver evidence never falls back to public listing photos when private rollout is off',async()=>{
 const {node,ast}=find(orders,'GoodiesOrdersPage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='markOwnDelivered')).declarationList.declarations[0];
 const events=[],order={id:'delivery-order'};
 const run=(enabled)=>compile(decl.initializer.getText(ast),{
  app:{biz:{id:'merchant'},toast:message=>events.push(['toast',message])},
  orders:{reload:async()=>events.push(['reload'])},
  setOwnBusy:value=>events.push(['busy',value]),
  goodiesOrdersRequest:async(name,args)=>{
   events.push(['rpc',name,args]);
   return name==='goodies_private_delivery_proof_uploads_enabled'?{data:enabled,error:null}:{error:null};
  },
  ImagePicker:{
   MediaTypeOptions:{Images:'Images'},requestCameraPermissionsAsync:async()=>{events.push(['camera']);return{granted:true};},
   launchCameraAsync:async()=>({canceled:false,assets:[{uri:'file:///photo.jpg',width:1200}]}),
  },
  ImageManipulator:{manipulateAsync:async()=>({uri:'file:///edited.jpg'}),SaveFormat:{JPEG:'jpeg'}},
  FileSystem:{EncodingType:{Base64:'base64'},readAsStringAsync:async()=> 'U1lOVEhFVElD'},
  decode:value=>value,
  GOODIES_DELIVERY_PROOF_BUCKET:'goodies-delivery-proofs',
  supabase:{storage:{from:bucket=>{
   events.push(['bucket',bucket]);
   return{upload:async(path)=>{events.push(['upload',path]);return{error:null};},getPublicUrl:()=>{throw Error('Private proof must not have a public URL');}};
  }}},
  console:{warn(){}},
 });
 await run(false)(order);
 assert.ok(!events.some(e=>e[0]==='camera'||e[0]==='upload'||e[0]==='bucket'));
 assert.ok(!events.some(e=>e[0]==='rpc'&&e[1]==='goodies_self_delivery_mark_delivered'));
 events.length=0;
 await run(true)(order);
 assert.ok(events.some(e=>e[0]==='bucket'&&e[1]==='goodies-delivery-proofs'));
 assert.ok(events.some(e=>e[0]==='upload'&&/^merchant\/delivery-order\/.*\.jpg$/.test(e[1])));
 const submitted=events.find(e=>e[0]==='rpc'&&e[1]==='goodies_self_delivery_mark_delivered');
 assert.ok(submitted,'Private proof must be confirmed by the server');
 assert.match(submitted[2].p_proof_url,/^merchant\/delivery-order\/.*\.jpg$/);
 assert.ok(!events.some(e=>e[0]==='bucket'&&e[1]==='listing-photos'));
});


test('vendor accept and decline callbacks reject rapid duplicate status transitions',async()=>{
 const {node,ast}=find(orders,'GoodiesOrdersPage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='act')).declarationList.declarations[0];
 const lock={current:false},notifications=[],calls=[];
 let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 let rejectMode=false;
 const act=compile(decl.initializer.getText(ast),{
  statusActionLock:lock,busyId:'',setBusyId(){},requireManage:()=>true,
  goodiesOrdersRequest:async(name,args)=>{calls.push({name,args});await pending;return rejectMode?{error:{message:'Synthetic rejection'}}:{error:null};},
  orders:{reload:async()=>{}},
  app:{toast:value=>notifications.push(value),bump(){}},
  setDecline(){},setCancel(){},setDetail(){},reason:'out_of_stock',detail:'',
  errText:()=> 'Safe status error',
 });
 const row={id:'order-1',payment_method:'wallet'};
 const first=act(row,'accept');
 await act(row,'accept');
 assert.equal(calls.length,1);
 assert.equal(lock.current,true);
 finish();
 await first;
 assert.equal(lock.current,false);
 rejectMode=true;
 await act(row,'ready');
 assert.equal(calls.length,2);
 assert.equal(lock.current,false);
 assert.ok(notifications.some(x=>/Could not update this order/.test(x)));
});


test('store setup save is single-flight even before the UI busy state rerenders',async()=>{
 const {node,ast}=find(vendor,'GoodiesStorePage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];
 const lock={current:false},events=[];
 let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 const f={storeName:'Shop',address:'Street',city:'City',country:'Haiti',coverUrl:null,thumbnailUrl:null};
 const save=compile(decl.initializer.getText(ast),{
  requireManage:()=>true,storeSaveLock:lock,err:()=>'',setBusy(){},
  app:{biz:{id:'merchant'},toast(){},bump(){}},f,savedAddress:{address:'Street',city:'City',country:'Haiti'},
  setSavedAddress(){},setF(){},sameAsCover:false,customTypes:[],customProducts:false,
  initialCustomToggles:{current:{master:false,enabled:{}}},
  goodiesApi:{
   saveStore:async()=>{events.push('store');await pending;},
   saveStoreThumbnail:async()=>events.push('thumbnail'),
   listBuilders:async()=>[],
   saveBuilders:async()=>events.push('builders'),
  },errText:()=> 'Safe failure',
 });
 const first=save();
 await save();
 assert.deepEqual(events,['store']);
 assert.equal(lock.current,true);
 finish();await first;
 assert.deepEqual(events,['store','thumbnail']);
 assert.equal(lock.current,false);
 await save();
 assert.equal(events.filter(item=>item==='store').length,2);
});

test('custom product editor save is single-flight and unlocks after a failed write',async()=>{
 const {node,ast}=find(vendor,'GoodiesBuilderEditPage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];
 const b={id:'builder',name:'Product',enabled:false,available:false,productCreated:true},lock={current:false},calls=[];
 let finish,reject=false;
 const pending=new Promise(resolve=>{finish=resolve;});
 const save=compile(decl.initializer.getText(ast),{
  b,all:[b],builderSaveLock:lock,requireManage:()=>true,validateBuilder:()=>[],setErrs(){},setSaving(){},
  app:{biz:{id:'merchant'},toast(){},bump(){},back(){}},errText:()=> 'Safe failure',
  goodiesApi:{listBuilders:async()=>[b],saveBuilders:async()=>{calls.push('save');await pending;if(reject)throw Error('Synthetic write failed');}},
 });
 const first=save();await save();
 assert.equal(calls.length,1);assert.equal(lock.current,true);
 reject=true;finish();await first;
 assert.equal(lock.current,false);
 await save();assert.equal(calls.length,2);
 assert.equal(lock.current,false);
});


test('saving unrelated store fields does not overwrite freshly edited builder recipes or availability',async()=>{
 const {node,ast}=find(vendor,'GoodiesStorePage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];
 const baseline={current:{master:true,enabled:{pizza:true,burger:true}}};
 const localTypes=[{id:'pizza',type:'pizza',enabled:false,groups:[{name:'Old pizza'}]},{id:'burger',type:'burger',enabled:true,groups:[{name:'Old burger'}]}];
 const liveRows=[
  {id:'pizza',type:'pizza',enabled:true,groups:[{name:'New admin pizza'}]},
  {id:'burger',type:'burger',enabled:false,groups:[{name:'New admin burger'}]},
  {id:'other',type:'custom',enabled:true,groups:[{name:'Other custom recipe'}]},
 ];
 const written=[];let reads=0;
 const save=compile(decl.initializer.getText(ast),{
  storeSaveLock:{current:false},initialCustomToggles:baseline,requireManage:()=>true,err:()=>'',setBusy(){},
  app:{biz:{id:'merchant'},toast(){},bump(){}},
  f:{storeName:'Shop',address:'Street',city:'City',country:'Haiti',coverUrl:null,thumbnailUrl:null},
  savedAddress:{address:'Street',city:'City',country:'Haiti'},setSavedAddress(){},setF(){},sameAsCover:false,
  customTypes:localTypes,customProducts:true,
  goodiesApi:{saveStore:async()=>{},saveStoreThumbnail:async()=>{},
   listBuilders:async()=>{reads++;return liveRows;},
   saveBuilders:async(_biz,rows)=>{written.push(JSON.parse(JSON.stringify(rows)));}},
  errText:()=> 'Safe failure',
 });
 await save();
 assert.equal(reads,1);assert.equal(written.length,1);
 assert.equal(written[0][0].enabled,false,'Vendor changed pizza availability');
 assert.equal(written[0][0].groups[0].name,'New admin pizza','Keep newer admin recipe');
 assert.equal(written[0][1].enabled,false,'Keep newer admin availability when vendor did not change burger');
 assert.equal(written[0][1].groups[0].name,'New admin burger');
 assert.equal(written[0][2].groups[0].name,'Other custom recipe');
 await save();
 assert.equal(reads,1,'No builder read needed when only store fields were changed');
 assert.equal(written.length,1,'No unnecessary full-list builder write');
});


test('custom product availability toggles keep newly approved unrelated builder recipes',async()=>{
 const {node,ast}=find(vendor,'GoodiesProductsPage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='toggleCustom')).declarationList.declarations[0];
 const stale={id:'pizza',type:'pizza',enabled:true,available:true,groups:[{name:'Outdated'}]};
 const current=[
  {...stale,groups:[{name:'Current admin pizza'}]},
  {id:'burger',type:'burger',enabled:true,available:true,groups:[{name:'New admin burger'}]},
 ];
 const submissions=[];
 const toggle=compile(decl.initializer.getText(ast),{
  availabilityLock:{current:false},setAvailabilityBusy(){},requireManage:()=>true,
  app:{biz:{id:'business'},toast(){},bump(){}},builders:{d:[stale],reload:async()=>{}},
  goodiesApi:{listBuilders:async()=>current,saveBuilders:async(_biz,rows)=>submissions.push(JSON.parse(JSON.stringify(rows)))},
  errText:()=> 'Safe failure',
 });
 await toggle(stale,false);
 assert.equal(submissions.length,1);
 assert.equal(submissions[0].length,2);
 assert.equal(submissions[0][0].available,false);
 assert.equal(submissions[0][0].groups[0].name,'Current admin pizza');
 assert.equal(submissions[0][1].groups[0].name,'New admin burger');
});

test('editing a builder preserves other new server builders and does not restore deleted builders',async()=>{
 const {node,ast}=find(vendor,'GoodiesBuilderEditPage');
 const decl=node.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='save')).declarationList.declarations[0];
 const previous={id:'pizza',type:'pizza',name:'Pizza',enabled:true,available:true,productCreated:true};
 const latest=[previous,{id:'burger',type:'burger',name:'New admin recipe',enabled:true,available:true}];
 const results=[],toasts=[];
 let deleted=false;
 const save=compile(decl.initializer.getText(ast),{
  b:{...previous,name:'Edited pizza'},all:[previous],
  builderSaveLock:{current:false},requireManage:()=>true,validateBuilder:()=>[],setErrs(){},setSaving(){},
  app:{biz:{id:'merchant'},toast:msg=>toasts.push(msg),bump(){},back(){}},
  goodiesApi:{listBuilders:async()=>deleted?latest.slice(1):latest,
   saveBuilders:async(_biz,rows)=>results.push(JSON.parse(JSON.stringify(rows)))},
  errText:()=> 'Could not save the custom product',
 });
 await save();
 assert.equal(results.length,1);
 assert.equal(results[0].length,2);
 assert.equal(results[0][1].name,'New admin recipe');
 assert.equal(results[0][0].name,'Edited pizza');
 deleted=true;
 await save();
 assert.equal(results.length,1,'Removed product cannot be recreated by old editor state');
 assert.ok(toasts.some(msg=>/Could not save/.test(msg)));
});
