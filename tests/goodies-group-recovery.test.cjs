const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/Goodies/groupRecovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,Date,Number,RegExp,Error});
const {fetchOpenHostedGoodiesGroup}=mod.exports;
const id='00000000-0000-4000-8000-000000000012';
function harness({user='owner',row={id,invite_code:'ABC12345',store_id:'vendor-store',expires_at:'2099-01-01T00:00:00Z'},error=null}={}){
 const clauses=[];
 const chain={select(v){clauses.push(['select',v]);return this;},eq(k,v){clauses.push(['eq',k,v]);return this;},gt(k,v){clauses.push(['gt',k,v]);return this;},order(k,o){clauses.push(['order',k,o]);return this;},limit(n){clauses.push(['limit',n]);return this;},async maybeSingle(){return{data:row,error};}};
 return {clauses,client:{auth:{getUser:async()=>({data:{user:{id:user}},error:null})},from(table){clauses.push(['table',table]);return chain;}}};
}
test('returning Goodies host resumes only their open group from RLS-scoped server state',async()=>{
 const h=harness(),result=await fetchOpenHostedGoodiesGroup(h.client,'owner',Date.parse('2026-11-20T00:00:00Z'));
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{id,code:'ABC12345',storeId:'vendor-store',expiresAt:'2099-01-01T00:00:00Z'});
 assert.ok(h.clauses.some(x=>x[0]==='eq'&&x[1]==='host_user_id'&&x[2]==='owner'));
 assert.ok(h.clauses.some(x=>x[0]==='eq'&&x[1]==='status'&&x[2]==='open'));
 assert.ok(h.clauses.some(x=>x[0]==='gt'&&x[1]==='expires_at'));
 assert.ok(h.clauses.some(x=>x[0]==='limit'&&x[1]===1));
});
test('group recovery never searches private groups under another account',async()=>{
 const h=harness({user:'other'});
 await assert.rejects(fetchOpenHostedGoodiesGroup(h.client,'owner'),/Group account unavailable/);
 assert.equal(h.clauses.length,0);
});
test('hosted recovery ignores absent groups and rejects stale or malformed responses',async()=>{
 assert.equal(await fetchOpenHostedGoodiesGroup(harness({row:null}).client,'owner'),null);
 for(const row of [{id,invite_code:'ABC12345',store_id:'vendor-store',expires_at:'2020-01-01T00:00:00Z'},
 {id:'bad',invite_code:'ABC12345',store_id:'vendor-store',expires_at:'2099-01-01T00:00:00Z'},
 {id,invite_code:'%BAD',store_id:'vendor-store',expires_at:'2099-01-01T00:00:00Z'}]){
  await assert.rejects(fetchOpenHostedGoodiesGroup(harness({row}).client,'owner'),/Hosted group unavailable/);
 }
 await assert.rejects(fetchOpenHostedGoodiesGroup(harness({error:{message:'private DB detail'}}).client,'owner'),/Could not check hosted group/);
});
test('host screen only starts server recovery when no invite or selected group is present',()=>{
 const src=fs.readFileSync('src/features/Goodies/components/Sheets.tsx','utf8');
 assert.match(src,/if\(group\.serverBacked\|\|incomingInviteCode\|\|inviteCode\.trim\(\)\)return/);
 assert.match(src,/!active\|\|!recovered\|\|!current\(owner,''\)\|\|groupActionLock\.current/);
});
