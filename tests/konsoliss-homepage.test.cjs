const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript');
const cache=new Map();function load(file){file=path.resolve(__dirname,'..',file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),name+'.ts'))):require(name),m,m.exports);return m.exports;}
const {KONSOLISS_COPY_DEFAULTS:defaults,KONSOLISS_LOCALES:locales,konsolissLocaleDefaults}=load('src/screens/Konsoliss/cms/catalog.ts');const {publicationErrors,resolveHomepage,formatCopy,estimateCbm,contentKeyForText}=load('src/screens/Konsoliss/cms/model.ts');
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
 assert.match(source,/useKonsolissContainerOccupancy\(!snapshotMode&&!isDemo&&selectedContainer/);
 assert.match(source,/const containerOccupancy=isDemo\?/);
 assert.match(source,/const progress=displayLoadState.kind==='recorded'/);
 assert.match(source,/pointerEvents=\{isDemo\?'none':'auto'\}/);
 const app=harness();app.click(app.find('Preview Konsoliss demo states')[0]);
 assert.match(app.text(),/DEMO ONLY · New customer/);assert.match(app.webviews()[0].props.source.html,/data-empty="true"/);
 app.click(app.find('Return to live data')[0]);assert.doesNotMatch(app.text(),/DEMO ONLY/);assert.ok(app.text().includes('Loaded 0.5'));
});

test('live container input contains verified inbound, not a demo or guessed value',()=>{
 const app=harness(),html=app.webviews()[0].props.source.html;
 assert.match(html,/data-here-inbound="0.3"/);assert.match(html,/data-here="0.8"/);
 assert.match(html,/data-caption="0.5 CBM loaded • 0.3 CBM inbound • 1.2 CBM remaining"/);
 const {verifiedContainerInbound,liveLoadCallout}=load('src/screens/Konsoliss/konsolissLoadModel.ts');
 const progress={reservedCbm:1,sentCbm:.5,loadedCbm:.3,inboundCbm:.1,allocatedCbm:.4};
 assert.equal(verifiedContainerInbound({yourAllocatedCbm:.4,yourSpaceCbm:.3}),.1);
 assert.equal(verifiedContainerInbound({yourAllocatedCbm:null,yourSpaceCbm:.3}),0);
 assert.equal(liveLoadCallout(progress,{yourAllocatedCbm:.4,yourSpaceCbm:.3},false),'0.3 CBM loaded • 0.1 CBM inbound • 0.6 CBM remaining');
 assert.equal(liveLoadCallout(progress,{yourAllocatedCbm:.7,yourSpaceCbm:.3},false),'');
 assert.equal(liveLoadCallout(progress,{yourAllocatedCbm:.1,yourSpaceCbm:.1},true),'My current loaded space 0.300 CBM');
});

