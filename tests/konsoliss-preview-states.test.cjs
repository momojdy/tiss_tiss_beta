// Demo / preview scenario model, selector behavior, isolation and renderer smoke checks.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),src=name=>fs.readFileSync(path.join(root,'src/screens/Konsoliss',name),'utf8');
const cache=new Map();
function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(n=>n.startsWith('.')?load(path.join(path.dirname(file),n)+(fs.existsSync(path.join(path.dirname(file),n)+'.ts')?'.ts':'.tsx')):require(n),m,m.exports);return m.exports;}
const S=load('src/screens/Konsoliss/konsolissPreviewScenarios.ts');
const {KONSOLISS_COPY_DEFAULTS:copy}=load('src/screens/Konsoliss/cms/catalog.ts'),{formatCopy}=load('src/screens/Konsoliss/cms/model.ts');
const harness=require('./helpers/konsoliss-runtime.cjs');
const byCode=code=>S.PREVIEW_SCENARIOS.find(s=>s.code===code);
const CODES=['A1','A2','A3','A4','A5','B1','B2','B3','B4','C1','C2','C3','C4','C5','C6','C7','D1','D2','D3','D4','D5','D6','D6b'];

test('every required scenario exists once, grouped A-D, and every fixture obeys backend-style invariants',()=>{
 assert.deepEqual(S.PREVIEW_SCENARIOS.map(s=>s.code),CODES);
 assert.equal(new Set(S.PREVIEW_SCENARIOS.map(s=>s.id)).size,CODES.length);
 for(const s of S.PREVIEW_SCENARIOS){assert.deepEqual(S.previewScenarioErrors(s),[],s.code);assert.ok(s.code[0]===s.group,s.code);}
 assert.equal(S.PREVIEW_SCENARIO_COUNT,CODES.length);
});

test('top-left arithmetic: headline is (loaded + inbound) / purchased, never loaded-only',()=>{
 const p=S.previewProgress(byCode('C2'));
 assert.equal(p.loadedCbm,0.3);assert.equal(p.inboundCbm,0.1);assert.equal(p.allocatedCbm,0.4);assert.equal(p.reservedCbm,0.5);assert.equal(p.loadedPercent,80);
 const app=harness();app.click(app.find('Preview Konsoliss demo states')[0]);app.click(app.find('Open demo scenario list')[0]);app.click(app.find('Show demo state C2')[0]);
 const text=app.text();
 assert.match(text,/0\.4 \/ 0\.5 CBM/);assert.doesNotMatch(text,/0\.3 \/ 0\.5 CBM/);
 assert.match(text,/Loaded 0\.3.*Inbound 0\.1/);
});

test('derived quantities follow the live view formulas for sent-not-loaded, warehouse and unused',()=>{
 const b4=S.previewProgress(byCode('B4'));
 assert.equal(b4.atWarehouseOrInTransitCbm,0.4);assert.equal(b4.reservedNotSentCbm,0.3);assert.equal(b4.loadedCbm,0);assert.equal(b4.allocatedCbm,0.3);
 const c3=S.previewProgress(byCode('C3'));
 assert.equal(c3.sentCbm,0.7);assert.equal(c3.loadedCbm,0.7);assert.equal(c3.reservedNotSentCbm,0.3);assert.equal(c3.loadedPercent,70,'not 100% utilized');
 const a2=S.previewProgress(byCode('A2'));assert.equal(a2.sentCbm,0);assert.equal(a2.loadedCbm,0);assert.equal(a2.allocatedCbm,0);
 assert.equal(S.previewProgress(byCode('D6')),null);assert.equal(S.previewProgress(byCode('D6b')),null);
});

test('customer 100% loaded is independent from shared container fill and from the sealed status',()=>{
 const c4=byCode('C4'),c5=byCode('C5'),p4=S.previewProgress(c4),p5=S.previewProgress(c5);
 assert.equal(p4.loadedPercent,100);assert.equal(p5.loadedPercent,100);
 const o4=S.previewOccupancy(c4.containers[0]);
 assert.equal(o4.loadedCbm,51.7);assert.equal(o4.yourSpaceCbm,0.5);assert.equal(o4.freeCbm,16.3);assert.equal(Math.round(o4.loadedCbm/68*100),76);
 assert.equal(S.previewRender(c4,S.previewViews(c4)[0]).sealed,false,'customer 100% does not seal the container');
 const r5=S.previewRender(c5,S.previewViews(c5)[0]);assert.equal(r5.sealed,true);assert.equal(r5.occupancy.loadedCbm,60.6);
 assert.ok(r5.occupancy.loadedCbm/68<1,'sealed container is not 100% full either');
 for(const s of S.PREVIEW_SCENARIOS)for(const c of s.containers){const occ=S.previewOccupancy(c);assert.equal(Math.round(occ.loadedCbm*1000)+Math.round(occ.freeCbm*1000),68000,s.code);assert.equal(Math.round(occ.otherCargoCbm*1000)+Math.round(occ.yourSpaceCbm*1000),Math.round(occ.loadedCbm*1000),s.code);}
});

