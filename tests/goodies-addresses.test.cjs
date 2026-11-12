const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const file='src/screens/Main/mainAddressesScreen.tsx',source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);
let action;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='load')action=n.initializer.arguments[0].getText(source);ts.forEachChild(n,visit);}visit(source);
function loadAddresses({failure=false,paused=false}={}){
 let release;const waiting=paused?new Promise(r=>release=r):Promise.resolve();
 const state={rows:[{id:'cached-a'}],numbers:[{id:'cached-number'}],problem:'',loading:false,address:''},loadGeneration={current:0},owner={current:'a'};
 const client={auth:{getUser:async()=>({data:{user:{id:'a',user_metadata:{goodies_default_address_id:'default-a'}}}})},from:table=>{const query={select(){return this;},eq(){return this;},order(){return this;},then(resolve,reject){return waiting.then(()=>failure?{error:{message:'private table SQLSTATE 42501 connection token'}}:{data:table==='user_addresses'?[{id:'address-a'}]:[{id:'number-a'}]}).then(resolve,reject);}};return query;}};
 const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports='+action,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,cmsLabel:(_id,text)=>text,supabase:client,loadGeneration,owner,setLoading:v=>state.loading=v,setLoadProblem:v=>state.problem=v,setRows:v=>state.rows=v,setGoodiesNumbers:v=>state.numbers=v,setGoodiesAddressId:v=>state.address=v});
 return {run:module.exports,state,owner,loadGeneration,release:()=>release()};
}
test('shared account addresses load real addresses and Goodies numbers for the authenticated owner',async()=>{
 const h=loadAddresses();await h.run();assert.deepEqual(h.state.rows,[{id:'address-a'}]);assert.deepEqual(h.state.numbers,[{id:'number-a'}]);assert.equal(h.state.address,'default-a');assert.equal(h.state.problem,'');assert.equal(h.state.loading,false);
});
test('failed address reads preserve owned snapshots and show a safe retry state instead of a fabricated empty result',async()=>{
 const h=loadAddresses({failure:true});await h.run();assert.deepEqual(h.state.rows,[{id:'cached-a'}]);assert.deepEqual(h.state.numbers,[{id:'cached-number'}]);assert.match(h.state.problem,/Please retry/);assert.doesNotMatch(h.state.problem,/private|SQLSTATE|token/);assert.equal(h.state.loading,false);
});
test('late address responses cannot replace another account after logout or switching accounts',async()=>{
 const h=loadAddresses({paused:true}),request=h.run();await new Promise(r=>setImmediate(r));h.owner.current='b';h.loadGeneration.current++;h.state.rows=[{id:'address-b'}];h.state.numbers=[{id:'number-b'}];h.release();await request;assert.deepEqual(h.state.rows,[{id:'address-b'}]);assert.deepEqual(h.state.numbers,[{id:'number-b'}]);
});
