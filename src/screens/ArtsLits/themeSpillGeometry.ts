// Pure fluid-front geometry, independent of React Native. Angles are sampled
// in real screen coordinates (no stretched SVG or uniformly scaled silhouette).
export const SPILL_SPREAD_MS=5640;
export const SPILL_REVEAL_MS=360;
export const SPILL_SAMPLES=32;
export const SPILL_EDGE_WIDTH=.045;
// Keep a bounded number of native wet-edge layers; the foreground samples
// these exact cumulative opacities to stay readable as the paper passes.
export const SPILL_EDGE_LAYERS=[
 {lead:.12,opacity:.12},
 {lead:.08,opacity:.22},
 {lead:.04,opacity:.42},
 {lead:0,opacity:1},
] as const;
// Keep the visual clock advancing even when a JS/native render is delayed.
// A dropped frame must not turn a six-second spill into a sudden theme snap.
export const SPILL_MAX_FRAME_MS=50;
export function advanceSpillElapsed(elapsed:number,delta:number){
 return Math.min(SPILL_SPREAD_MS+SPILL_REVEAL_MS,elapsed+Math.max(0,Math.min(SPILL_MAX_FRAME_MS,delta)));
}
export function spillProgress(t:number){return Math.max(0,Math.min(1,t));}
export function spillFrontRadius(diagonal:number,t:number,angle:number,lead=0){
 t=spillProgress(t);
 // Zero area at launch, continuously deforming lobes, and corner coverage
 // only near the end. Every ray advances instead of retreating or flooding
 // the whole viewport early. Wet edges vanish as the main front catches up.
 const texture=.32*Math.sin(5*angle-2*t+.8)+.12*Math.sin(11*angle+2.5*t-.7)+.06*Math.sin(19*angle-3.2*t+1.2);
 const tongue=.10*Math.pow(Math.max(0,Math.cos(3.8*angle-1.8*t+.3)),4);
 return diagonal*(1.001*t+t*(1-t)*(texture+tongue)+lead*4*t*(1-t));
}
type Point={x:number;y:number};
const fmt=(v:number)=>String(Math.round(v*10)/10);
export function spillFrontPoints(width:number,height:number,t:number,lead=0):Point[]{
 const diagonal=Math.hypot(width,height);
 return Array.from({length:SPILL_SAMPLES+1},(_,i)=>{
  const angle=i/SPILL_SAMPLES*Math.PI/2;
  const radius=spillFrontRadius(diagonal,t,angle,lead);
  return {x:i===SPILL_SAMPLES?0:radius*Math.cos(angle),y:i===0?0:radius*Math.sin(angle)};
 });
}
export function spillPath(width:number,height:number,t:number,lead=0){
 if(t>=1)return `M0 0H${fmt(width)}V${fmt(height)}H0Z`;
 const points=spillFrontPoints(width,height,t,lead);
 let path=`M0 0L${fmt(points[0].x)} 0`;
 // Smooth cubic interpolation through the constantly deforming fluid front.
 for(let i=0;i<points.length-1;i++){
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  const c1={x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6};
  const c2={x:c.x-(d.x-b.x)/6,y:c.y-(d.y-b.y)/6};
  path+=`C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(c.x)} ${fmt(c.y)}`;
 }
 return path+'Z';
}