test('production homepage renders a single verified snapshot, not legacy mock data',()=>{
 const make=(p,containers,status_code,warehouse_cbm,transit_cbm,tracking_due_at=null)=>({kind:'recorded',progress:{reserved_cbm:p[0],sent_cbm:p[1],loaded_cbm:p[2],inbound_to_container_cbm:p[3],allocated_cbm:Math.round((p[2]+p[3])*1000)/1000,at_warehouse_or_in_transit_cbm:Math.max(0,p[1]-p[2]-p[3]),reserved_not_sent_cbm:Math.max(0,p[0]-p[1]),not_allocated_cbm:Math.max(0,p[0]-p[2]-p[3]),allocated_percent:p[0]?Math.round((p[2]+p[3])/p[0]*10000)/100:0},containers,status_code,warehouse_cbm,transit_cbm,tracking_due_at});
 const c=(id,loaded,own,allocated)=>({id,number:'VERIFIED-'+id,status:'filling',occupancy:{container_id:id,container_type:'40HQ',capacity_cbm:68,loaded_cbm:loaded,your_loaded_cbm:own,other_cargo_cbm:Math.round((loaded-own)*1000)/1000,free_cbm:Math.round((68-loaded)*1000)/1000,your_allocated_cbm:allocated}});
 for(const [status,p,wh,tr,label] of [['label_created',[1,0,0,0],0,0,'Label created'],['inbound_warehouse',[1,.7,0,0],0,.7,'Inbound to warehouse'],['warehouse',[1,.4,0,0],.4,0,'0.4 CBM at warehouse'],['expired',[0,0,0,0],0,0,'Reservation expired']]){
  const app=harness({snapshot:make(p,[],status,wh,tr)});assert.ok(app.text().includes(label),status);assert.doesNotMatch(app.text(),/KS-TEST/);assert.ok(app.webviews().length,status);
 }
 const split=make([1,.7,.5,.1],[c('a',48.4,.4,.4),c('b',22.6,.1,.2)],null,.7,0);
 const app=harness({snapshot:split});assert.match(app.text(),/Split into 2 containers/);
 assert.match(app.webviews()[0].props.source.html,/data-caption="My current loaded space 0.500 CBM"/);
 app.click(app.find(defaults['a11y.chooseContainer'])[0]);app.click(app.find(formatCopy(defaults,'a11y.selectContainer',{number:'VERIFIED-b'}))[0]);
 assert.match(app.webviews()[0].props.source.html,/data-your-loaded="0.1"/);assert.match(app.webviews()[0].props.source.html,/data-caption="My current loaded space 0.500 CBM"/);
 app.click(app.find(defaults['a11y.chooseContainer'])[0]);app.click(app.find('Show unassigned purchased space')[0]);assert.match(app.text(),/0.4 CBM unassigned/);assert.match(app.webviews()[0].props.source.html,/data-reserved="0.4"/);assert.match(app.webviews()[0].props.source.html,/data-free="-"/);
 const failed=harness({snapshot:{kind:'unavailable',containers:[]}});assert.equal(failed.webviews().length,0);assert.doesNotMatch(failed.text(),/KS-TEST/);
});

 test('all five homepage catalogs have every label and preserve placeholders; drafts and unreviewed labels do not override bundled locale',()=>{
 for(const locale of locales){const labels=konsolissLocaleDefaults(locale);assert.deepEqual(Object.keys(labels).sort(),Object.keys(defaults).sort());assert.deepEqual(publicationErrors({v:2,labels,reviewed:Object.keys(labels),images:{}}),[],locale);assert.equal(resolveHomepage([],locale).copy['load.labelCreated'],labels['load.labelCreated']);const row={content_key:'konsoliss.content',locale,version:1,status:'published',payload:{v:2,labels:{...labels,'load.labelCreated':'Reviewed publication'},reviewed:['load.labelCreated'],images:{}}};assert.equal(resolveHomepage([row],locale).copy['load.labelCreated'],'Reviewed publication');assert.equal(resolveHomepage([{...row,status:'draft'}],locale).copy['load.labelCreated'],labels['load.labelCreated']);assert.equal(resolveHomepage([{...row,payload:{...row.payload,reviewed:[]}}],locale).copy['load.labelCreated'],labels['load.labelCreated']);}
 });

test('top-right percentage uses actual verified 68 CBM occupancy at exact endpoints',()=>{
 for(const [total,label] of [[0,'0%'],[.001,'0.001%'],[.02,'0.029%'],[51.7,'76.029%'],[67.999,'99.999%'],[68,'100%']]){
 const own=Math.min(.02,total),reserved=1;
 const snapshot={kind:'recorded',progress:{reserved_cbm:reserved,sent_cbm:own,loaded_cbm:own,inbound_to_container_cbm:0,allocated_cbm:own,at_warehouse_or_in_transit_cbm:0,reserved_not_sent_cbm:Math.round((reserved-own)*1000)/1000,not_allocated_cbm:Math.round((reserved-own)*1000)/1000,allocated_percent:own*100},warehouse_cbm:own,transit_cbm:0,containers:[{id:'c',number:'VERIFIED',status:'filling',occupancy:{container_id:'c',container_type:'40HQ',capacity_cbm:68,loaded_cbm:total,your_loaded_cbm:own,other_cargo_cbm:Math.round((total-own)*1000)/1000,free_cbm:Math.round((68-total)*1000)/1000,your_allocated_cbm:own}}]};
 const app=harness({snapshot});assert.ok(app.text().includes(label+' filled'),total+' '+app.text());
 }
});

