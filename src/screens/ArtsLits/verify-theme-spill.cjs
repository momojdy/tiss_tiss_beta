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
const {SpillPaper}=loadTs('ThemeSpill.tsx',{'react-native':native,'react-native-svg':{default:'Svg',Path:'Path'},'./themeSpillGeometry':mod.exports});
for(const progress of [.1,.5,.9,1]){
 const paper=SpillPaper({width:390,height:844,progress,color:'#142021'});
 const style=Object.assign({},...paper.props.style);
 assert.equal(style.position,'absolute');
 for(const side of ['top','right','bottom','left'])assert.equal(style[side],0);
 assert.equal(style.zIndex,0);assert.equal(paper.props.pointerEvents,'none');
}
console.log('Current React Native layout: spill stays behind content and outside flex flow.');

// Measure the existing hosts before a toggle. The second child is deliberately
// near the top and the first near the bottom, defeating equal-slot estimates.
const {paintThemeTree,wavePalette}=loadTs('liveThemeWave.tsx',{'react-native':native,'./themeSpillGeometry':mod.exports});
const {palettes}=loadTs('design.ts',{'react-native':{Platform:{select:options=>options.default}}});
const cache=new Map(),bounds={x:0,y:0,width:390,height:844};
let layoutCalls=0;const onPress=()=>{},imageRef=React.createRef(),imageSource={uri:'museum.png'};
const original=React.createElement('View',{},[
 React.createElement('Text',{key:'lower',style:{color:palettes.light.ink},onLayout:()=>layoutCalls++},'Lower label'),
 React.createElement('Text',{key:'upper',style:{color:palettes.light.ink}},'Upper label'),
 React.createElement('Image',{key:'art',ref:imageRef,source:imageSource}),
 React.createElement('Pressable',{key:'button',onPress},'Open work'),
]);
const measured=paintThemeTree(original,null,bounds,cache);
measured.props.children[0].props.onLayout({nativeEvent:{layout:{x:20,y:730,width:100,height:20}}});
measured.props.children[1].props.onLayout({nativeEvent:{layout:{x:20,y:10,width:100,height:20}}});
assert.equal(layoutCalls,1);
for(const [from,to] of [[palettes.light,palettes.dark],[palettes.dark,palettes.light]]){
 const tree=React.cloneElement(original,{},original.props.children.map(child=>child.type==='Text'?React.cloneElement(child,{style:{color:from.ink}}):child));
 for(const progress of [.1,.35,.65,.9,1]){
  const wave={from,to,progress,width:390,height:844};
  const painted=paintThemeTree(tree,wave,bounds,cache);
  for(const [i,y] of [[0,740],[1,20]])assert.equal(painted.props.children[i].props.style.color,wavePalette(wave,70,y).ink);
  painted.props.children.forEach((child,i)=>{assert.equal(child.type,original.props.children[i].type);assert.equal(child.key,original.props.children[i].key);});
  assert.equal(painted.props.children[2].props.ref,imageRef);assert.equal(painted.props.children[2].props.source,imageSource);
  assert.equal(painted.props.children[3].props.onPress,onPress);
 }
}
console.log('Measured palette wave: both directions retain host identity, images, refs and handlers.');
// Text crossing both papers gets a contrasting edge, removed once settled.
for(const [from,to] of [[palettes.light,palettes.dark],[palettes.dark,palettes.light]]){
 const text=React.createElement('Text',{style:{color:from.ink}},'A wide headline crossing the spill');
 const wave={from,to,progress:.35,width:390,height:844};
 const style=paintThemeTree(text,wave,bounds).props.style;
 assert.ok(style.textShadowRadius>0);assert.ok(contrastRatio(style.textShadowColor,style.color)>=4.5);
 assert.equal(paintThemeTree(text,{...wave,progress:1},bounds).props.style.textShadowRadius,undefined);
}
console.log('Split headline contrast: a temporary halo protects both theme directions.');
