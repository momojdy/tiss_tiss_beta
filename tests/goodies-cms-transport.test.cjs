const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function service(invoke){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/wantissCms.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>{assert.equal(name,'./supabase');return{supabase:{functions:{invoke}}};}});return module.exports;}
test('published CMS transport accepts the deployed five-field record and preserves the requested locale',async()=>{
 const record={content_key:'goodies.content',locale:'en',version:5,payload:{v:5,labels:[]},updated_at:'2026-11-20T00:00:00Z'},calls=[];
 const api=service(async(name,args)=>{calls.push({name,args});return{data:{content:[record],assets:[]},error:null};}),result=await api.fetchPublishedWantissContent('en');
 assert.equal(result.content[0],record);assert.equal(calls[0].name,'wantiss-public-content');assert.equal(calls[0].args.body.locale,'en');assert.equal(result.content[0].status,undefined,'The client must not fabricate server metadata');
});
test('malformed successful CMS responses reject instead of pretending the published catalogue is empty',async()=>{
 for(const data of [null,{},[],{content:[],assets:null},{content:{},assets:[]}])await assert.rejects(service(async()=>({data,error:null})).fetchPublishedWantissContent(),/Published content is unavailable right now/);
 const empty=await service(async()=>({data:{content:[],assets:[]},error:null})).fetchPublishedWantissContent();assert.equal(empty.content.length,0);assert.equal(empty.assets.length,0);
});
test('CMS transport exceptions and backend failures expose only the safe application message',async()=>{
 for(const invoke of [async()=>{throw Error('private SQL server and token');},async()=>({data:null,error:Error('private schema and credentials')})])await assert.rejects(service(invoke).fetchPublishedWantissContent(),error=>{assert.equal(error.message,'Published content is unavailable right now.');return true;});
});
