// Offline editorial grade. Never called from the app's render or scroll paths.
const treatments={Home:{saturation:.76,texture:.15},Artrium:{saturation:.69,texture:.20},Library:{saturation:.80,texture:.13},Bazaar:{saturation:.65,texture:.16}};
function editorialGrade(raw,width,height,name){
 const t=treatments[name];if(!t||raw.length!==width*height*4)throw Error('Invalid RGBA frame');
 const src=Uint8Array.from(raw), out=Uint8Array.from(raw);
 const chroma=(r,g,b)=>Math.max(r,g,b)-Math.min(r,g,b);
 const clamp=x=>Math.max(0,Math.min(1,x));
 const protectedHome=(r,g,b)=>chroma(r,g,b)<=34;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,a=src[i+3];if(!a)continue;
  const r=src[i],g=src[i+1],b=src[i+2],c=chroma(r,g,b);
  // Preserve the approved cream W, dark ink, and near-neutral antialiasing.
  if(name==='Home'&&protectedHome(r,g,b))continue;
  let v=[r,g,b];const sum=[r,g,b];let count=1;
  // Edge-aware microtexture reduction: same opaque interior, never silhouette or alpha.
  if(a>=245&&x>0&&x<width-1&&y>0&&y<height-1){
   for(const j of [i-4,i+4,i-width*4,i+width*4]){
    if(src[j+3]<245||Math.abs(src[j+3]-a)>5)continue;
    if(name==='Home'&&protectedHome(src[j],src[j+1],src[j+2]))continue;
    if(Math.max(Math.abs(src[j]-r),Math.abs(src[j+1]-g),Math.abs(src[j+2]-b))>25)continue;
    for(let k=0;k<3;k++)sum[k]+=src[j+k];count++;
   }
   v=v.map((u,k)=>u+(sum[k]/count-u)*t.texture);
  }
  // Stronger chroma reduction on vivid pigments; keep paper and charcoal tonal detail.
  const weight=clamp((c-20)/75),factor=1-(1-t.saturation)*weight;
  const l=.2126*v[0]+.7152*v[1]+.0722*v[2];
  for(let k=0;k<3;k++)out[i+k]=Math.round(l+(v[k]-l)*factor);
 }
 return out;
}
module.exports={editorialGrade,treatments};
