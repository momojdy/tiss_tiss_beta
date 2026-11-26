// Offline asset integrity and frame validation; not a physical-device scroll test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(root,'motion-assets-manifest.json'),'utf8')),stills=JSON.parse(fs.readFileSync(path.join(root,'idle-icons-manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 assert.equal(Object.keys(manifest).length,6);
 for(const [name,entry] of Object.entries({...manifest,...stills})){
  const data=fs.readFileSync(path.join(root,name));assert.equal(data.length,entry.bytes);assert.equal(sha(data),entry.sha256);
  const info=await sharp(data,{animated:true}).metadata();assert.equal(info.width,entry.width);
  if(name.endsWith('.webp')){assert.equal(info.pageHeight,entry.height);assert.equal(info.pages,entry.frames);assert.ok(info.pages>1);assert.equal(info.loop,0);assert.equal(info.delay.reduce((a,b)=>a+b,0),entry.durationMs);}
  else assert.equal(info.height,entry.height);
 }
 const {loadTS,serialize}=require('./generate-static-icons.cjs');
 const tree=JSON.parse(loadTS('home-v73.ts').default),context={name:'Home',dark:true,parentClass:'',inMask:false,cherries:false};
 for(const period of [0,69000]){const svg=tree[2].map(node=>serialize(node,context,0,period)).join('');assert.equal((svg.match(/translate\(-71\.360875 32\.102\) scale\(1\.06785\)/g)||[]).length,3);}
 assert.ok(fs.readFileSync(path.join(root,'generate-motion-icons.cjs'),'utf8').includes("dark?'#f0e9dd':'#171612'"));
 assert.ok(fs.readFileSync(path.join(root,'generate-static-icons.cjs'),'utf8').includes("dark?'#f0e9dd':'#171612'"));
 console.log('B3: six looping WebP assets and six fallback stills verified; Home W geometry and dark ink verified in generator.');
})().catch(e=>{console.error(e);process.exitCode=1;});
