const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript');
function languageHarness(){
 let state,authListener,foreground,effect,interval,cleanupCount=0;const cache=new Map(),calls=[];let user='A',fail=false;const settings={A:'Français',B:'简体中文'};let pending=null;
 const modules=new Map();function load(file){file=path.resolve(__dirname,'..',file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports','setInterval','clearInterval',js)(name=>{
  if(name==='react')return {useEffect:fn=>{effect=fn;},useRef:x=>({current:x}),useState:x=>{state=x;return [x,value=>{state=typeof value==='function'?value(state):value;}];}};
  if(name==='react-native')return {AppState:{currentState:'active',addEventListener:(_event,fn)=>{foreground=fn;return {remove:()=>{cleanupCount++;}};}}};
  if(name==='@react-native-async-storage/async-storage')return {__esModule:true,default:{getItem:async key=>cache.get(key)??null,setItem:async(key,value)=>{cache.set(key,value);}}};
  if(name.endsWith('/supabase'))return {supabase:{auth:{getUser:async()=>({data:{user:{id:user}},error:null}),onAuthStateChange:fn=>{authListener=fn;return {data:{subscription:{unsubscribe:()=>{cleanupCount++;}}}};}},from:()=>({select(){return this;},eq(_key,value){this.owner=value;return this;},async maybeSingle(){return {data:{language:settings[this.owner]},error:null};}}),channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:async()=>{cleanupCount++;}}};
  if(name.endsWith('/wantissCms'))return {fetchPublishedWantissContent:async locale=>{calls.push(locale);if(pending&&pending.locale===locale)return pending.promise;if(fail)throw Error('offline');return {assets:[],content:[{content_key:'konsoliss.content',locale,version:1,payload:{v:1,labels:{'home.brand':'Language '+locale}}}]};}};
  if(name.startsWith('.'))return load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),name+'.ts')));
  throw Error(name);
 },m,m.exports,fn=>{interval=fn;return 1;},()=>{cleanupCount++;});return m.exports;}
 load('src/screens/Konsoliss/useKonsolissCopy.ts').useKonsolissHomepageContent();const cleanup=effect();
 return {state:()=>state,calls,cache,foreground:()=>foreground('active'),refresh:()=>interval(),switchAccount:next=>{user=next;authListener('SIGNED_IN',{user:{id:user}});},offline:()=>{fail=true;},defer:locale=>{let resolve;const promise=new Promise(done=>{resolve=done;});pending={locale,promise};return data=>{pending=null;resolve(data);};},cleanup,cleanupCount:()=>cleanupCount};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,1));
test('homepage loads the account-selected locale and retains last verified public copy on refresh failure',async()=>{
 const hook=languageHarness();await tick();await tick();assert.equal(hook.state().locale,'fr');assert.equal(hook.state().copy['home.brand'],'Language fr');assert.deepEqual(hook.calls,['fr','en']);
 hook.offline();hook.foreground();await tick();assert.equal(hook.state().status,'unavailable');assert.equal(hook.state().copy['home.brand'],'Language fr');hook.cleanup();assert.equal(hook.cleanupCount(),4);
});
test('account switching immediately clears prior locale and ignores an older CMS response',async()=>{
 const hook=languageHarness();await tick();const finish=hook.defer('fr');hook.refresh();await tick();hook.switchAccount('B');assert.equal(hook.state().accountId,'B');assert.equal(hook.state().copy['home.brand'],'Konsoliss');await tick();await tick();assert.equal(hook.state().locale,'zh-Hans');
 finish({assets:[],content:[{content_key:'konsoliss.content',locale:'fr',version:99,payload:{v:1,labels:{'home.brand':'STALE'}}}]});await tick();assert.equal(hook.state().copy['home.brand'],'Language zh-Hans');hook.cleanup();
});
