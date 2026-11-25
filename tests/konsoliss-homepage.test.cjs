const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript');
const cache=new Map();function load(file){file=path.resolve(__dirname,'..',file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),name+'.ts'))):require(name),m,m.exports);return m.exports;}
const {KONSOLISS_COPY_DEFAULTS:defaults,KONSOLISS_LOCALES:locales}=load('src/screens/Konsoliss/cms/catalog.ts');const {publicationErrors,resolveHomepage,formatCopy,estimateCbm,contentKeyForText}=load('src/screens/Konsoliss/cms/model.ts');
const payload={v:2,labels:{...defaults},reviewed:Object.keys(defaults),images:{}};
test('five locales resolve their own published row, English fallback and no drafts',()=>{
 for(const locale of locales){const records=[{content_key:'konsoliss.content',locale:'en',version:99,status:'published',payload},{content_key:'konsoliss.content',locale,version:1,status:'published',payload:{...payload,labels:{...defaults,'home.brand':'Language '+locale}}},{content_key:'konsoliss.content',locale,version:100,status:'draft',payload:{...payload,labels:{...defaults,'home.brand':'DRAFT'}}}];const found=resolveHomepage(records,locale);assert.equal(found.copy['home.brand'],locale==='en'?defaults['home.brand']:'Language '+locale);assert.notEqual(found.copy['home.brand'],'DRAFT');}
 assert.deepEqual(publicationErrors(payload),[]);assert.ok(!Object.hasOwn(defaults,'home.containerTotalsHint'));assert.ok(!fs.readFileSync(path.resolve(__dirname,'../src/screens/Konsoliss/konsolissHomeScreen.tsx'),'utf8').includes("copy['home.containerTotalsHint']"));
});
test('translation publication requires review and immutable placeholder names',()=>{
 assert.match(publicationErrors({...payload,reviewed:[]})[0],/review/);
 assert.match(publicationErrors({...payload,labels:{...defaults,'home.filled':'100% filled'}}).join(' '),/placeholders/);
 assert.equal(formatCopy(defaults,'home.filled',{percent:'76%'}),'76% filled');
 assert.equal(contentKeyForText(defaults,'Estimated volume: 0.02 CBM'),'calc.estimate');
 assert.ok(publicationErrors({...payload,images:{'how.1':'https://unreviewed.example/image.png'}}).length);
});
test('CBM calculator rejects malformed, negative, infinite and noninteger inputs',()=>{
 assert.equal(estimateCbm('20','20','50','1'),0.02);assert.equal(estimateCbm('10,5','10','10','2'),0.0021);
 for(const args of [['-1','10','10','1'],['10x','10','10','1'],['10','10','10','1.5'],['0','10','10','1'],['','10','10','1']])assert.equal(estimateCbm(...args),null);
});
const harness=require('./helpers/konsoliss-runtime.cjs');
test('homepage bottom navigation and formerly inactive cards execute real handlers',()=>{
 const app=harness();app.click(app.buttons('Home').at(-1));assert.ok(app.events.some(e=>e.scroll?.y===0));
 app.click(app.buttons('Warehouse').at(-1));assert.match(app.text(),/Warehouse cargo/);assert.match(app.text(),/0.2 CBM sent/);
 app.click(app.buttons('Back').at(-1));app.click(app.buttons('Sourcing+').at(-1));assert.match(app.text(),/Sourcing request/);
 app.click(app.buttons('Back').at(-1));app.click(app.buttons('Hub').at(-1));assert.ok(app.buttons('Messages').length);app.click(app.buttons('Messages')[0]);assert.ok(app.events.includes('messages'));
 app.click(app.buttons('Load ItemsMove warehouse goods')[0]);assert.match(app.text(),/Cargo handling/);
});
test('Konsoliss help submits one confirmed ticket; errors preserve drafts',async()=>{
 for(const failure of [false,true]){const app=harness({supportFails:failure});app.click(app.buttons('Hub').at(-1));app.click(app.buttons('Help Center')[0]);app.type('Subject','Cargo question');app.type('Message','Please check container KS-TEST.');app.click(app.buttons('Send request')[0]);await new Promise(setImmediate);app.update();assert.equal(app.events.filter(e=>e?.subject==='Cargo question').length,1);if(failure){assert.match(app.text(),/could not be confirmed/);assert.equal(app.find('Subject')[0].props.value,'Cargo question');assert.equal(app.find('Message')[0].props.value,'Please check container KS-TEST.');}else assert.match(app.text(),/Request received: TEST-TICKET/);}
});
test('unverified occupancy stays unavailable and unassigned state never invents warehouse quantities',()=>{
 assert.match(harness({unverified:true}).text(),/Verified container measurements are not available yet/);
 const failed=harness({failed:true});assert.match(failed.text(),/Container unavailable/);assert.doesNotMatch(failed.text(),/No container assigned to your account/);
 assert.equal(harness({empty:true,assignmentUnavailable:true}).webviews().length,0);
 const empty=harness({empty:true});assert.equal(empty.webviews().length,1);assert.match(empty.text(),/Warehouse volume not yet recorded/);assert.doesNotMatch(empty.text(),/No goods sent yet/);
});