// The same moving front drives the paper and the actual live content colors.
export type WaveBounds={x:number;y:number;width:number;height:number};
export function waveAmount(width:number,height:number,x:number,y:number,t:number){
 t=spillProgress(t);if(t===0||t===1)return t;
 const diagonal=Math.max(1,Math.hypot(width,height));
 x=Math.max(0,Math.min(width,x));y=Math.max(0,Math.min(height,y));
 const radius=spillFrontRadius(diagonal,t,Math.atan2(y,x));
 const band=Math.max(.001,diagonal*SPILL_EDGE_WIDTH*4*t*(1-t));
 const u=spillProgress((radius-Math.hypot(x,y)+band)/(2*band));
 return u*u*(3-2*u);
}
export function mixColor(from:string,to:string,t:number){
 t=spillProgress(t);if(t===0||from===to)return from;if(t===1)return to;
 const read=(s:string)=>{
  if(/^#[\da-f]{6}$/i.test(s))return [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16),1];
  if(/^#[\da-f]{8}$/i.test(s))return [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16),parseInt(s.slice(7,9),16)/255];
  const m=s.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/i);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;
 };
 const a=read(from),b=read(to);if(!a||!b)return t<.5?from:to;
 const v=a.map((n,i)=>n+(b[i]-n)*t);
 return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${Math.round(v[3]*1000)/1000})`;
}

// Keep theme-dependent foregrounds legible while their colors cross.
// Interpolating light paper and dark ink simultaneously otherwise makes
// them converge to the same gray around the middle of a transition.
function rgbLuminance(color:string){
 const hex=color.match(/^#([\da-f]{6})$/i);
 const m=color.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/i);
 const rgb=hex?[0,2,4].map(i=>parseInt(hex[1].slice(i,i+2),16)):m?[+m[1],+m[2],+m[3]]:null;
 if(!rgb)return null;
 const linear=rgb.map(n=>{const v=n/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});
 return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}
export function contrastRatio(a:string,b:string){
 const x=rgbLuminance(a),y=rgbLuminance(b);return x===null||y===null?0:(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function readableColor(preferred:string,background:string,alternatives:readonly string[],minimum=4.5){
 if(contrastRatio(preferred,background)>=minimum)return preferred;
 for(const c of alternatives)if(contrastRatio(c,background)>=minimum)return c;
 return ['#111111','#ffffff','#000000'].reduce((best,c)=>contrastRatio(c,background)>contrastRatio(best,background)?c:best);
}
export function paperWaveAmount(width:number,height:number,x:number,y:number,t:number){
 t=spillProgress(t);if(t===0||t===1)return t;
 x=Math.max(0,Math.min(width,x));y=Math.max(0,Math.min(height,y));
 const d=Math.max(1,Math.hypot(width,height)),a=Math.atan2(y,x),r=Math.hypot(x,y);
 const radius=spillFrontRadius(d,t,a),leadScale=d*4*t*(1-t);
 let amount=0;
 for(const layer of SPILL_EDGE_LAYERS){
  if(r<=radius+leadScale*layer.lead)amount+=layer.opacity*(1-amount);
 }
 return amount;
}

// Rasterize the SAME cubic liquid outline into ordinary native background
// bands. No SVG surface, native mask, or screenshot can cover the live page.
export type SpillBand={left:number;top:number;width:number;height:number;key:string};
export function spillBands(width:number,height:number,t:number,lead=0):SpillBand[]{
 if(width<=0||height<=0||t<=0)return [];
 if(t>=1)return [{left:0,top:0,width,height,key:'full'}];
 const points=spillFrontPoints(width,height,t,lead);
 const polygon:Point[]=[{x:0,y:0},points[0]];
 for(let i=0;i<points.length-1;i++){
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  const c1={x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6};
  const c2={x:c.x-(d.x-b.x)/6,y:c.y-(d.y-b.y)/6};
  for(let j=1;j<=4;j++){const u=j/4,v=1-u;polygon.push({x:v*v*v*b.x+3*v*v*u*c1.x+3*v*u*u*c2.x+u*u*u*c.x,y:v*v*v*b.y+3*v*v*u*c1.y+3*v*u*u*c2.y+u*u*u*c.y});}
 }
 polygon.push({x:0,y:0});
 const step=Math.max(3,Math.ceil(height/180)),out:SpillBand[]=[];
 for(let top=0;top<height;top+=step){
  const h=Math.min(step,height-top),y=top+h/2,crossings:number[]=[];
  for(let i=0;i<polygon.length-1;i++){
   const a=polygon[i],b=polygon[i+1];
   if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y))crossings.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
  }
  crossings.sort((a,b)=>a-b);
  for(let j=0;j+1<crossings.length;j+=2){
   const left=Math.max(0,Math.min(width,crossings[j])),right=Math.max(0,Math.min(width,crossings[j+1]));
   if(right>left)out.push({left,top,width:right-left,height:h,key:top+':'+j});
  }
 }
 return out;
}
