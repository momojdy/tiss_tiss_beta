// Run with: node src/screens/ArtsLits/verify-theme-spill.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'themeSpillGeometry.ts'),'utf8'),mod={exports:{}};
new Function('module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const {SPILL_SPREAD_MS,SPILL_REVEAL_MS,SPILL_SAMPLES,spillFrontRadius,spillFrontPoints,spillPath,spillProgress}=mod.exports;
assert.equal(SPILL_SPREAD_MS,1650);assert.equal(SPILL_REVEAL_MS,360);assert.equal(spillProgress(-1),0);assert.equal(spillProgress(2),1);
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