test('support service requires authentication and confirms ambiguous inserts against the same owned UUID',async()=>{
 const source=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/screens/Konsoliss/supportApi.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 function service({user=true,insertError=false,readError=false}={}){const calls=[];const client={auth:{getUser:async()=>({data:{user:user?{id:'owner',email:'owner@example.test'}:null},error:null})},from(table){calls.push({table});const b={insert(payload){calls.push({insert:payload});return b;},select(){return b;},eq(key,value){calls.push({key,value});return b;},single:async()=>insertError?{error:{message:'response lost'},data:null}:{data:{ticket_code:'SUP-OK'},error:null},maybeSingle:async()=>readError?{data:null,error:{message:'offline'}}:{data:{ticket_code:'SUP-COMMITTED'},error:null}};return b;}};const m={exports:{}};new Function('require','module','exports',source)(()=>({supabase:client}),m,m.exports);return {send:m.exports.sendKonsolissSupport,calls};}
 const missing=service({user:false});await assert.rejects(missing.send('id','S','M'),/Authentication/);assert.equal(missing.calls.length,0);
 const success=service();assert.equal(await success.send('same-id',' Subject ',' Message '),'SUP-OK');assert.deepEqual(success.calls[1].insert,{id:'same-id',user_id:'owner',email:'owner@example.test',subject:'[Konsoliss] Subject',message:'Message'});
 const retry=service({insertError:true});assert.equal(await retry.send('same-id','S','M'),'SUP-COMMITTED');assert.ok(retry.calls.some(call=>call.key==='id'&&call.value==='same-id'));assert.ok(retry.calls.some(call=>call.key==='user_id'&&call.value==='owner'));
 await assert.rejects(service({insertError:true,readError:true}).send('id','S','M'),/did not confirm/);
});

test('reserved CBM with no loaded cargo gets an illustrative 3D preview, not the empty demo or fake physical fill',()=>{
 const purchased=harness({reservedOnly:true});
 const webviews=purchased.webviews();
 assert.equal(webviews.length,1);
 const html=webviews[0].props.source.html;
 assert.match(html,/data-preview="true"/);
 assert.match(html,/data-empty="false"/);
 assert.match(html,/data-reserved="1"/);
 assert.match(html,/data-loaded="0"/);
 assert.match(html,/Space preview: /);
 assert.match(purchased.text(),/No goods sent yet/);
 assert.match(purchased.text(),/0.0.*1.0 CBM/);
 const empty=harness({empty:true});
 const emptyHtml=empty.webviews()[0].props.source.html;
 assert.match(emptyHtml,/data-preview="false"/);
 assert.match(emptyHtml,/data-empty="true"/);
});

test('real loaded-mode 3D animation does not increase real loaded volume or convert reservations into solid red cartons',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../src/screens/Konsoliss/konsolissHomeScreen.tsx'),'utf8');
 const line=source.split('\n').find(row=>row.includes('"let demoCount=0,demoBlink=false'));
 assert.ok(line,'renderer main script found');
 const script=JSON.parse(line.trim().replace(/,$/,''));
 assert.doesNotThrow(()=>new Function(script));
 assert.match(script,/if\(PREVIEW&&RESERVED>0&&LOADED===0&&RESERVED<=68\)/);
 assert.match(script,/else if\(!EMPTY&&YOUR_LOADED>0\)/);
 assert.match(script,/if\(EMPTY\)\{const started=Date\.now\(\)/);
});

test('assigned customer with zero physically loaded CBM sees reservation animation without rewriting genuine other-cargo occupancy',()=>{
 const app=harness({assignedZero:true}),views=app.webviews();
 assert.equal(views.length,1);
 const html=views[0].props.source.html;
 assert.match(html,/data-preview="true"/);
 assert.match(html,/data-empty="false"/);
 assert.match(html,/data-reserved="1"/);
 assert.match(html,/data-loaded="25"/);
 assert.match(html,/data-your-loaded="0"/);
 assert.match(app.text(),/0.0.*1.0 CBM/);
});

test('demo selector is preview-only; real data hooks never query a demo container (full scenario coverage: konsoliss-preview-states.test.cjs)',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../src/screens/Konsoliss/konsolissHomeScreen.tsx'),'utf8');
 assert.match(source,/useKonsolissContainerOccupancy\(!isDemo&&selectedContainer/);
 assert.match(source,/const containerOccupancy=isDemo\?/);
 assert.match(source,/const progress=displayLoadState.kind==='recorded'/);
 assert.match(source,/pointerEvents=\{isDemo\?'none':'auto'\}/);
 const app=harness();app.click(app.find('Preview Konsoliss demo states')[0]);
 assert.match(app.text(),/DEMO ONLY · New customer/);assert.match(app.webviews()[0].props.source.html,/data-empty="true"/);
 app.click(app.find('Return to live data')[0]);assert.doesNotMatch(app.text(),/DEMO ONLY/);assert.ok(app.text().includes('Loaded 0.5'));
});
