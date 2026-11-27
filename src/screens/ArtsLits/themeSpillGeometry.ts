// Pure fluid-front geometry, independent of React Native. Angles are sampled
// in real screen coordinates (no stretched SVG or uniformly scaled silhouette).
export const SPILL_SPREAD_MS=2820;
export const SPILL_REVEAL_MS=180;
export const SPILL_SAMPLES=64;
export const SPILL_EDGE_WIDTH=.012;
// A narrow translucent meniscus, with no wide contour rings. The foreground
// samples these exact opacities to stay readable as the waterline passes.
export const SPILL_EDGE_LAYERS=[
 {lead:.008,opacity:.08},
 {lead:.003,opacity:.18},
 {lead:0,opacity:1},
] as const;
// Follow elapsed time so scrolling or a delayed frame cannot lengthen the
// requested three-second transition.
export function advanceSpillElapsed(elapsed:number,delta:number){
 return Math.min(SPILL_SPREAD_MS+SPILL_REVEAL_MS,elapsed+Math.max(0,delta));
}
export function spillProgress(t:number){return Math.max(0,Math.min(1,t));}
export function spillFrontRadius(diagonal:number,t:number,angle:number,lead=0){
 t=spillProgress(t);
 // Zero area at launch, continuously deforming lobes, and corner coverage
 // only near the end. Every ray advances instead of retreating or flooding
 // the whole viewport early. Wet edges vanish as the main front catches up.
 const texture=.28*Math.sin(3*angle-1.4*t+.8)+.085*Math.sin(7*angle+1.8*t-.7);
 const tongue=.07*Math.pow(Math.max(0,Math.cos(2.2*angle-1.4*t+.3)),4);
 return diagonal*(1.001*t+t*(1-t)*(texture+tongue)+lead*4*t*(1-t));
}
type Point={x:number;y:number};
const fmt=(v:number)=>String(Math.round(v*1000)/1000);
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
