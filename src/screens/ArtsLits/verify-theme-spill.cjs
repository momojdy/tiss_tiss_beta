// Run with: node src/screens/ArtsLits/verify-theme-spill.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'themeSpillGeometry.ts'),'utf8'),mod={exports:{}};
new Function('module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const {SPILL_SPREAD_MS,SPILL_REVEAL_MS,SPILL_SAMPLES,advanceSpillElapsed,spillFrontRadius,spillFrontPoints,spillPath,spillProgress,waveAmount,mixColor,contrastRatio,readableColor,paperWaveAmount}=mod.exports;
assert.equal(SPILL_SPREAD_MS,2820);assert.equal(SPILL_REVEAL_MS,180);assert.equal(SPILL_SPREAD_MS+SPILL_REVEAL_MS,3000);assert.equal(spillProgress(-1),0);assert.equal(spillProgress(2),1);
let frames=0;
for(const [w,h] of [[320,568],[390,844],[460,1000],[844,390],[1024,1366]]){
 const diagonal=Math.hypot(w,h);
 assert.equal(spillPath(w,h,1),`M0 0H${w}V${h}H0Z`);
 for(let i=0;i<=100;i++){
  const t=i/100,points=spillFrontPoints(w,h,t);
  assert.equal(points.length,SPILL_SAMPLES+1);assert.equal(points[0].y,0);assert.equal(points.at(-1).x,0);
  assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0));
  const d=spillPath(w,h,t);assert.ok(d.startsWith('M0 0'));assert.ok(d.endsWith('Z'));assert.ok(!/NaN|Infinity/.test(d));
  for(let j=0;j<=SPILL_SAMPLES;j++){const a=j/SPILL_SAMPLES*Math.PI/2;assert.ok(spillFrontRadius(diagonal,t,a,.12)>=spillFrontRadius(diagonal,t,a));if(i===100)assert.ok(spillFrontRadius(diagonal,t,a)>diagonal);}
  frames++;
 }
 // A real shape change rather than uniform scaling: normalized radial ratios differ over time.
 const ratio=t=>spillFrontRadius(diagonal,t,.25)/spillFrontRadius(diagonal,t,1.1);
 assert.ok(Math.abs(ratio(.30)-ratio(.65))>.05);
 assert.ok(spillPath(w,h,.45).includes('C'));
}
console.log('Theme spill: '+frames+' viewport/frame cases passed.');

// Both endpoints are exact, intermediate colors are genuine, and the top-left arrives before the bottom-right.
let waveCases=0;
for(const [w,h] of [[320,568],[390,844],[460,1000],[844,390],[1024,1366]])for(let i=0;i<=100;i++){
 const t=i/100;for(const [x,y] of [[0,0],[w*.25,h*.25],[w*.75,h*.25],[w*.25,h*.75],[w,h]]){
  const v=waveAmount(w,h,x,y,t);assert.ok(Number.isFinite(v)&&v>=0&&v<=1);if(i===0||i===100)assert.equal(v,t);waveCases++;
 }
}
assert.ok(waveAmount(390,844,0,0,.35)>waveAmount(390,844,390,844,.35));
assert.equal(mixColor('#f4f0e8','#142021',0),'#f4f0e8');assert.equal(mixColor('#f4f0e8','#142021',1),'#142021');assert.equal(mixColor('#000000','#ffffff',.5),'rgba(128,128,128,1)');assert.equal(mixColor('rgba(255,255,255,0.88)','rgba(20,32,33,0.88)',.5),'rgba(138,144,144,0.88)');
console.log('Live palette wave: '+waveCases+' spatial samples checked.');

let contrastCases=0;for(const [from,to,inkA,inkB] of [['#f4f0e8','#142021','#222522','#f0e9dd'],['#142021','#f4f0e8','#f0e9dd','#222522']])for(const [w,h] of [[320,568],[390,844],[460,1000]])for(let i=1;i<100;i++)for(const [x,y] of [[20,20],[w*.5,h*.5],[w-20,h-20],[w*.75,h*.25]]){const t=i/100;const paper=mixColor(from,to,paperWaveAmount(w,h,x,y,t));const ink=readableColor(mixColor(inkA,inkB,waveAmount(w,h,x,y,t)),paper,[inkA,inkB]);assert.ok(contrastRatio(ink,paper)>=4.5);contrastCases++;}console.log('Intermediate foreground contrast: '+contrastCases+' samples checked.');

