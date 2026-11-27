// Lossless frame packing only: preserve the approved WebP pixels and delays.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
(async()=>{
 const manifest={columns:11,frames:0,frameWidth:0,frameHeight:0,durationMs:0,frameEndsMs:[],themes:{}};
 for(const theme of ['light','dark']){
  const source=fs.readFileSync(path.join(__dirname,`home-motion-${theme}.webp`));
  const metadata=await sharp(source,{animated:true}).metadata();
  const {data}=await sharp(source,{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const width=metadata.width,height=metadata.pageHeight,frames=metadata.pages,rows=Math.ceil(frames/manifest.columns);
  const ends=[];let elapsed=0;for(const delay of metadata.delay)ends.push(elapsed+=delay);
  if(theme==='light')Object.assign(manifest,{frames,frameWidth:width,frameHeight:height,durationMs:elapsed,frameEndsMs:ends});
  else if(JSON.stringify(ends)!==JSON.stringify(manifest.frameEndsMs)||width!==manifest.frameWidth||height!==manifest.frameHeight)throw Error('Home timelines must match');
  const atlasWidth=width*manifest.columns,atlasHeight=height*rows,atlas=Buffer.alloc(atlasWidth*atlasHeight*4);
  for(let frame=0;frame<frames;frame++)for(let y=0;y<height;y++){
   const start=(frame*height+y)*width*4,dest=((Math.floor(frame/manifest.columns)*height+y)*atlasWidth+frame%manifest.columns*width)*4;
   data.copy(atlas,dest,start,start+width*4);
  }
  const filename=`home-atlas-${theme}.png`;
  const png=await sharp(atlas,{raw:{width:atlasWidth,height:atlasHeight,channels:4}}).png({compressionLevel:9}).toBuffer();
  fs.writeFileSync(path.join(__dirname,filename),png);
  manifest.themes[theme]={file:filename,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sha256:crypto.createHash('sha256').update(png).digest('hex')};
  console.log(theme,frames,'unchanged frames,',png.length,'bytes');
 }
 fs.writeFileSync(path.join(__dirname,'home-motion-atlas.json'),JSON.stringify(manifest,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
