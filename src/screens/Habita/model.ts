// Homepage-only domain. All amounts in this V17 fixture are original USD; all areas are m².
export const units={m2:{label:'Square meters',symbol:'m²',factor:1},ft2:{label:'Square feet',symbol:'ft²',factor:.09290304},yd2:{label:'Square yards',symbol:'yd²',factor:.83612736},ac:{label:'Acres',symbol:'ac',factor:4046.8564224},ha:{label:'Hectares',symbol:'ha',factor:10000},are:{label:'Ares',symbol:'a',factor:100},ca:{label:'Centiares',symbol:'ca',factor:1},cx:{label:'Carreaux (Haiti)',symbol:'cx',factor:12900},centieme:{label:'Centièmes (Haiti)',symbol:'centièmes',factor:129},tarea:{label:'Tareas (Dominican Republic)',symbol:'tareas',factor:628.86}} as const;
export type Unit=keyof typeof units;
export type Country='HT'|'DO';
export type Kind='house'|'apt'|'villa'|'land'|'commercial'|'studio';
export type Mode='sale'|'rent';
export type Listing={id:string;country:Country;mode:Mode;type:Kind;price:number;currency:'USD';title:string;city:string;beds:number;baths:number;size:number;tour:boolean;img:number;lat:number;lon:number;order:number;survey:'reported'|'missing'|null};
export type Point={latitude:number;longitude:number};
export type Region=Point&{latitudeDelta:number;longitudeDelta:number};
export type Geo={kind:'rect';north:number;south:number;east:number;west:number}|{kind:'polygon';points:Point[]};
export type Filters={country:Country|'ALL';mode:Mode;type:Kind|'all';min:number|null;max:number|null;size:number|null;sizeMax:number|null;beds:number|null;survey:''|'reported'|'missing';tour:boolean;q:string;sort:'recommended'|'new'|'low'|'high';geo:Geo|null};
export const defaultFilters:Filters={country:'ALL',mode:'sale',type:'all',min:null,max:null,size:null,sizeMax:null,beds:null,survey:'',tour:false,q:'',sort:'recommended',geo:null};
export const overview:Region={latitude:18.9,longitude:-70.55,latitudeDelta:5.1,longitudeDelta:7.1};
export const categories=[['house','Houses',1],['apt','Apartments',3],['villa','Villas',6],['land','Land',2],['commercial','Commercial',19]] as const;
export const countryName=(c:Country)=>c==='HT'?'Haiti':'Dominican Republic';
export const place=(p:Listing)=>p.city+', '+countryName(p.country);
export const residential=(t:Kind|'all')=>['house','apt','villa','studio'].includes(t);
const areaKind=(t:Kind|'all')=>t==='land'?'land':t==='commercial'?'commercial':t==='all'?'mixed':'residential';
export function changeType(f:Filters,type:Filters['type']):Filters{const reset=areaKind(f.type)!==areaKind(type);return {...f,type,size:reset?null:f.size,sizeMax:reset?null:f.sizeMax,beds:type==='land'||type==='commercial'?null:f.beds,survey:type==='land'?f.survey:''};}
export const isSearching=(f:Filters)=>f.country!=='ALL'||f.mode!=='sale'||f.type!=='all'||f.min!==null||f.max!==null||f.size!==null||f.sizeMax!==null||f.beds!==null||!!f.survey||f.tour||!!f.q.trim()||!!f.geo;
export const toM2=(amount:number,u:Unit)=>amount*units[u].factor;
export const fromM2=(amount:number,u:Unit)=>amount/units[u].factor;
export function validRange(min:number|null,max:number|null){return (min===null||Number.isFinite(min)&&min>=0)&&(max===null||Number.isFinite(max)&&max>=0)&&(min===null||max===null||min<=max);}
export function areaNumber(n:number,u:Unit){const v=fromM2(n,u);return v.toLocaleString('en-US',{maximumFractionDigits:v>0&&v<.01?8:v<1?5:v<100?3:2});}
export const areaText=(n:number,u:Unit)=>areaNumber(n,u)+' '+units[u].symbol;
export const specs=(p:Listing,u:Unit)=>p.type==='land'?areaText(p.size,u)+' land':p.type==='commercial'?areaText(p.size,u)+' floor area':p.beds+' bd · '+p.baths+' ba · '+areaText(p.size,u);
export const money=(n:number)=>'$'+n.toLocaleString('en-US');
export const pricePerArea=(p:Listing,u:Unit)=>p.size>0?p.price*units[u].factor/p.size:null;
export const regionGeo=(r:Region):Geo=>({kind:'rect',north:r.latitude+r.latitudeDelta/2,south:r.latitude-r.latitudeDelta/2,east:r.longitude+r.longitudeDelta/2,west:r.longitude-r.longitudeDelta/2});
export function matchesGeo(p:Listing,g:Geo|null){if(!g)return true;if(g.kind==='rect')return p.lat>=g.south&&p.lat<=g.north&&p.lon>=g.west&&p.lon<=g.east;const a=g.points;if(a.length<3)return false;let inside=false;for(let i=0,j=a.length-1;i<a.length;j=i++){const x=a[i].longitude,y=a[i].latitude,X=a[j].longitude,Y=a[j].latitude;const cross=(p.lon-x)*(Y-y)-(p.lat-y)*(X-x);if(Math.abs(cross)<1e-10&&p.lon>=Math.min(x,X)-1e-10&&p.lon<=Math.max(x,X)+1e-10&&p.lat>=Math.min(y,Y)-1e-10&&p.lat<=Math.max(y,Y)+1e-10)return true;if((y>p.lat)!==(Y>p.lat)&&p.lon<(X-x)*(p.lat-y)/(Y-y)+x)inside=!inside;}return inside;}
const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function mixed(a:Listing[]){const h=a.filter(p=>p.country==='HT'),d=a.filter(p=>p.country==='DO');return Array.from({length:Math.max(h.length,d.length)},(_,i)=>[h[i],d[i]]).flat().filter((p):p is Listing=>!!p);}
export function results(list:readonly Listing[],f:Filters){const a=list.filter(p=>(f.country==='ALL'||p.country===f.country)&&p.mode===f.mode&&(f.type==='all'||p.type===f.type||f.type==='apt'&&p.type==='studio')&&(f.min===null||p.price>=f.min)&&(f.max===null||p.price<=f.max)&&(f.size===null||p.size>=f.size-1e-12*Math.max(1,f.size))&&(f.sizeMax===null||p.size<=f.sizeMax+1e-12*Math.max(1,f.sizeMax))&&(f.beds===null||residential(p.type)&&p.beds>=f.beds)&&(!f.survey||p.survey===f.survey)&&(!f.tour||p.tour)&&(!f.q.trim()||norm([p.city,p.title,p.type,countryName(p.country),p.country==='DO'?'DR República Dominicana':'Haïti Ayiti'].join(' ')).includes(norm(f.q.trim())))&&matchesGeo(p,f.geo));if(f.sort==='low')return a.sort((x,y)=>x.price-y.price);if(f.sort==='high')return a.sort((x,y)=>y.price-x.price);if(f.sort==='new')return a.sort((x,y)=>y.order-x.order);return mixed(a);}
export function panorama(a:Listing[],pin?:string){const p=a.slice(0,13);const selected=a.find(x=>x.id===pin);if(selected&&!p.some(x=>x.id===pin))p[p.length-1]=selected;return p;}
export const curated=[['Featured properties','featured',['h7','d7','h11','d11','h1','d1']],['Recently listed','new',['h12','d12','h13','d13','h2','d4']],['Virtual tours','tours',['h4','d2','h14','d14','h15','d15','h5','d5','h24','d24']],['Available for rent','rent',['h16','d16','h17','d17','h18','d18','h19','d19','h8','d8']],['Land & investment','land',['h3','d3','h20','d20','h9','d9','h21','d21']],['Commercial spaces','commercial',['h6','d6','h23','d23','h22','d22','h10','d10']]] as const;
export function discovery(list:readonly Listing[],excluded:string[]){const used=new Set(excluded);return curated.map(([title,key,ids])=>{const items=mixed(ids.map(id=>list.find(p=>p.id===id)).filter((p):p is Listing=>!!p&&!used.has(p.id))).slice(0,key==='featured'?4:6);items.forEach(p=>used.add(p.id));return {title,key,items};});}