// The main front cannot retreat or flood the far corner prematurely.
let advancingCases=0;
for(let j=0;j<=128;j++){
 const angle=j/128*Math.PI/2;
 assert.equal(spillFrontRadius(1,0,angle),0);
 for(let i=1;i<=1000;i++){
  assert.ok(spillFrontRadius(1,i/1000,angle)>=spillFrontRadius(1,(i-1)/1000,angle));
  advancingCases++;
 }
}
for(const [w,h] of [[320,568],[390,844],[460,1000],[844,390],[1024,1366]]){
 assert.equal(paperWaveAmount(w,h,w,h,.9)<1,true);
 assert.equal(paperWaveAmount(w,h,w,h,1),1);
}
console.log('Monotonic liquid front: '+advancingCases+' ray/time samples checked.');

// Finish after three seconds at different refresh rates, including a busy
// scrolling render. Frame delays count toward the duration, never extend it.
for(const hz of [20,30,60,90,120]){let elapsed=0;for(let i=0;i<hz*3;i++)elapsed=advanceSpillElapsed(elapsed,1000/hz);assert.ok(Math.abs(elapsed-3000)<.001);}
assert.equal(advanceSpillElapsed(0,2000),2000);assert.equal(advanceSpillElapsed(500,-5),500);assert.equal(advanceSpillElapsed(2990,100),3000);
assert.equal(advanceSpillElapsed(1000,2000),3000);
console.log('Three-second clock: five refresh rates and delayed-frame cases checked.');

