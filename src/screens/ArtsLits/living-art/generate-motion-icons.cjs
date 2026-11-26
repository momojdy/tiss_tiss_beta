// Render the original V73 motion offline into small, transparent, looping WebP files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {loadTS,geometry,serialize}=require('./generate-static-icons.cjs');
const {nums}=loadTS('motion.ts');
const {editorialGrade}=require('./editorial-grade.cjs');
const periods={Home:23000,Artrium:27000,Library:9800};
(async()=>{
 const manifest={};
 for(const [name,[w,h,pad,viewBox]] of Object.entries(geometry)){
  const filename=name.toLowerCase()+'-v73.ts',tree=JSON.parse(loadTS(filename).default);
  const [x,y,vw,vh]=nums(viewBox),s=Math.min(w/vw,h/vh),expanded=[x-(w/s-vw)/2-pad/s,y-(h/s-vh)/2-pad/s,(w+2*pad)/s,(h+2*pad)/s].join(' ');
  const W=(w+2*pad)*2,H=(h+2*pad)*2,period=periods[name],duration=Math.round(period/3),count=Math.round(duration/100);
  const delay=Array.from({length:count},(_,i)=>Math.round((i+1)*duration/count)-Math.round(i*duration/count));
  for(const dark of [false,true]){
   const color=name==='Home'?(dark?'#f0e9dd':'#171612'):(dark?'#f0e9dd':'#222522');
   const frames=[];
   for(let i=0;i<count;i++){
    const clock=i*period/count;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="'+expanded+'" color="'+color+'">'+tree[2].map(n=>serialize(n,{name,dark,parentClass:'',inMask:false,cherries:false},clock,period)).join('')+'</svg>';
    const frame=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    frames.push(Buffer.from(editorialGrade(frame,W,H,name)));
   }
   const out=name.toLowerCase()+'-motion-'+(dark?'dark':'light')+'.webp';
   const b=await sharp(Buffer.concat(frames),{raw:{width:W,height:H*frames.length,channels:4,pageHeight:H}}).webp({quality:82,alphaQuality:95,loop:0,delay,effort:2}).toBuffer();
   const info=await sharp(b,{animated:true}).metadata();
   if(info.pages<2||info.pageHeight!==H||info.loop!==0)throw Error('Invalid animation '+out);
   fs.writeFileSync(path.join(__dirname,out),b);
   manifest[out]={source:filename,width:W,height:H,frames:info.pages,durationMs:info.delay.reduce((a,b)=>a+b,0),sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length};
   console.log(out,manifest[out]);
  }
 }
 fs.writeFileSync(path.join(__dirname,'motion-assets-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