test('split cargo keeps two real containers separate and exposes a truthful unassigned view',()=>{
 const c7=byCode('C7'),views=S.previewViews(c7);
 assert.deepEqual(views.map(v=>v.id),['a','b','unassigned']);
 const a=S.previewRender(c7,views[0]),b=S.previewRender(c7,views[1]),u=S.previewRender(c7,views[2]);
 assert.equal(a.occupancy.loadedCbm,48.4);assert.equal(b.occupancy.loadedCbm,22.6);
 assert.equal(a.yourLoaded,0.4);assert.equal(b.yourLoaded,0.1);assert.equal(b.hereInbound,0.1);
 assert.equal(u.preview,true);assert.equal(u.occupancy,null);assert.equal(u.loaded,0);assert.equal(u.reserved,0.4);
 const p=S.previewProgress(c7);assert.equal(p.loadedCbm,0.5);assert.equal(p.inboundCbm,0.1);
 assert.equal(S.previewUnassignedCbm(c7),0.4);
 // No container inherits another container's cargo or the customer's total purchase.
 assert.ok(a.here<=c7.purchased&&b.here<=c7.purchased);assert.notEqual(a.here,c7.purchased);
});

test('unassigned or containerless customers never inherit a physical container',()=>{
 for(const code of ['A2','A3','A4','A5','B1','B2','D1']){const s=byCode(code),r=S.previewRender(s,S.previewViews(s)[0]);assert.equal(r.occupancy,null,code);assert.equal(r.loaded,0,code);assert.equal(r.yourLoaded,0,code);assert.equal(r.preview,true,code);}
 const a4=byCode('A4'),r=S.previewRender(a4,S.previewViews(a4)[0]);assert.equal(r.sent,0,'a created label is not a dispatch');
 const a1=S.previewRender(byCode('A1'),S.previewViews(byCode('A1'))[0]);assert.equal(a1.empty,true);
 const d4=S.previewRender(byCode('D4'),S.previewViews(byCode('D4'))[0]);assert.equal(d4.empty,true);assert.match(byCode('D4').history,/History kept/);
 const d6=byCode('D6');assert.equal(S.previewViews(d6).length,0);
});

test('selector reaches every scenario and any scenario can be selected repeatedly or switched to any other',()=>{
 const app=harness();app.click(app.find('Preview Konsoliss demo states')[0]);
 const pick=code=>{app.click(app.find('Open demo scenario list')[0]);app.click(app.find('Show demo state '+code)[0]);};
 for(const code of CODES){pick(code);assert.ok(app.text().includes('DEMO ONLY · '+byCode(code).title),code);}
 for(const [a,b] of [['A1','C4'],['C4','D6'],['D6','B3'],['C7','A2'],['D6b','C6'],['C6','C6'],['D4','A1']]){pick(a);pick(b);assert.ok(app.text().includes('DEMO ONLY · '+byCode(b).title),a+'>'+b);}
 const html=code=>{pick(code);return app.webviews()[0]?.props.source.html;};
 assert.match(html('A1'),/data-empty="true"/);
 assert.match(html('A2'),/data-preview="true"[\s\S]*data-sent="0"/);
 assert.match(html('C4'),/data-your-loaded="0.5"/);assert.match(html('C4'),/data-loaded="51.7"/);assert.match(html('C4'),/data-sealed="false"/);assert.match(html('C4'),/data-free="16.3"/);
 assert.match(html('C5'),/data-sealed="true"/);
 assert.match(html('C6'),/data-your-loaded="0.02"/);
 assert.match(html('B3'),/data-here="0.5"/);assert.match(html('B3'),/data-preview="false"/);assert.match(html('B3'),/data-your-loaded="0"/);
 assert.match(html('C2'),/data-here="0.5"/);assert.match(html('C2'),/data-here-inbound="0.1"/);assert.match(html('C2'),/data-your-loaded="0.3"/);
 for(const code of ['D6','D6b']){pick(code);assert.equal(app.webviews().length,0,code+' draws no fabricated container');}
 pick('D6');assert.match(app.text(),/— \/ — CBM/);
});

