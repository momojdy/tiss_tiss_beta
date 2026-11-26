// Pure fluid-front geometry, independent of React Native. Angles are sampled
// in real screen coordinates (no stretched SVG or uniformly scaled silhouette).
export const SPILL_SPREAD_MS=1650;
export const SPILL_REVEAL_MS=360;
export const SPILL_SAMPLES=32;
export function spillProgress(t:number){return Math.max(0,Math.min(1,t));}
export function spillFrontRadius(diagonal:number,t:number,angle:number,lead=0){
 t=spillProgress(t);
 // A slow start, advancing lobes and a gradual final catch-up.
 const advance=.009+.991*(t+.095*Math.sin(Math.PI*t));
 const texture=(.16*Math.sin(5*angle-4.8*t+.8)+.075*Math.sin(11*angle+7.5*t-.7)+.035*Math.sin(19*angle-10*t+1.2));
 const tongue=.13*Math.pow(Math.max(0,Math.cos(3.8*angle-2.4*t+.3)),6);
 const envelope=Math.sin(Math.PI*Math.min(1,t*.96+.025));
 return diagonal*(1.26*advance*(1+envelope*(texture+tongue))+lead*Math.sin(Math.PI*t)*(.35+.65*advance));
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
