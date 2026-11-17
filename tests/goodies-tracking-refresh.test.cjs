const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleScope={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/Goodies/refreshScope.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:moduleScope.exports});
const {createGoodiesRefresh}=moduleScope.exports;
function harness(){const requests=[],rows=[],states=[];let owned=true;return {requests,rows,states,invalidate(){owned=false;},scope:createGoodiesRefresh({current:()=>owned,read:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),commit:value=>rows.push(value),state:value=>states.push(value)})};}
test('out-of-order tracking responses cannot roll a newer delivery status back',async()=>{
 const h=harness(),old=h.scope.refresh(),current=h.scope.refresh();h.requests[1].resolve('delivered');await current;h.requests[0].resolve('picked_up');await old;assert.deepEqual(h.rows,['delivered']);assert.equal(h.states.at(-1),'ready');
});
test('failed tracking reads show error and a later retry recovers without inventing an empty result',async()=>{
 const h=harness(),failed=h.scope.refresh();h.requests[0].reject(Error('private server detail'));await failed;assert.deepEqual(h.rows,[]);assert.equal(h.states.at(-1),'error');const retry=h.scope.refresh();h.requests[1].resolve('real-order');await retry;assert.deepEqual(h.rows,['real-order']);assert.equal(h.states.at(-1),'ready');
});
test('late failures from superseded tracking reads cannot replace a successful refresh',async()=>{
 const h=harness(),old=h.scope.refresh(),current=h.scope.refresh();h.requests[1].resolve('delivered');await current;h.requests[0].reject(Error('offline'));await old;assert.equal(h.states.at(-1),'ready');
});
test('account changes and unmounted tracking screens discard late reads and do not start new reads',async()=>{
 for(const end of [h=>h.invalidate(),h=>h.scope.stop()]){const h=harness(),pending=h.scope.refresh();end(h);h.requests[0].resolve('private-order');await pending;await h.scope.refresh();assert.deepEqual(h.rows,[]);assert.equal(h.requests.length,1);}
});
