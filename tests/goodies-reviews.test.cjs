/* Exercises the real review hook with deterministic hook scheduling and deferred RPC responses. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {test}=require('node:test');
const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/features/Goodies/reviews.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const row=(id)=>({order_id:id,rating:5,comment:id,created_at:'2026-11-06T00:00:00Z',is_mine:true});
function harness(){
 const slots=[],requests=[],state={S:{accountId:'customer-a',lang:'en'},STB:{},emit(){}},effects=[];let cursor=0,store='a';
 const equal=(a,b)=>a&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
 const react={
  useState(initial){const i=cursor++;slots[i]??={value:typeof initial==='function'?initial():initial};return[slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}];},
  useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},
  useCallback(fn,deps){const i=cursor++;if(!slots[i]||!equal(slots[i].deps,deps))slots[i]={deps,value:fn};return slots[i].value;},
  useEffect(fn,deps){const i=cursor++;if(!slots[i]||!equal(slots[i].deps,deps)){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn();});}},
 };
 const module={exports:{}};function req(id){if(id==='react')return react;if(id.endsWith('/store'))return state;if(id.endsWith('/content'))return {label:(_id,fallback)=>fallback};if(id.endsWith('/supabase'))return {supabase:{rpc:(name,args)=>new Promise(resolve=>requests.push({name,args,resolve}))}};throw Error(id);}
 vm.runInThisContext('(function(require,module,exports){'+code+'})')(req,module,module.exports);
 function render(next=store){store=next;cursor=0;const result=module.exports.useStoreReviews(store);effects.splice(0).forEach(fn=>fn());return result;}
 return{state,requests,render,view(next){render(next);return render();},notify:module.exports.notifyStoreReviewsChanged,unmount(){slots.forEach(slot=>slot.cleanup?.());}};
}
test('a failed store switch never reveals the previous store review rows',async()=>{
 const h=harness();h.view('a');h.requests[0].resolve({data:[row('a-review')],error:null});await tick();assert.equal(h.view().rows[0].t,'a-review');
 assert.deepEqual(h.view('b').rows,[]);h.requests[1].resolve({data:null,error:{message:'private SQL detail'}});await tick();
 const result=h.view();assert.equal(result.error,true);assert.equal(result.loading,false);assert.deepEqual(result.rows,[]);h.unmount();
});
test('account switches hide cached rows and ignore requests from the previous account',async()=>{
 const h=harness();h.view();h.requests[0].resolve({data:[row('private-old')],error:null});await tick();h.view().reload();
 h.state.S.accountId='customer-b';assert.deepEqual(h.view().rows,[]);
 h.requests[1].resolve({data:[row('late-old')],error:null});await tick();assert.deepEqual(h.view().rows,[]);assert.equal(h.view().loading,true);
 h.requests[2].resolve({data:[row('new')],error:null});await tick();assert.equal(h.view().rows[0].t,'new');h.unmount();
});
test('review save refresh is scoped to its store and queues a refresh behind an in-flight page',async()=>{
 const h=harness();h.view();h.notify('another-store');assert.equal(h.requests.length,1);
 h.notify('a');h.requests[0].resolve({data:[row('before-save')],error:null});await tick();assert.equal(h.requests.length,2);assert.equal(h.view().loading,true);
 h.requests[1].resolve({data:[row('saved-review')],error:null});await tick();assert.equal(h.view().rows[0].t,'saved-review');
 h.unmount();h.notify('a');assert.equal(h.requests.length,2);
});
test('pagination retries retain the offset and reload replaces rather than appends',async()=>{
 const h=harness();h.view();h.requests[0].resolve({data:Array.from({length:20},(_,i)=>row('first-'+i)),error:null});await tick();assert.equal(h.view().hasMore,true);
 h.view().more();h.view().more();assert.equal(h.requests.length,2);assert.equal(h.requests[1].args.p_offset,20);
 h.requests[1].resolve({data:null,error:{message:'offline'}});await tick();assert.equal(h.view().error,true);assert.equal(h.view().rows.length,20);
 h.view().more();assert.equal(h.requests[2].args.p_offset,20);h.requests[2].resolve({data:[row('older')],error:null});await tick();assert.equal(h.view().rows.length,21);
 h.view().reload();assert.equal(h.requests[3].args.p_offset,0);h.requests[3].resolve({data:[row('updated')],error:null});await tick();assert.equal(h.view().rows.length,1);assert.equal(h.view().hasMore,false);h.unmount();
});
test('malformed successful responses are errors rather than false empty review states',async()=>{
 const h=harness();h.view();h.requests[0].resolve({data:{unexpected:true},error:null});await tick();assert.equal(h.view().error,true);assert.deepEqual(h.view().rows,[]);h.unmount();
});

test('server review hydration restores comments and clears obsolete cached ratings without mixing orders',()=>{
 const file=path.resolve(__dirname,'../src/features/Goodies/orderReviews.ts'),module={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext('(function(module,exports){'+compiled+'})')(module,module.exports);
 const orders=[{backendId:'first',rated:1,orderReview:{t:'obsolete'}},{backendId:'second'},{backendId:'none',rated:4,driverRated:2,orderReview:{t:'removed'},driverReview:{t:'removed'}}];
 module.exports.applyOrderReviews(orders,[{...row('first'),target:'store',comment:'Saved order comment'},{...row('second'),target:'driver',rating:3,comment:'Saved driver comment'}],'ht');
 assert.equal(orders[0].rated,5);assert.equal(orders[0].orderReview.t,'Saved order comment');assert.equal(orders[0].driverReview,undefined);
 assert.equal(orders[1].driverRated,3);assert.equal(orders[1].driverReview.t,'Saved driver comment');assert.equal(orders[1].orderReview,undefined);
 assert.equal(orders[2].rated,0);assert.equal(orders[2].driverRated,0);assert.equal(orders[2].orderReview,undefined);assert.equal(orders[2].driverReview,undefined);
});


test('successful review save refreshes server rating totals and failures never fabricate zero ratings',async()=>{
 const h=harness();h.state.STB.a={businessId:'business-a',r:4,rv:2,ratingsAvailable:true};
 const done=h.notify('a');assert.equal(h.requests[0].name,'goodies_store_review_summaries');
 h.requests[0].resolve({data:[{business_id:'business-a',rating:'4.5',review_count:'3'}],error:null});await done;
 assert.equal(h.state.STB.a.r,4.5);assert.equal(h.state.STB.a.rv,3);assert.equal(h.state.STB.a.ratingsAvailable,true);
 const failed=h.notify('a');h.requests[1].resolve({data:null,error:{message:'internal database details'}});await failed;
 assert.equal(h.state.STB.a.ratingsAvailable,false);assert.equal(h.state.STB.a.rv,3);
 const malformed=h.notify('a');h.requests[2].resolve({data:[{business_id:'business-a',rating:'not-a-number',review_count:1}],error:null});await malformed;assert.equal(h.state.STB.a.ratingsAvailable,false);assert.equal(h.state.STB.a.r,4.5);
});
