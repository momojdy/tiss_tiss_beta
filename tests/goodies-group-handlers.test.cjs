const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const sheetFile='src/features/Goodies/components/Sheets.tsx',storeFile='src/features/Goodies/store.ts';
const sheet=ts.createSourceFile(sheetFile,fs.readFileSync(sheetFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function expression(owner,name){let found;function visit(node,inOwner=false){if(ts.isFunctionDeclaration(node))inOwner=node.name?.text===owner;if(inOwner&&ts.isVariableDeclaration(node)&&node.name.getText(sheet)===name)found=node.initializer;ts.forEachChild(node,child=>visit(child,inOwner));}visit(sheet);assert.ok(found,'Missing actual '+owner+'.'+name);return found.getText(sheet);}
function declarations(file,names){const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);return names.map(name=>{const node=sf.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(node,'Missing actual '+name);return node.getText(sf).replace(/^export\s+/,'');}).join('\n');}
const compiled=new Map();
function evaluate(code,context){const module={exports:{}};Object.assign(context,{module,exports:module.exports});if(!compiled.has(code))compiled.set(code,ts.transpileModule(code,{fileName:'actual-handlers.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText);vm.runInNewContext(compiled.get(code),context);return module.exports;}
const label=(_key,text)=>text,tick=()=>new Promise(resolve=>setImmediate(resolve)),clone=value=>JSON.parse(JSON.stringify(value));
function deferred(){let resolve,reject;return{promise:new Promise((yes,no)=>{resolve=yes;reject=no;}),resolve:value=>resolve(value),reject:error=>reject(error)};}
async function waitFor(predicate){for(let i=0;i<30;i++){if(predicate())return;await tick();}assert.fail('Expected mocked transport dispatch');}
const groupHandlers=['current','requireAccount','saveGroup','createServerGroup','joinGroup','valid','loadItems','loadMembers','refreshGroupStatus','loadInvites','openFriends','sendFriendInvites','declineInvite','groupAmount','validEstimate','loadGroupEstimate','selectGroupCheckoutType','calculateGroupDeliveryQuote','checkoutGroupOrder','reviewSharedOrder','endGroupOrder','removeSharedItem'];
function harness({serverBacked=true,dispatch,authenticate,initial={}}={}){
 const group={groupId:serverBacked?'group-a':'',code:serverBacked?'INVITE-A':'',storeId:'store-a',serverBacked,members:[],expiresAt:'2099-01-01T00:00:00Z'};
 const line={k:'line-a',id:'product-a',q:1,options:{size:'regular'},nt:'Original note'};
 const S={accountId:'account-a',groupOrder:group,cart:{sid:'store-a',lines:[clone(line)]},pf:{n:'Buyer',ph:'12345678'},addr:[{id:'address-a',l:'Home',t:'Real street'}],as:'address-a',wallet:100,hasWallet:true,paymentOptionsStatus:'ready'};
 const state={calls:[],toasts:[],logs:[],saved:0,emitted:0,closed:0,cleared:0,routes:[],friends:[],friendsBusy:false,friendsOpen:false,friendsError:'',pickedFriends:['friend-a'],myInvites:[{group_id:'invited-group',invite_code:'OTHER',host_name:'Friend'}],invitesLoading:false,invitesError:'',groupBusy:false,previewBusy:false,groupCheckoutBusy:false,groupQuoteBusy:false,sharedItems:[{id:'item-a',user_id:'account-a',line_key:'line-a',quantity:1,product:{price:10}}],groupMembers:[{user_id:'account-a',role:'host'}],sharedLoading:false,membersLoading:false,sharedError:'',membershipError:'',statusError:'',checkoutPreview:{group_id:'group-a',store_id:'store-a',items:[{id:'item-a',quantity:1}],subtotal:10},checkoutEstimate:{group_id:'group-a',order_type:'pickup',subtotal:10,delivery_fee:0,service_fee:0,estimated_total:10,currency:'USD'},groupDeliveryQuote:null,...initial};
 const ctx={S,accountId:'account-a',group,storeId:'store-a',currentUserId:'account-a',mounted:{current:true},activeGroup:{current:group.groupId},groupActionLock:{current:false},friendsActionLock:{current:false},groupCheckoutLock:{current:false},previewLock:{current:false},quoteLock:{current:false},itemLocks:{current:new Set()},invitesLoadId:{current:0},estimateVersion:{current:0},selection:{current:JSON.stringify([group.groupId,'pickup','address-a'])},groupCheckoutType:'pickup',groupAddressId:'address-a',label,money:value=>'$'+value,phoneOK:()=>true,toast:message=>state.toasts.push(message),save:()=>state.saved++,emit:()=>state.emitted++,close:()=>state.closed++,reset:route=>state.routes.push({route}),push:(route,id)=>state.routes.push({route,id}),clearActiveGroup:()=>{state.cleared++;S.groupOrder={code:'',members:[],serverBacked:false};},refreshUserAddresses:async()=>S.addr,fetchGoodiesOrderForNotification:async()=> 'order-a',A:{refreshPaymentOptions:async()=>true},console:{warn:(...values)=>state.logs.push(values.join(' '))},...state};
 // The handlers and their scope/auth helpers below are extracted from production ASTs;
 // only network, persistence, navigation and React setters are mocked.
 Object.assign(ctx,{groupSource:{current:S.groupOrder},active:true,owner:S.accountId,groupId:group.groupId,itemsRequest:0,membersRequest:0,statusRequest:0});state.groupCheckoutType='pickup';state.groupAddressId='address-a';
 for(const [key,value]of Object.entries(state)){if(['calls','toasts','logs','routes','saved','emitted','closed','cleared'].includes(key))continue;ctx[key]=value;ctx['set'+key[0].toUpperCase()+key.slice(1)]=next=>{const value=typeof next==='function'?next(state[key]):next;state[key]=value;ctx[key]=value;};}
 ctx.setGroup=next=>{ctx.group=typeof next==='function'?next(ctx.group):next;};
 const transport=async(name,args)=>{state.calls.push({name,args:clone(args||{})});return dispatch?dispatch(name,args):{data:null,error:null};};
 ctx.supabase={auth:{getUser:authenticate||(async()=>({data:{user:{id:S.accountId}},error:null}))},rpc:transport,functions:{invoke:async(name,options)=>transport(name,options.body)},from:table=>{const query={select(){return query;},eq(key,value){query.filter={key,value};return query;},order:async()=>transport(table,query.filter)};return query;}};
 ctx.removeGroupOrderCartLine=(groupId,key)=>transport('goodies_group_order_remove_item',{p_group_id:groupId,p_line_key:key});
 ctx.syncGroupOrderCartLine=(groupId,value)=>transport('goodies_group_order_upsert_item',{p_group_id:groupId,line:value});
 const friendly=declarations('src/features/Goodies/friendlyError.ts',['friendlyError']);
 const source=friendly+'\n'+groupHandlers.map(name=>'const '+name+'='+expression('GroupOrderSheet',name)+';').join('\n')+'\nmodule.exports={'+groupHandlers.join(',')+'};';
 const handlers=evaluate(source,ctx);
 function switchGroup(){ctx.activeGroup.current='group-b';S.groupOrder={...group,groupId:'group-b'};}
 return{S,state,ctx,handlers,switchGroup,line,item:state.sharedItems[0]};
}
test('friend list rejection exits loading, retains safe retry copy, and successful retry recovers',async()=>{
 let fail=true;const h=harness({dispatch:async()=>{if(fail)throw Error('private SQL token');return{data:[{user_id:'friend-a'}],error:null};}});
 await h.handlers.openFriends();assert.equal(h.state.friendsBusy,false);assert.equal(h.ctx.friendsActionLock.current,false);assert.match(h.state.friendsError,/Could not load/);assert.doesNotMatch(h.state.friendsError,/private|SQL|token/);assert.equal(h.state.friends.length,0);
 fail=false;await h.handlers.openFriends();assert.equal(h.state.friendsError,'');assert.equal(h.state.friends.length,1);assert.equal(h.state.friendsBusy,false);
});
test('same-tick friend sends dispatch once and retain the selection after a rejected send',async()=>{
 const response=deferred(),h=harness({dispatch:()=>response.promise});const sending=h.handlers.sendFriendInvites();await h.handlers.sendFriendInvites();await waitFor(()=>h.state.calls.length===1);response.reject(Error('private provider detail'));await sending;
 assert.equal(h.state.calls.length,1);assert.equal(h.state.friendsBusy,false);assert.equal(h.ctx.friendsActionLock.current,false);assert.equal(h.state.pickedFriends[0],'friend-a');assert.match(h.state.friendsError,/Could not send/);assert.doesNotMatch(h.state.friendsError,/private|provider/);
});
test('friend invite receipts must be finite counts from the submitted recipients',async()=>{
 for(const data of [null,'1',true,{},-1,2,Infinity]){const h=harness({dispatch:async()=>({data,error:null})});await h.handlers.sendFriendInvites();assert.match(h.state.friendsError,/Could not send/);assert.equal(h.state.pickedFriends.length,1);assert.equal(h.state.toasts.length,0);assert.equal(h.state.friendsBusy,false);}
 const h=harness({dispatch:async()=>({data:1,error:null})});await h.handlers.sendFriendInvites();assert.equal(h.state.pickedFriends.length,0);assert.match(h.state.toasts[0],/Invitation sent/);
});
test('late friend replies and errors cannot display a result for another account or group',async()=>{
 for(const change of [h=>{h.S.accountId='account-b';},h=>h.switchGroup(),h=>{h.S.groupOrder={...h.S.groupOrder};}])for(const rejects of [false,true]){
  const response=deferred(),h=harness({dispatch:()=>response.promise}),loading=h.handlers.openFriends();await waitFor(()=>h.state.calls.length===1);change(h);const before=clone({friends:h.state.friends,error:h.state.friendsError,toasts:h.state.toasts});
  if(rejects)response.reject(Error('private failure'));else response.resolve({data:[{user_id:'old-friend'}],error:null});await loading;
  assert.deepEqual({friends:h.state.friends,error:h.state.friendsError,toasts:h.state.toasts},before);
 }
});
test('actual authenticated identity is required before every group mutation',async()=>{
 for(const [name,args]of [['joinGroup',['CODE']],['createServerGroup',[]],['sendFriendInvites',[]],['declineInvite',['invited-group']],['endGroupOrder',[]],['checkoutGroupOrder',[]],['calculateGroupDeliveryQuote',[]],['removeSharedItem',[{id:'item-a',user_id:'account-a',line_key:'line-a'}]]]){
  const h=harness({serverBacked:name!=='joinGroup'&&name!=='declineInvite',authenticate:async()=>({data:{user:{id:'different-account'}},error:null})});await h.handlers[name](...args);assert.equal(h.state.calls.length,0,name+' must not dispatch for an unrelated auth user');assert.equal(h.ctx.groupActionLock.current,false);assert.equal(h.ctx.friendsActionLock.current,false);
 }
});
test('shared cart, membership and status read failures keep safe retry states and recover on retry',async()=>{
 for(const [name,problem,busy,result]of [['loadItems','sharedError','sharedLoading',[{id:'fresh-item'}]],['loadMembers','membershipError','membersLoading',[{user_id:'account-a',role:'host'}]],['refreshGroupStatus','statusError',null,{group_id:'group-a',status:'open',expires_at:'2099-01-01T00:00:00Z'}]]){
  let fail=true;const h=harness({dispatch:async()=>{if(fail)throw Error('private group SQL');return{data:result,error:null};}});await h.handlers[name]();assert.match(h.state[problem],/Could not/);assert.doesNotMatch(h.state[problem],/private|SQL/);if(busy)assert.equal(h.state[busy],false);assert.equal(h.S.groupOrder.groupId,'group-a');fail=false;await h.handlers[name]();assert.equal(h.state[problem],'');if(busy)assert.equal(h.state[busy],false);assert.equal(h.S.groupOrder.groupId,'group-a');
 }
});
test('shared reads discard out-of-order results and replies after an external group change',async()=>{
 for(const [name,key,first,latest]of [['loadItems','sharedItems',[{id:'old'}],[{id:'latest'}]],['loadMembers','groupMembers',[{user_id:'old'}],[{user_id:'latest'}]]]){
  const responses=[],h=harness({dispatch:()=>new Promise(resolve=>responses.push(resolve))}),old=h.handlers[name]();await waitFor(()=>responses.length===1);const current=h.handlers[name]();await waitFor(()=>responses.length===2);responses[1]({data:latest,error:null});await current;responses[0]({data:first,error:null});await old;assert.equal(h.state[key][0].id||h.state[key][0].user_id,'latest');
  const response=deferred(),stale=harness({dispatch:()=>response.promise}),loading=stale.handlers[name]();await waitFor(()=>stale.state.calls.length===1);const before=clone(stale.state[key]);stale.S.groupOrder={...stale.S.groupOrder,groupId:'group-b'};response.resolve({data:latest,error:null});await loading;assert.deepEqual(stale.state[key],before);
 }
 const response=deferred(),h=harness({dispatch:()=>response.promise}),status=h.handlers.refreshGroupStatus();await waitFor(()=>h.state.calls.length===1);h.S.groupOrder={...h.S.groupOrder,groupId:'group-b'};response.resolve({data:null,error:null});await status;assert.equal(h.S.groupOrder.groupId,'group-b');assert.equal(h.state.saved,0);assert.equal(h.state.toasts.length,0);
});
test('invitation reads surface safe failure and ignore superseded or account-switched replies',async()=>{
 let fail=true;const h=harness({serverBacked:false,dispatch:async()=>{if(fail)throw Error('private invites');return{data:[{group_id:'real-group'}],error:null};}});await h.handlers.loadInvites();assert.equal(h.state.invitesLoading,false);assert.match(h.state.invitesError,/Could not load/);assert.doesNotMatch(h.state.invitesError,/private/);fail=false;await h.handlers.loadInvites();assert.equal(h.state.invitesError,'');assert.equal(h.state.myInvites[0].group_id,'real-group');
 const replies=[],latest=harness({serverBacked:false,dispatch:()=>new Promise(resolve=>replies.push(resolve))});const old=latest.handlers.loadInvites();await waitFor(()=>replies.length===1);const newer=latest.handlers.loadInvites();await waitFor(()=>replies.length===2);replies[1]({data:[{group_id:'newest'}],error:null});await newer;replies[0]({data:[{group_id:'old'}],error:null});await old;assert.equal(latest.state.myInvites[0].group_id,'newest');
 const pending=deferred(),stale=harness({serverBacked:false,dispatch:()=>pending.promise}),loading=stale.handlers.loadInvites();await waitFor(()=>stale.state.calls.length===1);stale.S.accountId='account-b';pending.resolve({data:[{group_id:'private-invite'}],error:null});await loading;assert.equal(stale.state.myInvites[0].group_id,'invited-group');
});
test('decline failure preserves its invitation and duplicate taps issue one decline',async()=>{
 const response=deferred(),h=harness({serverBacked:false,dispatch:()=>response.promise}),declining=h.handlers.declineInvite('invited-group');await h.handlers.declineInvite('invited-group');await waitFor(()=>h.state.calls.length===1);assert.equal(h.state.myInvites.length,1);response.resolve({data:null,error:{message:'private decline SQL'}});await declining;
 assert.equal(h.state.myInvites.length,1);assert.equal(h.state.groupBusy,false);assert.equal(h.ctx.groupActionLock.current,false);assert.match(h.state.invitesError,/Could not decline/);assert.doesNotMatch(h.state.invitesError,/private|SQL/);
});
test('confirmed decline removes only its invitation and stale decline preserves next-account state',async()=>{
 const h=harness({serverBacked:false,dispatch:async()=>({data:null,error:null})});await h.handlers.declineInvite('invited-group');assert.equal(h.state.myInvites.length,0);
 const response=deferred(),stale=harness({serverBacked:false,dispatch:()=>response.promise}),declining=stale.handlers.declineInvite('invited-group');await waitFor(()=>stale.state.calls.length===1);stale.S.accountId='account-b';response.resolve({data:null,error:null});await declining;assert.equal(stale.state.myInvites.length,1);assert.equal(stale.state.toasts.length,0);
});
test('create and join reject malformed receipts and release their synchronous action lock',async()=>{
 for(const name of ['createServerGroup','joinGroup']){const h=harness({serverBacked:false,dispatch:async()=>({data:{group_id:'some-group'},error:null})});await h.handlers[name](...(name==='joinGroup'?['CODE']:[]));assert.equal(h.S.groupOrder.serverBacked,false);assert.equal(h.state.groupBusy,false);assert.equal(h.ctx.groupActionLock.current,false);assert.match(h.state.toasts[0],/Could not/);}
 const response=deferred(),h=harness({serverBacked:false,dispatch:()=>response.promise}),joining=h.handlers.joinGroup(' CODE ');await h.handlers.joinGroup('CODE');await waitFor(()=>h.state.calls.length===1);response.resolve({data:{group_id:'joined-group',invite_code:'CODE',store_id:'store-a'},error:null});await joining;assert.equal(h.state.calls.length,1);assert.equal(h.state.calls[0].args.p_invite_code,'CODE');assert.equal(h.S.groupOrder.groupId,'joined-group');
});
test('end failures and malformed receipts preserve the active group and allow a retry',async()=>{
 for(const receipt of [{data:null,error:null},{data:{group_id:'group-b',status:'cancelled'},error:null},{data:{group_id:'group-a',status:'open'},error:null}]){const h=harness({dispatch:async()=>receipt});await h.handlers.endGroupOrder();assert.equal(h.S.groupOrder.groupId,'group-a');assert.equal(h.state.closed,0);assert.equal(h.state.groupBusy,false);assert.equal(h.ctx.groupActionLock.current,false);assert.match(h.state.toasts[0],/Could not end/);}
 const h=harness({dispatch:async()=>{throw Error('private end transport');}});await h.handlers.endGroupOrder();assert.equal(h.state.groupBusy,false);assert.equal(h.state.cleared,0);assert.doesNotMatch(h.state.toasts[0],/private|transport/);
});
test('end dispatch is deduplicated and its stale receipt cannot clear another group',async()=>{
 const response=deferred(),h=harness({dispatch:()=>response.promise}),ending=h.handlers.endGroupOrder();await h.handlers.endGroupOrder();await waitFor(()=>h.state.calls.length===1);h.switchGroup();response.resolve({data:{group_id:'group-a',status:'cancelled'},error:null});await ending;assert.equal(h.S.groupOrder.groupId,'group-b');assert.equal(h.state.closed,0);assert.equal(h.state.cleared,0);assert.equal(h.state.toasts.length,0);
});
test('remove rejection preserves the shared/local item, and retries do not stick behind its lock',async()=>{
 let fail=true;const h=harness({dispatch:async()=>{if(fail)throw Error('private remove transport');return{data:null,error:null};}});await h.handlers.removeSharedItem(h.item);assert.equal(h.S.cart.lines.length,1);assert.equal(h.state.sharedItems.length,1);assert.equal(h.ctx.itemLocks.current.size,0);assert.match(h.state.toasts[0],/Could not remove/);assert.doesNotMatch(h.state.toasts[0],/private|transport/);fail=false;await h.handlers.removeSharedItem(h.item);assert.equal(h.S.cart.lines.length,0);assert.equal(h.state.sharedItems.length,0);
});
test('remove deduplicates same-tick taps and preserves a cart line edited during its response',async()=>{
 const response=deferred(),h=harness({dispatch:()=>response.promise}),removing=h.handlers.removeSharedItem(h.item);await h.handlers.removeSharedItem(h.item);await waitFor(()=>h.state.calls.length===1);h.S.cart.lines[0].q=4;response.resolve({data:null,error:null});await removing;assert.equal(h.state.calls.length,1);assert.equal(h.S.cart.lines[0].q,4);assert.equal(h.state.sharedItems.length,0);
});
test('late removal success cannot change a newly selected group or account',async()=>{
 for(const change of [h=>h.switchGroup(),h=>{h.S.accountId='account-b';}]){const response=deferred(),h=harness({dispatch:()=>response.promise}),removing=h.handlers.removeSharedItem(h.item);await waitFor(()=>h.state.calls.length===1);change(h);response.resolve({data:null,error:null});await removing;assert.equal(h.S.cart.lines.length,1);assert.equal(h.state.sharedItems.length,1);assert.equal(h.state.saved,0);assert.equal(h.state.toasts.length,0);}
});
test('shared preview rejection restores its busy state and duplicate checks issue one request',async()=>{
 const response=deferred(),h=harness({dispatch:()=>response.promise}),checking=h.handlers.reviewSharedOrder();await h.handlers.reviewSharedOrder();await waitFor(()=>h.state.calls.length===1);response.reject(Error('private shared-cart SQL'));await checking;assert.equal(h.state.previewBusy,false);assert.equal(h.ctx.previewLock.current,false);assert.equal(h.state.checkoutPreview,null);assert.equal(h.state.checkoutEstimate,null);assert.match(h.state.toasts[0],/Could not validate/);assert.doesNotMatch(h.state.toasts[0],/private|SQL/);
});
test('payment estimates reject malformed amounts and late estimates respect account, group and selection',async()=>{
 for(const amount of [false,true,[],{},'',Infinity,-1]){const h=harness({dispatch:async()=>({data:{group_id:'group-a',order_type:'pickup',subtotal:amount,delivery_fee:0,service_fee:0,estimated_total:10,currency:'USD'},error:null})});await h.handlers.selectGroupCheckoutType('pickup');assert.equal(h.state.checkoutEstimate,null);assert.match(h.state.toasts[0],/Could not calculate/);}
 for(const change of [h=>{h.S.accountId='account-b';},h=>h.switchGroup(),h=>{h.ctx.selection.current='another-address';}]){const response=deferred(),h=harness({dispatch:()=>response.promise}),estimating=h.handlers.selectGroupCheckoutType('pickup');await waitFor(()=>h.state.calls.length===1);change(h);response.resolve({data:{group_id:'group-a',order_type:'pickup',subtotal:10,delivery_fee:0,service_fee:0,estimated_total:10},error:null});await estimating;assert.equal(h.state.checkoutEstimate,null);assert.equal(h.state.toasts.length,0);}
});
test('delivery quote rejection releases loading and deduplicates same-tick callbacks',async()=>{
 const response=deferred(),h=harness({dispatch:()=>response.promise}),quoting=h.handlers.calculateGroupDeliveryQuote();await h.handlers.calculateGroupDeliveryQuote();await waitFor(()=>h.state.calls.length===1);response.reject(Error('private routing provider'));await quoting;assert.equal(h.state.calls.length,1);assert.equal(h.state.groupQuoteBusy,false);assert.equal(h.ctx.quoteLock.current,false);assert.equal(h.state.groupDeliveryQuote,null);assert.equal(h.state.checkoutEstimate,null);assert.match(h.state.toasts[0],/Could not calculate/);assert.doesNotMatch(h.state.toasts[0],/private|provider/);
});
test('malformed and stale delivery quotes never provide a payable quote',async()=>{
 for(const fee of [null,false,[],{},'',Infinity,-1]){const h=harness({dispatch:async()=>({data:{quote_id:'quote-a',fee,distance_km:1},error:null})});await h.handlers.calculateGroupDeliveryQuote();assert.equal(h.state.groupDeliveryQuote,null);assert.equal(h.state.groupQuoteBusy,false);assert.match(h.state.toasts[0],/Could not calculate/);}
 for(const change of [h=>{h.S.accountId='account-b';},h=>{h.S.groupOrder={...h.S.groupOrder,groupId:'group-b'};},h=>{h.ctx.selection.current='new-selection';}]){const response=deferred(),h=harness({dispatch:()=>response.promise}),quoting=h.handlers.calculateGroupDeliveryQuote();await waitFor(()=>h.state.calls.length===1);change(h);response.resolve({data:{quote_id:'quote-a',fee:1,distance_km:1},error:null});await quoting;assert.equal(h.state.groupDeliveryQuote,null);assert.equal(h.state.calls.length,1);assert.equal(h.state.toasts.length,0);}
});
test('checkout rejects malformed receipts without clearing a paid cart or reporting success',async()=>{
 for(const data of [null,{}, {id:'order-a'}, {id:'order-a',status:'unknown'}]){const h=harness({dispatch:async()=>({data,error:null})});await h.handlers.checkoutGroupOrder();assert.equal(h.S.cart.lines.length,1);assert.equal(h.state.cleared,0);assert.equal(h.state.closed,0);assert.equal(h.state.groupCheckoutBusy,false);assert.ok(!h.state.toasts.some(message=>/Group order placed/.test(message)));}
});
test('checkout deduplicates transport calls and late receipts cannot clear the next account or group cart',async()=>{
 for(const change of [h=>{h.S.accountId='account-b';},h=>{h.S.groupOrder={...h.S.groupOrder,groupId:'group-b'};}]){const response=deferred(),h=harness({dispatch:()=>response.promise}),placing=h.handlers.checkoutGroupOrder();await h.handlers.checkoutGroupOrder();await waitFor(()=>h.state.calls.length===1);change(h);h.S.cart.lines=[{k:'new-line',q:2}];response.resolve({data:{id:'order-a',order_code:'ORDER-A',status:'placed'},error:null});await placing;assert.equal(h.state.calls.length,1);assert.equal(h.S.cart.lines[0].k,'new-line');assert.equal(h.state.cleared,0);assert.equal(h.state.closed,0);assert.equal(h.state.toasts.length,0);}
});
test('rejected checkout transport restores busy state without success or raw provider details',async()=>{
 const h=harness({dispatch:async()=>{throw Error('private wallet RPC token');}});await h.handlers.checkoutGroupOrder();assert.equal(h.state.groupCheckoutBusy,false);assert.equal(h.ctx.groupCheckoutLock.current,false);assert.equal(h.S.cart.lines.length,1);assert.equal(h.state.cleared,0);assert.equal(h.state.closed,0);assert.match(h.state.toasts[0],/Could not complete/);assert.doesNotMatch(h.state.toasts[0],/private|RPC|token/);
});
test('successful checkout preserves the submitted cart line if it changed before the receipt',async()=>{
 const response=deferred(),h=harness({dispatch:()=>response.promise}),placing=h.handlers.checkoutGroupOrder();await waitFor(()=>h.state.calls.length===1);h.S.cart.lines[0].q=3;response.resolve({data:{id:'order-a',order_code:'ORDER-A',status:'placed'},error:null});await placing;assert.equal(h.S.cart.lines[0].q,3);assert.equal(h.state.cleared,1);assert.equal(h.state.closed,1);assert.match(h.state.toasts[0],/Group order placed/);assert.equal(h.state.groupCheckoutBusy,false);
});
function storeHarness({dispatch}={}){const group={groupId:'group-a',serverBacked:true,expiresAt:'2099-01-01T00:00:00Z'},S={accountId:'account-a',groupOrder:group},state={clears:0,calls:[],toasts:[],logs:[]};const transport=async(name,args)=>{state.calls.push({name,args});return dispatch?dispatch(name,args):{data:{group_id:'group-a',status:'open',expires_at:'2099-01-01T00:00:00Z'},error:null};};const context={S,label,clearActiveGroup:()=>{state.clears++;S.groupOrder=null;},toast:text=>state.toasts.push(text),console:{warn:(...values)=>state.logs.push(values.join(' '))},supabase:{auth:{getUser:async()=>({data:{user:{id:S.accountId}},error:null})},rpc:transport},removeGroupOrderCartLine:(id,key)=>transport('remove',{id,key}),syncGroupOrderCartLine:(id,line)=>transport('upsert',{id,line})};const handlers=evaluate(declarations(storeFile,['validateActiveGroup','syncActiveGroup'])+'\nmodule.exports={validateActiveGroup,syncActiveGroup};',context);return{S,state,handlers};}
test('stale group validation responses and permission errors cannot clear a new account or group',async()=>{
 for(const change of [h=>{h.S.accountId='account-b';},h=>{h.S.groupOrder={groupId:'group-b',serverBacked:true};}])for(const reply of [{data:null,error:null},{data:null,error:{code:'42501',message:'private policy'}}]){const response=deferred(),h=storeHarness({dispatch:()=>response.promise}),validating=h.handlers.validateActiveGroup();await waitFor(()=>h.state.calls.length===1);change(h);const selected=h.S.groupOrder;response.resolve(reply);await validating;assert.equal(h.S.groupOrder,selected);assert.equal(h.state.clears,0);assert.equal(h.state.logs.length,0);}
});
test('stale sync validation never dispatches a cart mutation and late sync failures stay with their owner',async()=>{
 const response=deferred(),h=storeHarness({dispatch:()=>response.promise}),syncing=h.handlers.syncActiveGroup({removeKey:'line-a'});await waitFor(()=>h.state.calls.length===1);h.S.groupOrder={groupId:'group-b',serverBacked:true};response.resolve({data:{group_id:'group-a',status:'open',expires_at:'2099-01-01T00:00:00Z'},error:null});await syncing;assert.equal(h.state.calls.length,1);assert.equal(h.state.toasts.length,0);
 const mutation=deferred(),late=storeHarness({dispatch:async name=>name==='goodies_group_order_get_status'?{data:{group_id:'group-a',status:'open',expires_at:'2099-01-01T00:00:00Z'},error:null}:mutation.promise}),pending=late.handlers.syncActiveGroup({removeKey:'line-a'});await waitFor(()=>late.state.calls.length===2);late.S.accountId='account-b';mutation.reject(Error('private failure'));await pending;assert.equal(late.state.toasts.length,0);assert.equal(late.state.logs.length,0);
});
test('temporary validation failures retain the known group without logging raw errors',async()=>{
 for(const dispatch of [async()=>{throw Error('private group token');},async()=>({data:null,error:{code:'temporary',message:'private SQL'}})]){const h=storeHarness({dispatch}),saved=h.S.groupOrder;assert.equal(await h.handlers.validateActiveGroup(),true);assert.equal(h.S.groupOrder,saved);assert.equal(h.state.clears,0);assert.equal(h.state.logs.length,0);}
});
test('ScheduleSheet formats dates with the selected account language and customer time zone',()=>{
 const wantissLocale=evaluate(declarations('src/lib/locales.ts',['wantissLocale'])+'\nmodule.exports=wantissLocale;',{WANTISS_LANGUAGES:[{code:'en',label:'English'},{code:'fr',label:'Français'},{code:'ht',label:'Kreyòl Ayisyen'},{code:'es',label:'Español'},{code:'zh-Hans',label:'简体中文'}]});
 for(const [selected,expected]of [['fr','fr'],['Español','es'],['zh-Hans','zh-Hans'],['ht','fr-HT']]){const formats=[],formatter=evaluate('module.exports='+expression('ScheduleSheet','formatCustomer')+';',{S:{lang:selected},customerZone:'America/Port-au-Prince',wantissLocale,Intl:{DateTimeFormat:function(locale,options){formats.push({locale,options});return{format:()=> 'formatted'};}}});assert.equal(formatter(Date.UTC(2026,10,20),{weekday:'short'}),'formatted');assert.equal(formats[0].locale,expected);assert.equal(formats[0].options.timeZone,'America/Port-au-Prince');}
});


test('group Wallet checkout only accepts an exact USD quote with cent-consistent totals',async()=>{
 const h=harness(),base={group_id:'group-a',order_type:'pickup',subtotal:10,delivery_fee:2,service_fee:1,estimated_total:13,currency:'USD'};
 assert.equal(h.handlers.validEstimate(base),true);
 for(const change of [
  {currency:'PHP'},{currency:''},{currency:null},{estimated_total:13.001},
  {estimated_total:12.99},{subtotal:10.005},{delivery_fee:'2oops'},
  {service_fee:-1},{estimated_total:Infinity},
 ]){
  assert.equal(h.handlers.validEstimate({...base,...change}),false,JSON.stringify(change));
 }
 h.ctx.checkoutEstimate={...base,currency:'PHP'};
 await h.handlers.checkoutGroupOrder();
 assert.equal(h.state.calls.some(x=>x.name==='goodies_group_order_checkout'),false,'No USD Wallet checkout for a mismatched currency quote');
});