test('previous/next wrap, replay remounts the canvas, autoplay advances then stops on the last state',()=>{
 assert.equal(S.stepPreviewIndex(0,-1),S.PREVIEW_SCENARIO_COUNT-1);assert.equal(S.stepPreviewIndex(S.PREVIEW_SCENARIO_COUNT-1,1),0);
 assert.equal(S.nextAutoplayIndex(0),1);assert.equal(S.nextAutoplayIndex(S.PREVIEW_SCENARIO_COUNT-1),null,'never snaps back to empty');
 assert.equal(S.autoplayDelayMs(0),9000);assert.equal(S.autoplayDelayMs(5),7000);
 const app=harness();app.click(app.find('Preview Konsoliss demo states')[0]);
 assert.match(app.text(),/A1 · New customer/);app.click(app.find('Next demo state')[0]);assert.match(app.text(),/A2 · Purchased/);
 app.click(app.find('Previous demo state')[0]);app.click(app.find('Previous demo state')[0]);assert.match(app.text(),/D6b · Data still loading/);
 app.click(app.find('Next demo state')[0]);assert.match(app.text(),/A1 · New customer/);
 app.click(app.find('Next demo state')[0]);const before=app.webviews()[0].props.key;app.click(app.find('Replay demo state')[0]);assert.notEqual(app.webviews()[0].props.key,before);
 assert.match(app.text(),/A2 · Purchased/,'replay keeps the selected state');
 assert.ok(app.find('Play all demo states').length);app.click(app.find('Play all demo states')[0]);assert.ok(app.find('Pause demo tour').length);app.click(app.find('Pause demo tour')[0]);assert.ok(app.find('Play all demo states').length);
});

test('exiting preview restores genuine account data and demo carries no real actions',()=>{
 const app=harness();const original=app.text();
 app.click(app.find('Preview Konsoliss demo states')[0]);app.click(app.find('Open demo scenario list')[0]);app.click(app.find('Show demo state C4')[0]);
 assert.match(app.text(),/DEMO ONLY/);
 app.click(app.find('Return to live data')[0]);
 assert.doesNotMatch(app.text(),/DEMO ONLY/);assert.ok(app.text().includes('Loaded 0.5'));assert.ok(original.includes('Loaded 0.5'));
 assert.match(app.webviews()[0].props.source.html,/data-loaded="51.7"/);assert.match(app.webviews()[0].props.source.html,/data-demo="false"/);
 // Book Space is inert while the demo is on, so no support/checkout request can be created from fixtures.
 app.click(app.find('Preview Konsoliss demo states')[0]);
 const book=app.buttons(copy['home.book.title']+copy['home.book.subtitle'])[0];assert.ok(book,'Book Space card found');app.click(book);
 const sheetText=formatCopy(copy,'book.capacity',{capacity:68});assert.ok(!app.text().includes(sheetText),'Book sheet does not open during demo');
 app.click(app.find('Return to live data')[0]);app.click(app.buttons(copy['home.book.title']+copy['home.book.subtitle'])[0]);
 assert.ok(app.text().includes(sheetText),'Book sheet opens normally on live data');
});

