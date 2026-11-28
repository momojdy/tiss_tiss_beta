import type {Point} from './model';
export type ScreenPoint={x:number;y:number};
const distance=(a:ScreenPoint,b:ScreenPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p:ScreenPoint,a:ScreenPoint,b:ScreenPoint){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;const t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function simplify(a:ScreenPoint[],tolerance:number):ScreenPoint[]{if(a.length<=2)return a;let max=0,index=0;for(let i=1;i<a.length-1;i++){const d=segmentDistance(a[i],a[0],a[a.length-1]);if(d>max){index=i;max=d}}if(max<=tolerance)return [a[0],a[a.length-1]];return [...simplify(a.slice(0,index+1),tolerance).slice(0,-1),...simplify(a.slice(index),tolerance)]}
export function screenArea(a:ScreenPoint[]){return Math.abs(a.reduce((s,p,i)=>{const q=a[(i+1)%a.length];return s+p.x*q.y-p.y*q.x},0))/2}
// Treat every gesture as a fresh closed polygon. Do not join separate finger strokes.
export function finishStroke(raw:ScreenPoint[]):ScreenPoint[]{
 const clean:ScreenPoint[]=[];for(const p of raw){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;if(!clean.length||distance(clean[clean.length-1],p)>=1)clean.push(p)}
 if(clean.length>3&&distance(clean[0],clean[clean.length-1])<10)clean.pop();
 if(clean.length<3)return [];
 let a=simplify(clean,2.5),tol=2.5;
 while(a.length>120){tol*=1.5;a=simplify(clean,tol)}
 return a.length>=3&&screenArea(a)>=50?a:[];
}
export function boundaryCoordinatesValid(a:Point[]){return a.length>=3&&a.length<=120&&a.every(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180)}
