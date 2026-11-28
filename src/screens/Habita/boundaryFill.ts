import type {Point} from './model';
export type XY={x:number;y:number};
type Edge={id:number;a:XY;b:XY};
const cross=(a:XY,b:XY)=>a.x*b.y-a.y*b.x;
const sub=(a:XY,b:XY):XY=>({x:a.x-b.x,y:a.y-b.y});
// Partition the even-odd interior into nonoverlapping trapezoids. Intersections
// are sweep events, so a crossing never creates an area outside the trace.
// Adjacent slabs with the same bounding edges are merged.
export function evenOddCells(input:XY[]):XY[][]{
 if(input.length<3||input.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return [];
 const origin=input[0],a=input.map(p=>sub(p,origin));
 const extent=Math.max(...a.map(p=>Math.max(Math.abs(p.x),Math.abs(p.y))),1e-12),eps=extent*1e-10;
 const edges:Edge[]=a.map((p,i)=>({id:i,a:p,b:a[(i+1)%a.length]})).filter(e=>Math.abs(e.a.y-e.b.y)>eps);
 const ys=a.map(p=>p.y);
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
  const e=edges[i],f=edges[j],u=sub(e.b,e.a),v=sub(f.b,f.a),w=sub(f.a,e.a),den=cross(u,v);
  if(Math.abs(den)<=extent*extent*1e-14)continue;
  const t=cross(w,v)/den,k=cross(w,u)/den;
  if(t>0&&t<1&&k>0&&k<1)ys.push(e.a.y+t*u.y);
 }
 ys.sort((x,y)=>x-y);
 const levels=ys.filter((y,i)=>!i||y-ys[i-1]>eps);
 const xAt=(e:Edge,y:number)=>e.a.x+(y-e.a.y)*(e.b.x-e.a.x)/(e.b.y-e.a.y);
 type Band={l:Edge;r:Edge;lo:number;hi:number};
 let active=new Map<string,Band>();const bands:Band[]=[];
 for(let i=0;i+1<levels.length;i++){
  const lo=levels[i],hi=levels[i+1],mid=(lo+hi)/2;
  if(hi-lo<=eps)continue;
  const hits=edges.filter(e=>mid>Math.min(e.a.y,e.b.y)&&mid<Math.max(e.a.y,e.b.y)).sort((e,f)=>xAt(e,mid)-xAt(f,mid)||e.id-f.id);
  const next=new Map<string,Band>();
  for(let j=0;j+1<hits.length;j+=2){
   const l=hits[j],r=hits[j+1];if(xAt(r,mid)-xAt(l,mid)<=eps)continue;
   const key=l.id+':'+r.id,prior=active.get(key);
   if(prior&&Math.abs(prior.hi-lo)<=eps){prior.hi=hi;next.set(key,prior)}else next.set(key,{l,r,lo,hi});
  }
  for(const [key,b] of active)if(next.get(key)!==b)bands.push(b);
  active=next;
 }
 bands.push(...active.values());
 return bands.map(({l,r,lo,hi})=>[{x:xAt(l,lo),y:lo},{x:xAt(r,lo),y:lo},{x:xAt(r,hi),y:hi},{x:xAt(l,hi),y:hi}].filter((p,i,arr)=>!i||Math.hypot(p.x-arr[i-1].x,p.y-arr[i-1].y)>eps).map(p=>({x:p.x+origin.x,y:p.y+origin.y}))).filter(p=>p.length>=3);
}
export function enclosedArea(a:XY[]):number{
 return evenOddCells(a).reduce((sum,cell)=>{const o=cell[0];return sum+Math.abs(cell.reduce((s,p,i)=>s+cross(sub(p,o),sub(cell[(i+1)%cell.length],o)),0))/2},0);
}
export function geographicCells(a:Point[]):Point[][]{return evenOddCells(a.map(p=>({x:p.longitude,y:p.latitude}))).map(cell=>cell.map(p=>({latitude:p.y,longitude:p.x})))}