test('demo modules are frontend-only: no Supabase, network, storage or write APIs',()=>{
 for(const name of ['konsolissPreviewScenarios.ts','useKonsolissPreviewController.ts']){const code=src(name).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  assert.doesNotMatch(code,/supabase|fetch\(|XMLHttpRequest|AsyncStorage|\.insert\(|\.update\(|\.upsert\(|\.rpc\(|sendKonsolissSupport/i,name);}
 const home=src('konsolissHomeScreen.tsx');
 assert.match(home,/const setSh=\(value:typeof sh\)=>\{if\(isDemo&&value!==null\)return;/);
 assert.match(home,/useKonsolissContainerOccupancy\(!isDemo&&selectedContainer/);
 assert.match(home,/konsolissDemoEnabled\(\)/);
 assert.match(S.konsolissDemoEnabled.toString(),/EXPO_PUBLIC_KONSOLISS_DEMO/);
 process.env.EXPO_PUBLIC_KONSOLISS_DEMO='0';assert.equal(S.konsolissDemoEnabled(),false);delete process.env.EXPO_PUBLIC_KONSOLISS_DEMO;assert.equal(S.konsolissDemoEnabled(),true);
});

// ---- renderer smoke with a recording canvas ----
function rendererScript(){
 const text=src('konsolissHomeScreen.tsx'),start=text.indexOf('const CONTAINER_JS = ['),end=text.indexOf('].join("\\n");',start);
 return text.slice(start,end).split('\n').slice(1).map(l=>l.trim()).filter(Boolean).map(l=>JSON.parse(l.replace(/,$/,''))).join('\n');
}
function runRenderer(data,{yaw=0,pitch=10,reduced=false}={}){
 const texts=[],fills=[];let ctx;const cvs={getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:300}),addEventListener(){},setPointerCapture(){}};
 const state={};ctx=new Proxy(state,{get:(t,k)=>k==='fillText'||k==='strokeText'?(x)=>{texts.push(String(x));}:k==='createRadialGradient'?()=>({addColorStop(){}}):k==='fill'?()=>{fills.push(t.fillStyle);}:typeof t[k]==='undefined'?()=>{}:t[k],set:(t,k,v)=>{t[k]=v;return true;}});
 const dataset={};for(const[k,v]of Object.entries(data))dataset[k]=String(v);
 const doc={documentElement:{dataset:{theme:'light',empty:'false',preview:'false',demo:'true',...dataset}},querySelector:()=>cvs};
 new Function('document','devicePixelRatio','requestAnimationFrame','setInterval','addEventListener','matchMedia',rendererScript())(doc,1,fn=>{fn();return 1;},()=>0,()=>{},reduced?()=>({matches:true}):undefined);
 return {texts,fills};
}
const attrs=(s,viewIndex=0)=>{const r=S.previewRender(s,S.previewViews(s)[viewIndex]);return {empty:r.empty,preview:r.preview,reserved:r.empty?68:r.reserved,loaded:r.loaded,yourLoaded:r.yourLoaded,free:r.free??'-',here:r.here,hereInbound:r.hereInbound,sealed:r.sealed,sent:r.sent,caption:r.caption,caption2:r.caption2};};

test('renderer draws every scenario view without error and with truthful callouts',()=>{
 for(const s of S.PREVIEW_SCENARIOS){if(s.data)continue;S.previewViews(s).forEach((v,i)=>{assert.doesNotThrow(()=>runRenderer(attrs(s,i)),s.code+':'+v.id);});}
 const c4=runRenderer(attrs(byCode('C4'))).texts;
 assert.ok(c4.includes('My current loaded space 0.500 CBM'),'C4 callout shows 0.500 CBM');assert.ok(c4.some(t=>/^[0-9.]+ CBM free$/.test(t)),'C4 container still has free space');
 const c5=runRenderer(attrs(byCode('C5'))).texts;assert.ok(c5.includes('My current loaded space 0.500 CBM'));assert.ok(!c5.some(t=>/CBM free$/.test(t)),'sealed container shows no free-space label');
 const c6=runRenderer(attrs(byCode('C6'))).texts;assert.ok(c6.includes('My current loaded space 0.020 CBM'));
 const b3=runRenderer(attrs(byCode('B3'))).texts;assert.ok(b3.includes('0.500 CBM reserved here · not loaded yet'));assert.ok(!b3.some(t=>t.startsWith('My current loaded space')),'nothing loaded, so no loaded callout');
 const c1u=runRenderer(attrs(byCode('C1'),1)).texts;assert.ok(c1u.includes('Not assigned to a container yet: 0.200 CBM'));assert.ok(c1u.includes('Illustration · not a real container'));assert.ok(!c1u.some(t=>t.startsWith('My current loaded space')));
 const a2=runRenderer(attrs(byCode('A2'))).texts;assert.ok(a2.includes('Goods sent 0 CBM'));assert.ok(a2.some(t=>t.startsWith('Space preview: 1.000 CBM')));
 const a4=runRenderer(attrs(byCode('A4'))).texts;assert.ok(a4.includes('Label created · carrier acceptance not confirmed'));
 const b2=runRenderer(attrs(byCode('B2'))).texts;assert.ok(b2.includes('At warehouse 0.700 CBM · not in a container'));
});

test('99% and 100% physical container occupancy, tiny load and original empty animation render',()=>{
 const base={empty:false,preview:false,reserved:68,yourLoaded:0.5,sealed:false,here:0.5,hereInbound:0,sent:0};
 for(const [loaded,free] of [[67.32,0.68],[68,0],[0.02,67.98]])assert.doesNotThrow(()=>runRenderer({...base,loaded,free}),String(loaded));
 const full=runRenderer({...base,loaded:68,free:0}).texts;assert.ok(full.includes('My current loaded space 0.500 CBM'));
 const empty=runRenderer({empty:true,reserved:68,loaded:0,yourLoaded:0,free:'-'}).texts;assert.ok(!empty.some(t=>t.includes('Illustration')),'original empty animation is unchanged');
 assert.doesNotThrow(()=>runRenderer({...base,loaded:51.7,free:16.3},{yaw:50,pitch:60}),'rotated view');
});

test('reduced motion freezes preview and pulse animation without breaking drawing',()=>{
 assert.doesNotThrow(()=>runRenderer(attrs(byCode('A2')),{reduced:true}));assert.doesNotThrow(()=>runRenderer(attrs(byCode('C4')),{reduced:true}));
 assert.match(rendererScript(),/RM=typeof matchMedia==='function'&&matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
 assert.match(rendererScript(),/if\(!RM&&\(PREVIEW\|\|\(!EMPTY&&YOUR_LOADED>0\)\)\)/);
});
