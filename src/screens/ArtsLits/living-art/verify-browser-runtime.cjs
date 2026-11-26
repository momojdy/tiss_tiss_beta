// Tests the decorative SVG browser runtime against the real V73 source trees.
// This is a simulated DOM and clock, not a native scroll or screenshot test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function readDefault(file){const source=fs.readFileSync(path.join(__dirname,file),'utf8');return JSON.parse(source.split('export default ')[1].trim().replace(/;$/,''));}
const js=readDefault('browser-runtime.ts');
const trees=Object.fromEntries(['Home','Artrium','Library'].map(name=>[name,JSON.parse(readDefault(name.toLowerCase()+'-v73.ts'))]));
function run(dark,reduced){
 const scenes=Object.keys(trees).map(name=>({name,dark,reduced,tree:trees[name],width:100,height:100,left:0,top:0,viewBox:'0 0 500 500',color:dark?'#f2e6d2':'#171612',frameMs:name==='Library'?50:66}));
 const queue=new Map();let id=0,count=0,writes=0,ready=0;
 function el(tag){count++;return {tag,attrs:{},style:{},children:[],setAttribute(k,v){this.attrs[k]=v;writes++;},setAttributeNS(ns,k,v){this.attrs[k]=v;writes++;},appendChild(ch){this.children.push(ch);}};}
 const document={body:el('body'),getElementById:()=>({textContent:JSON.stringify(scenes)}),createElementNS:(ns,t)=>el(t)};
 const window={ReactNativeWebView:{postMessage(s){if(s==='ready')ready++;}}};
 const raf=fn=>{queue.set(++id,fn);return id;};const cancel=i=>queue.delete(i);
 function tick(t){const entries=[...queue];queue.clear();entries.forEach(([,fn])=>fn(t));}
 new Function('document','window','requestAnimationFrame','cancelAnimationFrame',js)(document,window,raf,cancel);
 for(let i=0;i<10;i++)tick(i*16);
 assert.equal(ready,1);assert.equal(document.body.children.length,3);
 const all=[];function walk(n){all.push(n);n.children.forEach(walk);}walk(document.body);
 const w=all.filter(n=>n.attrs.transform==='translate(-71.360875 9.416) scale(1.06785)');assert.equal(w.length,3);
 const ids=all.map(n=>n.attrs.id).filter(Boolean);assert.equal(new Set(ids).size,ids.length);
 const initial=writes;window.setArtPaused(false);for(let i=0;i<90;i++)tick(i*16+200);assert.ok(writes>initial);
 window.setArtPaused(true);const paused=writes;for(let i=0;i<40;i++)tick(2000+i*16);assert.equal(writes,paused);assert.equal(queue.size,0);
 window.setArtPaused(false);for(let i=0;i<20;i++)tick(3000+i*16);assert.ok(writes>paused);window.setArtPaused(true);assert.equal(queue.size,0);
 return {dark,reduced,nodes:count,animatedAttributeWrites:writes-initial};
}
const results=[run(false,false),run(true,false),run(false,true),run(true,true)];

console.log('V73 decorative browser runtime: mount, unique IDs, W geometry, motion/pause/resume, both themes and reduced motion source variants',results);
