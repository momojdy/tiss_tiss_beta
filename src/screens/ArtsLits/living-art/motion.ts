// Pure V73 motion model (no React / native imports) so it can be unit-checked in Node.
export type SvgNode = [string, Record<string,string>, Array<SvgNode|string>];
export type Track = { kind:'pose'|'opacity'|'dash'|'hue'; duration:number; offset:number; times:number[]; values:number[][]; splines?:number[][]; discrete?:boolean; origin?:[number,number] };
export type MotionProps = {transform?:string;opacity?:number;strokeDashoffset?:number;values?:number[]|string};
const ease=[.42,0,.58,1];
const swordEase=[.22,.65,.33,1];
const identity=[0,0,0,1,1];
export const nums=(value:string)=>value.trim().split(/[\s,]+/).map(Number);
function cssTrack(kind:Track['kind'],duration:number,times:number[],values:number[][],offset=0,curve?:number[],origin?:[number,number]):Track {
  return {kind,duration,offset,times,values,splines:curve?times.slice(1).map(()=>curve):undefined,origin};
}
const rotate=(deg:number)=>[0,0,deg,1,1];
const pose=(x:number,y:number,r=0,sx=1,sy=1)=>[x,y,r,sx,sy];
function smil(a:Record<string,string>):Track {
  const values=a.values.split(';').map(nums);
  const times=a.keyTimes?a.keyTimes.split(';').map(Number):values.map((_,i)=>i/(values.length-1));
  const config={duration:parseFloat(a.dur)*1000,offset:-(parseFloat(a.begin??'0')||0)*1000,times,splines:a.keySplines?.split(';').map(nums),discrete:a.calcMode==='discrete'};
  if(a.attributeName==='transform') return {...config,kind:'pose',values:values.map(v=>a.type==='scale'?pose(0,0,0,v[0],v[1]??v[0]):pose(v[0],v[1]??0))};
  return {...config,kind:a.attributeName==='values'?'hue':'opacity',values};
}
export function motionFor(node:SvgNode,parentClass:string):Track[] {
  const [tag,a,children]=node, cls=a.class??'';
  const tracks=children.filter((c):c is SvgNode=>typeof c!=='string'&&(c[0]==='animate'||c[0]==='animateTransform')).map(c=>smil(c[1]));
  if(cls==='neo-needle') tracks.push(cssTrack('pose',29000,[0,.72,.75,.8,.85,1],[rotate(0),rotate(0),rotate(-18),rotate(15),rotate(0),rotate(0)],0,ease,[36,33]));
  if(cls==='v25-tree') tracks.push(cssTrack('pose',8600,[0,.18,.42,.67,.84,1],[0,-.75,.55,-.4,.18,0].map(rotate),0,ease,[410.862,268.852]));
  if(cls==='v25-cherries') tracks.push(cssTrack('pose',7000,[0,.2,.45,.68,.86,1],[identity,pose(-1,-1,-1.55),pose(1,0,1.1),pose(-1,1,-.95),pose(0,-1,.45),identity],0,ease,[399.974,126.906]));
  if(cls==='v31-petal'){
    const vars=Object.fromEntries((a.style??'').split(';').map(v=>v.split(':')));
    const duration=parseFloat(vars['--duration'])*1000,offset=-parseFloat(vars['--delay'])*1000,drift=parseFloat(vars['--drift']);
    tracks.push(cssTrack('pose',duration,[0,.16,.18,.32,.48,.65,.8,.94,1],[identity,identity,identity,pose(drift,18),pose(-6,45),pose(10,80),pose(drift,112),pose(4,150),pose(4,150)],offset));
    tracks.push(cssTrack('opacity',duration,[0,.16,.18,.32,.48,.65,.8,.94,1],[[0],[0],[.95],[.95],[.9],[.86],[.65],[0],[0]],offset));
  }
  if(cls==='v31-petal-shape') tracks.push(cssTrack('pose',1900,[0,.5,1],[pose(0,0,-25,.82),pose(0,0,48,.38),pose(0,0,-25,.82)],0,ease));
  if(cls==='home-slash') tracks.push(cssTrack('opacity',23000,[0,.82,.83,.85,.88,1],[[0],[0],[.48],[.65],[0],[0]],0,swordEase));
  if(parentClass==='home-slash'&&tag==='path') tracks.push(cssTrack('dash',23000,[0,.82,.83,.85,.88,1],[[400],[400],[400],[0],[0],[400]],0,swordEase));
  return tracks;
}
function cubic(t:number,p1:number,p2:number){const q=1-t;return 3*q*q*t*p1+3*q*t*t*p2+t*t*t;}
function easeAt(x:number,curve?:number[]){if(!curve)return x;let l=0,r=1;for(let i=0;i<10;i++){const m=(l+r)/2;if(cubic(m,curve[0],curve[2])<x)l=m;else r=m;}return cubic((l+r)/2,curve[1],curve[3]);}
export function sample(track:Track,clock:number):number[]{
  const local=clock+track.offset, t=local<=0?0:(local%track.duration)/track.duration;
  let i=0;while(i<track.times.length-2&&t>=track.times[i+1])i++;
  const a=track.values[i],b=track.values[i+1],start=track.times[i],end=track.times[i+1];
  if(track.discrete||t<=start)return a;
  const f=easeAt(Math.min(1,(t-start)/(end-start)),track.splines?.[i]);
  return a.map((v,j)=>v+(b[j]-v)*f);
}
export function matrix(v:number[],origin?:[number,number]):number[]{
  const [x,y,deg,sx,sy]=v,theta=deg*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  const a=c*sx,b=s*sx,d=c*sy,k=-s*sy,ox=origin?.[0]??0,oy=origin?.[1]??0;
  return [a,b,k,d,x+ox-a*ox-k*oy,y+oy-b*ox-d*oy];
}
const r5=(n:number)=>Math.round(n*1e5)/1e5;
// Props for one node at time `clock` (ms). Plain JS props, rendered through normal React updates:
// react-native-svg only accepts transform/matrix on <G> through its JS prop extraction, which animatedProps bypass.
export function motionProps(tracks:Track[],clock:number,hueAsString:boolean):MotionProps {
  const out:MotionProps={};
  for(const track of tracks){const v=sample(track,clock);switch(track.kind){
    case 'pose':out.transform='matrix('+matrix(v,track.origin).map(r5).join(',')+')';break;
    case 'opacity':out.opacity=r5(v[0]);break;
    case 'dash':out.strokeDashoffset=r5(v[0]);break;
    case 'hue':out.values=hueAsString?String(v[0]):[v[0]];break;
  }}
  return out;
}
