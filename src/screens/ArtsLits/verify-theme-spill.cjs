// Run with: node src/screens/ArtsLits/verify-theme-spill.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'themeSpillGeometry.ts'),'utf8'),mod={exports:{}};
new Function('module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const {SPILL_SPREAD_MS,SPILL_REVEAL_MS,SPILL_SAMPLES,spillFrontRadius,spillFrontPoints,spillPath,spillProgress,waveAmount,mixColor,contrastRatio,readableColor,paperWaveAmount}=mod.exports;
assert.equal(SPILL_SPREAD_MS,5640);assert.equal(SPILL_REVEAL_MS,360);assert.equal(SPILL_SPREAD_MS+SPILL_REVEAL_MS,6000);assert.equal(spillProgress(-1),0);assert.equal(spillProgress(2),1);
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