const widths=(app,...ids)=>ids.map(id=>Number(app.byId('konsoliss-'+id)[0].props.style.width.slice(0,-1)));
const nearWidths=(actual,expected)=>{assert.equal(actual.length,expected.length);actual.forEach((x,i)=>assert.ok(Math.abs(x-expected[i])<1e-9,x+' vs '+expected[i]));};
const activeBar=app=>app.byId('konsoliss-customer-progress').length?'customer':'container';
const switchBar=app=>app.click(app.find(defaults['a11y.progress'])[0]);
test('real homepage segment widths, no fixed gaps, unknown track distinct from measured zero',()=>{
 const app=harness({timers:true});nearWidths(widths(app,'customer-loaded','customer-inbound','customer-remaining'),[25,15,60]);assert.equal(app.byId('konsoliss-customer-progress')[0].props.style.gap,undefined);
 switchBar(app);nearWidths(widths(app,'container-loaded','container-own','container-free'),[51.2/68*100,.5/68*100,16.3/68*100]);app.dispose();
 for(const options of [{empty:true},{reservedOnly:true},{unverified:true},{failed:true}]){
  const x=harness({...options,timers:true});switchBar(x);const track=x.byId('konsoliss-container-progress')[0];assert.equal(track.props.style.borderStyle,'dashed');assert.equal(track.props.style.backgroundColor,'transparent');assert.equal(track.props.accessibilityLabel,defaults['load.unavailable']);assert.equal(x.byId('konsoliss-container-free').length,0);assert.match(x.text(),/Free —/);x.dispose();
 }
 const make=(reserved,loaded,inbound,containers)=>({kind:'recorded',progress:{reserved_cbm:reserved,sent_cbm:loaded+inbound,loaded_cbm:loaded,inbound_to_container_cbm:inbound,allocated_cbm:loaded+inbound,at_warehouse_or_in_transit_cbm:0,reserved_not_sent_cbm:reserved-loaded-inbound,not_allocated_cbm:reserved-loaded-inbound,allocated_percent:reserved?(loaded+inbound)/reserved*100:0},warehouse_cbm:loaded+inbound,transit_cbm:0,containers,status_code:null});
 const c=(id,total,own,allocated)=>({id,number:'BAR-'+id,status:'filling',occupancy:{container_id:id,container_type:'40HQ',capacity_cbm:68,loaded_cbm:total,your_loaded_cbm:own,other_cargo_cbm:Math.round((total-own)*1000)/1000,free_cbm:Math.round((68-total)*1000)/1000,your_allocated_cbm:allocated}});
 const zero=harness({timers:true,snapshot:make(1,0,0,[c('a',0,0,0)])});nearWidths(widths(zero,'customer-loaded','customer-inbound','customer-remaining'),[0,0,100]);switchBar(zero);nearWidths(widths(zero,'container-loaded','container-own','container-free'),[0,0,100]);assert.equal(zero.byId('konsoliss-container-progress')[0].props.style.borderWidth,0);zero.dispose();
 const full=harness({timers:true,snapshot:make(1,.5,.5,[c('a',68,.5,1)])});nearWidths(widths(full,'customer-loaded','customer-inbound','customer-remaining'),[50,50,0]);switchBar(full);nearWidths(widths(full,'container-loaded','container-own','container-free'),[67.5/68*100,.5/68*100,0]);full.dispose();
 const split=harness({timers:true,snapshot:make(1,.5,.1,[c('a',48.4,.4,.4),c('b',22.6,.1,.2)])});nearWidths(widths(split,'customer-loaded','customer-inbound','customer-remaining'),[50,10,40]);switchBar(split);nearWidths(widths(split,'container-loaded','container-free'),[48.4/68*100,19.6/68*100]);assert.equal(split.byId('konsoliss-container-own').length,0);
 split.click(split.find(defaults['a11y.chooseContainer'])[0]);split.click(split.find(formatCopy(defaults,'a11y.selectContainer',{number:'BAR-b'}))[0]);assert.equal(activeBar(split),'customer');nearWidths(widths(split,'customer-loaded','customer-inbound','customer-remaining'),[50,10,40]);split.advance(7000);nearWidths(widths(split,'container-loaded','container-free'),[22.6/68*100,45.4/68*100]);split.dispose();
});
test('actual React homepage effects rotate every seven seconds, manual switch restarts dwell, cleanup cancels timers',()=>{
 for(const options of [{},{empty:true},{reservedOnly:true},{unverified:true},{failed:true}]){
  const app=harness({...options,timers:true});assert.equal(activeBar(app),'customer');
  app.advance(6999);assert.equal(activeBar(app),'customer');app.advance(1);assert.equal(activeBar(app),'container');
  app.advance(6999);assert.equal(activeBar(app),'container');app.advance(1);assert.equal(activeBar(app),'customer');
  app.advance(5000);switchBar(app);assert.equal(activeBar(app),'container');
  app.advance(2000);assert.equal(activeBar(app),'container','old timer cancelled');
  app.advance(4999);assert.equal(activeBar(app),'container');app.advance(1);assert.equal(activeBar(app),'customer');
  switchBar(app);app.advance(10);switchBar(app);app.advance(6999);assert.equal(activeBar(app),'customer');app.advance(1);assert.equal(activeBar(app),'container');
  app.dispose();assert.equal(app.timerCount(),0);app.advance(14000);assert.equal(activeBar(app),'container');
 }
});