// Render against the current RN API: the spill must stay out of flex layout,
// even when the removed absoluteFillObject export is absent.
const React=require('react');
const native={View:'View',Text:'Text',TextInput:'TextInput',Image:'Image',Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{absoluteFill:{position:'absolute',top:0,right:0,bottom:0,left:0}}};
function loadTs(file,imports){
 const m={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',js)(name=>name in imports?imports[name]:require(name),m,m.exports);
 return m.exports;
}
const {SpillPaper}=loadTs('ThemeSpill.tsx',{'react-native':native,'./spillClock':{useSpillProgress:(clock,p)=>clock?clock.get():p},'react-native-reanimated':{},'react-native-worklets':{},'./SpillPath':{SpillPath:'Path'},'react-native-svg':{default:'Svg',Path:'Path'},'./themeSpillGeometry':mod.exports});
for(const progress of [.1,.5,.9,1]){
 const paper=SpillPaper({width:390,height:844,progress,color:'#142021'});
 const style=Object.assign({},...paper.props.style);
 assert.equal(style.position,'absolute');
 for(const side of ['top','right','bottom','left'])assert.equal(style[side],0);
 assert.equal(style.zIndex,0);assert.equal(paper.props.pointerEvents,'none');
}
console.log('Current React Native layout: spill stays behind content and outside flex flow.');

// The interactive source retains its exact palette, handlers and refs. A
// passive destination has only final colors; the mask decides which pixels show.
const {targetThemeTree}=loadTs('liveThemeWave.tsx',{});
const {palettes}=loadTs('design.ts',{'react-native':{Platform:{select:options=>options.default}}});
const sourceRef=React.createRef(),onPress=()=>{};
for(const [from,to] of [[palettes.light,palettes.dark],[palettes.dark,palettes.light]]){
 const original=React.createElement('View',{testID:'source',ref:sourceRef,onLayout:()=>{}},[
  React.createElement('Text',{key:'label',style:{color:from.ink},testID:'label'},'A wide headline'),
  React.createElement('Icon',{key:'icon',color:from.teal,dark:from===palettes.dark}),
  React.createElement('Pressable',{key:'action',onPress},'Open'),
  React.createElement('ScrollView',{key:'scroll',testID:'scroll',scrollEventThrottle:16,onScroll:()=>{},ref:sourceRef}),
 ]);
 const target=targetThemeTree(original,from,to);
 assert.equal(original.props.ref,sourceRef);assert.equal(original.props.children[0].props.style.color,from.ink);
 assert.equal(original.props.children[2].props.onPress,onPress);
 assert.equal(target.props.ref,null);assert.equal(typeof target.props.onLayout,'function');assert.notEqual(target.props.onLayout,original.props.onLayout);assert.equal(target.props.testID,'arts-lits-target-source');
 assert.equal(target.props.children[0].props.style.color,to.ink);assert.equal(target.props.children[1].props.color,to.teal);
 assert.equal(target.props.children[1].props.dark,to===palettes.dark);assert.equal(typeof target.props.children[2].props.onPress,'function');assert.notEqual(target.props.children[2].props.onPress,onPress);
 assert.equal(target.props.children[3].props.spillScrollId,'scroll');assert.equal(typeof target.props.children[3].props.onScroll,'function');
 assert.equal(target.props.children[3].props.ref,null);assert.equal(target.props.children[0].props.style.textShadowColor,undefined);
}
console.log('Spatial theme presentations: source identity preserved, no sampled-color snaps or halos, passive refs/actions isolated without changing conditional markup.');

// Actual Shelf headers and contextual cards must retain optional action links.
const {SectionHead,ContextBlock,TextLink}=loadTs('components.tsx',{'react-native':{...native,StyleSheet:{...native.StyleSheet,create:s=>s}},'react-native-svg':{},'expo-linear-gradient':{},'./assets':{referenceAssets:{}},'./design':{serif:'serif',sans:'sans'},'./model':{shelfBooks:[]},'./SpillSurface':{SpillScrollView:'ScrollView'}});
for(const Component of [SectionHead,ContextBlock]){
 let fired=false;
 const original=React.createElement(Component,{p:palettes.light,title:'Your shelf',description:'Reading corner',action:'Open library',onPress:()=>{fired=true;}});
 const target=targetThemeTree(original,palettes.light,palettes.dark);
 const before=Component(original.props),after=Component(target.props);
 const sourceLink=React.Children.toArray(before.props.children).find(n=>React.isValidElement(n)&&n.type===TextLink);
 const targetLink=React.Children.toArray(after.props.children).find(n=>React.isValidElement(n)&&n.type===TextLink);
 assert.ok(sourceLink&&targetLink,'Passive cards retain callback-dependent action markup');
 assert.deepEqual(targetLink.props.style,sourceLink.props.style);
 targetLink.props.onPress();assert.equal(fired,false,'Passive callbacks never mutate the live source');
}
console.log('Real Shelf/context card links retained with identical layout and inert callbacks.');

// The mask clips the presentation in measured screen coordinates, including
// the padding of a detail panel. It never changes the original native subtree.
const fakeReact={...React,useRef:initial=>({current:initial}),useState:initial=>[typeof initial==='function'?initial():{x:22,y:16,width:346,height:500},()=>{}],useId:()=>':test:',useCallback:fn=>fn,useMemo:fn=>fn()};
const {SpillSurface}=loadTs('SpillSurface.tsx',{'react':fakeReact,'react-native':native,'./SpillReveal':{SpillReveal:'SpillReveal'},'./spillClock':{useSpillProgress:(clock,p)=>clock?clock.get():p},'./liveThemeWave':{targetThemeTree}});
function flattenElements(node,out=[]){if(Array.isArray(node)){node.forEach(child=>flattenElements(child,out));return out;}if(React.isValidElement(node)){out.push(node);flattenElements(node.props.children,out);}return out;}
const untouched=React.createElement('Text',{style:{color:palettes.light.ink}},'A partially covered label');
const wave={from:palettes.light,to:palettes.dark,progress:.21,width:390,height:844};
const surface=SpillSurface({wave,children:untouched,originFromLayout:true});
assert.equal(surface.props.children[0].props.children,untouched);
const scene=flattenElements(surface),reveal=scene.find(n=>n.type==='SpillReveal');
assert.equal(reveal.props.x,22);assert.equal(reveal.props.y,16);
assert.equal(reveal.props.width,346);assert.equal(reveal.props.height,500);
assert.equal(scene.find(n=>n.props.testID==='arts-lits-spill-ink').props.pointerEvents,'none');
assert.deepEqual(reveal.props.children.props.children.props.style[0],native.StyleSheet.absoluteFill);
const svg={default:'Svg',Defs:'Defs',G:'G',Mask:'Mask',Path:'Path'};
for(const file of ['SpillReveal.tsx','SpillReveal.native.tsx']){
 const {SpillReveal}=loadTs(file,{'react-native':native,'react-native-svg':svg,'@react-native-masked-view/masked-view':{__esModule:true,default:'MaskedView'},'./themeSpillGeometry':mod.exports});
 const rendered=SpillReveal({...reveal.props,children:untouched});
 const nodes=flattenElements(rendered);
 assert.ok(!nodes.some(n=>n.type==='ForeignObject'));
 const clipped=nodes.find(n=>n.props.testID==='arts-lits-clipped-content');
 assert.equal(clipped.props.children,untouched,'Keep content in normal layout');
 const maskNodes=file.includes('.native')?flattenElements(rendered.props.maskElement):nodes;
 const group=maskNodes.find(n=>n.type==='G');
 assert.equal(group.props.transform,'translate(-22 -16)');
 const paths=maskNodes.filter(n=>n.type==='Path');
 assert.equal(paths.length,mod.exports.SPILL_EDGE_LAYERS.length);
 paths.forEach((path,i)=>assert.equal(path.props.d,spillPath(390,844,.21,mod.exports.SPILL_EDGE_LAYERS[i].lead)));
 if(file.includes('.native')){
  assert.equal(rendered.type,'MaskedView');
  assert.equal(rendered.props.androidRenderingMode,'software','Animated Android masks must refresh');
  assert.deepEqual(rendered.props.style,native.StyleSheet.absoluteFill);
  assert.ok(!maskNodes.includes(untouched),'Only the mask is rendered into SVG');
 }else{
  assert.equal(nodes.find(n=>n.type==='Mask').props.maskUnits,'userSpaceOnUse');
  assert.equal(clipped.props.style[1].maskImage,`url(#${reveal.props.maskId})`);
 }
}
console.log('Native/CSS clipping: normal card layout, shared waterline and measured offsets, no SVG content layout.');

// Coverage has several gradual intermediate values across the narrow wet edge.
for(const t of [.2,.5,.8]){
 const angle=1.25,d=Math.hypot(390,844),front=spillFrontRadius(d,t,angle),edge=spillFrontRadius(d,t,angle,.008),levels=new Set();
 let previous=0;
 for(let i=0;i<=100;i++){const r=edge+1-(edge-front+2)*i/100,amount=paperWaveAmount(390,844,r*Math.cos(angle),r*Math.sin(angle),t);assert.ok(amount+1e-12>=previous);previous=amount;levels.add(Math.round(amount*10000));}
 assert.ok(levels.size>=4);assert.equal(previous,1);
}
console.log('Wet-edge coverage: gradual monotonic blending before full theme coverage.');

// Lock the curve frames to the version whose fluid motion was approved, rather
// than silently changing its path, edge contours or time progression again.
const curveHash=require('node:crypto').createHash('sha256');
for(let i=0;i<=180;i++)for(const lead of [.008,.003,0])curveHash.update(spillPath(390,844,i/180,lead));
assert.equal(curveHash.digest('hex'),'adb788d5f1dd0249075f82ecbd21c27225005b7b971528a0cecdf93cdfd55cd9');
const later=SpillSurface({wave:{...wave,progress:.22},children:untouched,originFromLayout:true});
const laterReveal=flattenElements(later).find(n=>n.type==='SpillReveal');
assert.equal(reveal.props.maskId,laterReveal.props.maskId,'Keep one clip instance while its path changes');
assert.equal(laterReveal.props.children.props.children.props.children,reveal.props.children.props.children.props.children,'Keep prepared card content stable');
console.log('Approved fluid frames preserved exactly; card content and clip identity stay stable.');
