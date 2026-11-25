import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {supabase} from '../../lib/supabase';

type Palette={bg:string;tx:string;mu:string;ac:string;inp:string;bd:string};
type Props={t:Palette;copy:Record<string,string>;locale?:string;onClose:()=>void};
type Method='cbm'|'dims'|'future';
type Pack={id:number;kind:'dims'|'cbm';l:string;w:string;h:string;v:string;q:string;weight:string};
type RouteConfig={code:string;country:string;region:string;mode:'LCL'|'FCL';delivery:'pickup'|'door';requests_enabled:boolean;service_verified:boolean;checkout_enabled:boolean;price_published:boolean};
type CargoPiece={id:string;order_id:string;piece_reference:string;description:string|null;declared_category:string|null;declared_value_usd:number|null;declared_cbm:number;measured_cbm:number|null;measured_kg:number|null;received_at:string|null};
type PieceTracking={piece_id:string;tracking_number:string;status:string;first_carrier_scan_at:string|null};
type PaidBooking={id:string;status:string;physical_entitlement_cbm:number|null;paid_cents:number;accepted_scope:Record<string,unknown>};
type ServiceRequest={id:string;order_id:string;request_kind:string;description:string;status:string;decision_note:string|null};
type Quote={id:string;status:string;shipping_mode:string;country:string;region:string;delivery:string;physical_cbm:number|null;base_freight_cents:number|null;weight_surcharge_cents:number|null;requested_total_cents:number|null;approved_total_cents:number|null;approved_scope:Record<string,unknown>|null;quote_version:number;expires_at:string|null;review_note:string|null;created_at:string};
const R='#A90E02',C='#FFFBD4',GOLD='#F2D179',COPPER='#E8935A',GREEN='#5FD38A';
const presets=[.02,.10,.30,.50,1],factors={cm:.01,mm:.001,m:1,in:.0254,ft:.3048},units=['cm','mm','m','in','ft'] as const;
const cash=(c:number|null|undefined)=>c==null?'—':('$'+(c/100).toFixed(2));
const num=(v:string)=>v.trim()===''?NaN:Number(v);
const fmt=(n:number)=>Number.isFinite(n)?String(Number(n.toPrecision(10))):'';
const idempotency=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return (c==='x'?r:(r&3|8)).toString(16)});
const newPack=(id:number):Pack=>({id,kind:'dims',l:'100',w:'100',h:'50',v:'0.5',q:'1',weight:'25'});
const countries=[['HT','🇭🇹 Haiti'],['US','🇺🇸 United States'],['DO','🇩🇴 Dominican Republic']];
const regions=[['PAP','Port-au-Prince'],['CAP','Cap-Haïtien'],['CAY','Les Cayes'],['OTHER','Other region']];
export default function KonsolissBookSpace({t,copy,locale='en',onClose}:Props){
 const {height}=useWindowDimensions();
 const [country,setCountry]=useState('HT'),[region,setRegion]=useState('PAP'),[mode,setMode]=useState<'LCL'|'FCL'>('LCL'),[door,setDoor]=useState(false);
 const [drop,setDrop]=useState<''|'country'|'region'>('');
 const [method,setMethod]=useState<Method>('cbm'),[space,setSpace]=useState('0.50'),[weight,setWeight]=useState('250'),[weightUnknown,setWeightUnknown]=useState(false);
 const [dimUnit,setDimUnit]=useState<keyof typeof factors>('cm'),[weightUnit,setWeightUnit]=useState<'kg'|'lb'>('kg');
 const [packs,setPacks]=useState<Pack[]>([newPack(1)]),[nextPack,setNextPack]=useState(2);
 const [fclCount,setFclCount]=useState('1'),[category,setCategory]=useState('unknown'),[battery,setBattery]=useState('installed');
 const [value,setValue]=useState(''),[valueUnknown,setValueUnknown]=useState(true),[description,setDescription]=useState(''),[address,setAddress]=useState('');
 const [cargoOpen,setCargoOpen]=useState(false),[inspectionOpen,setInspectionOpen]=useState(false),[guaranteeOpen,setGuaranteeOpen]=useState(true);
 const [terms,setTerms]=useState(false),[truth,setTruth]=useState(false);
 const [step,setStep]=useState<'edit'|'review'|'sent'|'quotes'|'quoteReview'|'acknowledged'|'serviceRequests'|'serviceRequestForm'|'pieceDeclaration'|'pieceTracking'>('edit'),[quote,setQuote]=useState<Quote|null>(null),[scopeAgreed,setScopeAgreed]=useState(false);
 const [quotes,setQuotes]=useState<Quote[]>([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[backend,setBackend]=useState<Record<string,any>|null>(null);
 const [content,setContent]=useState<Record<string,string>>({});
 const [routes,setRoutes]=useState<RouteConfig[]|null>(null);
 const [paidBookings,setPaidBookings]=useState<PaidBooking[]>([]),[serviceRequests,setServiceRequests]=useState<ServiceRequest[]>([]);
 const [pieces,setPieces]=useState<CargoPiece[]>([]),[pieceTracking,setPieceTracking]=useState<PieceTracking[]>([]);
 const [pieceRef,setPieceRef]=useState(''),[pieceDescription,setPieceDescription]=useState(''),[pieceCategory,setPieceCategory]=useState('general');
 const [pieceValue,setPieceValue]=useState(''),[pieceVolume,setPieceVolume]=useState(''),[activePiece,setActivePiece]=useState<string|null>(null),[pieceTrack,setPieceTrack]=useState('');
 const [requestOrder,setRequestOrder]=useState<string|null>(null),[requestKind,setRequestKind]=useState<'refund'|'return'|'alternative_service'|'claim'>('refund'),[requestReason,setRequestReason]=useState('');
 const requestId=useRef<string|null>(null);
 const submitLock=useRef(false);
 const requestIdentity=useRef<{signature:string;key:string}>({signature:'',key:''});
 const tx=useCallback((key:string,fallback:string)=>content['bookspace.'+key]||copy['bookspace.'+key]||fallback,[content,copy]);
 const dark=t.bg!=='#FFFBD4',paper=dark?'#241a18':'#FFF9DF',line=dark?'rgba(255,251,212,.18)':'rgba(169,14,2,.16)',ink=t.tx,muted=t.mu,accent=R;
 const bump=useCallback(()=>{setTerms(false);setTruth(false);setNotice('');setBackend(null)},[]);
 useEffect(()=>{let active=true;void (async()=>{
  try{
   const res=await supabase.rpc('konsoliss_public_booking_copy',{p_locale:locale});
   if(active&&!res.error&&res.data&&typeof res.data==='object')setContent(res.data as Record<string,string>);
  }catch{/* English defaults remain usable. */}
 })();return()=>{active=false}},[locale]);
 useEffect(()=>{let active=true;void (async()=>{try{const {data,error}=await supabase.rpc('konsoliss_booking_config');if(active)setRoutes(error?[]:Array.isArray(data)?data as RouteConfig[]:[])}catch{if(active)setRoutes([])}})();return()=>{active=false}},[]);
 const updatePack=(id:number,key:keyof Pack,v:string)=>{setPacks(xs=>xs.map(p=>p.id===id?{...p,[key]:v}:p));bump()};
 const calc=useMemo(()=>{
  const lines=packs.map(p=>{const q=num(p.q),volume=p.kind==='dims'?num(p.l)*num(p.w)*num(p.h)*factors[dimUnit]**3:num(p.v);
   const gross=num(p.weight)*(weightUnit==='lb'?.45359237:1);
   return{volume:volume*q,weight:gross*q,valid:q>0&&Number.isInteger(q)&&Number.isFinite(volume)&&volume>0,weightValid:Number.isFinite(gross)&&gross>0}});
  const physical=method==='dims'?lines.reduce((a,x)=>a+x.volume,0):num(space);
  const kg=weightUnknown?null:method==='dims'?lines.reduce((a,x)=>a+x.weight,0):num(weight)*(weightUnit==='lb'?.45359237:1);
  const valid=Number.isFinite(physical)&&physical>=.02&&physical<=68&&(method!=='dims'||lines.every(p=>p.valid&&(weightUnknown||p.weightValid)));
  const validKg=kg==null||(Number.isFinite(kg)&&kg>0&&kg<=80000);
  return{physical,kg,valid,validKg,lines};
 },[packs,dimUnit,method,space,weightUnknown,weightUnit,weight]);

 const countryOptions:string[][]=routes&&routes.length?[...new Set(routes.map(r=>r.country))].map(code=>{
  const known=countries.find(x=>x[0]===code);return [code,known?known[1]:code];
 }):countries;
 const regionOptions:string[][]=routes&&routes.length?[...new Set(routes.filter(r=>r.country===country&&r.mode===mode&&r.delivery==='pickup').map(r=>r.region))].map(code=>{
  const known=regions.find(x=>x[0]===code);return [code,known?known[1]:code];
 }):regions;
 const routeRecord=routes?.find(r=>r.country===country&&r.mode===mode&&r.delivery===(door?'door':'pickup')&&r.region===(country==='HT'?region:'OTHER'));
 const route=routeRecord?.code||'';

 const unsupported=category==='battery'&&battery==='damaged';
 const countValid=Number.isInteger(num(fclCount))&&num(fclCount)>0&&num(fclCount)<=100;
 const valid=mode==='FCL'?countValid:calc.valid&&calc.validKg;
 const quoteOnly=mode==='FCL'||country!=='HT'||region!=='PAP'||door||category==='battery'||category==='special'||(calc.kg!=null&&calc.kg/calc.physical>1000)||calc.physical>20;
 useEffect(()=>{let active=true;if(mode!=='LCL'||!calc.valid||!calc.validKg){setBackend(null);return()=>{active=false}};
 const timer=setTimeout(async()=>{try{
  const {data,error}=await supabase.rpc('konsoliss_booking_estimate',{p_route_code:route,p_cbm:calc.physical,p_weight_kg:calc.kg});
  if(active)setBackend(error?null:data);
 }catch{if(active)setBackend(null)}},220);
 return()=>{active=false;clearTimeout(timer)};
 },[route,calc.physical,calc.kg,calc.valid,calc.validKg,mode]);
 const amount=backend?.status==='estimate_only'?Number(backend.total_cents):null;
 const base=backend?.status==='estimate_only'?Number(backend.base_cents):null;
 const surcharge=backend?.status==='estimate_only'?Number(backend.weight_cents):null;
 const box=(children:React.ReactNode,extra:object={})=><View style={[{borderWidth:.5,borderColor:line,borderRadius:8,padding:11,marginBottom:12,backgroundColor:paper},extra]}>{children}</View>;
 const text=(s:string,size=12,color=ink,bold=false,extra:object={})=><Text style={[{fontSize:size,color,fontWeight:bold?'700':'400',lineHeight:size*1.46},extra]}>{s}</Text>;
 const heading=(s:string)=>text(s,13,ink,true,{marginBottom:9});
 const input=(v:string,onChange:(x:string)=>void,placeholder:string,keyboard:'decimal-pad'|'default'='decimal-pad')=><TextInput value={v} onChangeText={x=>{onChange(x);bump()}} placeholder={placeholder} placeholderTextColor={muted} keyboardType={keyboard} style={{height:39,backgroundColor:t.inp,color:ink,borderColor:line,borderWidth:.5,borderRadius:6,paddingHorizontal:10,fontSize:13,marginTop:5}}/>;
 const btn=(label:string,enabled:boolean,selected:boolean,action:()=>void,small=false)=><Pressable disabled={!enabled} accessibilityRole="button" accessibilityState={{selected,disabled:!enabled}} onPress={action}
  style={{minHeight:small?32:38,paddingVertical:small?5:8,paddingHorizontal:small?5:8,backgroundColor:!enabled?(dark?'#241a18':'#EEE9DD'):selected?R:paper,borderWidth:selected?0:.5,borderColor:line,borderRadius:6,alignItems:'center',justifyContent:'center',flex:1}}>
  {text(label,small?11:12,!enabled?muted:selected?C:ink,true,{textAlign:'center'})}</Pressable>;
 const select=(name:'country'|'region',label:string,value:string,choices:string[][])=><View style={{marginBottom:8}}>
  {text(label,11,ink,true)}
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setDrop(drop===name?'':name)} style={{backgroundColor:t.inp,borderWidth:.5,borderColor:line,borderRadius:6,padding:10,marginTop:5,flexDirection:'row',justifyContent:'space-between'}}>
   {text(choices.find(x=>x[0]===value)?.[1]||value,13)}{text('⌄',14,accent,true)}
  </Pressable>
  {drop===name?<View style={{backgroundColor:paper,borderColor:line,borderWidth:.5,borderRadius:6,marginTop:3}}>
   {choices.map(([k,label])=><Pressable key={k} onPress={()=>{if(name==='country'){setCountry(k);setRegion('PAP');setDoor(false)}else setRegion(k);setDrop('');bump()}} style={{paddingVertical:12,paddingHorizontal:11,borderBottomWidth:.5,borderColor:line}}>{text(label,12,k===value?accent:ink,k===value)}</Pressable>)}
  </View>:null}
 </View>;
 const pill=(...children:React.ReactNode[])=><View style={{flexDirection:'row',gap:6,marginBottom:8}}>{children}</View>;
 const footer=(label:string,onPress:()=>void,disabled=false)=><Pressable disabled={disabled||busy} onPress={onPress} accessibilityRole="button" style={{paddingVertical:13,paddingHorizontal:18,backgroundColor:disabled||busy?'#B5A891':R,borderRadius:9,alignItems:'center',marginTop:12}}>
  {busy?<ActivityIndicator color={C}/>:text(label,12,C,true)}</Pressable>;
 const review=()=>{if(!route||routes===null||!valid||unsupported||(!valueUnknown&&(!Number.isFinite(num(value))||num(value)<0))){setNotice('Check the shipment details and merchandise value before continuing.');return}setNotice('');setStep('review')};
 const submit=async()=>{if(submitLock.current||busy)return;submitLock.current=true;setBusy(true);setNotice('');
  try{
   if(!route)throw new Error('This destination and delivery option is not accepting quote requests.');
   const user=await supabase.auth.getUser();if(!user.data.user)throw new Error('Sign in to submit a reservation or quotation request.');
   if(!valueUnknown&&(!Number.isFinite(num(value))||num(value)<0))throw new Error('Enter a valid merchandise value or choose unknown value.');
   const signature=JSON.stringify({route,mode,cbm:calc.physical,kg:calc.kg,count:fclCount,category,battery,description,value:valueUnknown?null:value,address:door?address:null,packs:method==='dims'?packs:[]});
   if(requestIdentity.current.signature!==signature)requestIdentity.current={signature,key:idempotency()};
   const payload={p_key:requestIdentity.current.key,p_route:route,p_cbm:mode==='LCL'?calc.physical:null,p_weight:calc.kg,p_containers:mode==='FCL'?num(fclCount):null,
    p_category:category==='battery'?'battery':category,p_description:description,p_value:valueUnknown?null:(value.trim()?num(value):null),
    p_address:door?address:null,p_packages:method==='dims'?packs:[]};
   const {data,error}=await supabase.rpc('konsoliss_booking_request',payload);
   if(error)throw new Error(error.message);
   const {data:record,error:readErr}=await supabase.from('konsoliss_booking_quotes').select('*').eq('id',data.id).single();
   if(readErr)throw readErr;
   setQuote(record);setStep('sent');
  }catch(e){setNotice(e instanceof Error?e.message:'Could not submit your request. Please retry.')}finally{submitLock.current=false;setBusy(false)}
 };
 const loadQuotes=async()=>{setBusy(true);const {data,error}=await supabase.from('konsoliss_booking_quotes').select('*').order('created_at',{ascending:false}).limit(30);
  if(error)setNotice(error.message);else{setQuotes(data||[]);setStep('quotes')}setBusy(false)};
 const loadServiceRequests=async(force=false)=>{
  if(busy&&!force)return;setBusy(true);setNotice('');try{
   const [orders,requests,cargo,tracking]=await Promise.all([
    supabase.from('konsoliss_booking_orders').select('id,status,physical_entitlement_cbm,paid_cents,accepted_scope').in('status',['reserved','held','fulfilling','ready']).order('created_at',{ascending:false}).limit(30),
    supabase.from('konsoliss_customer_service_requests').select('id,order_id,request_kind,description,status,decision_note').order('created_at',{ascending:false}).limit(50),
    supabase.from('konsoliss_consignment_pieces').select('id,order_id,piece_reference,description,declared_category,declared_value_usd,declared_cbm,measured_cbm,measured_kg,received_at').order('created_at',{ascending:false}).limit(100),
    supabase.from('konsoliss_piece_carrier_records').select('piece_id,tracking_number,status,first_carrier_scan_at').limit(100)
   ]);
   if(orders.error||requests.error||cargo.error||tracking.error)throw new Error(orders.error?.message||requests.error?.message||cargo.error?.message||tracking.error?.message);
   setPaidBookings((orders.data||[]) as PaidBooking[]);setServiceRequests((requests.data||[]) as ServiceRequest[]);
   setPieces((cargo.data||[]) as CargoPiece[]);setPieceTracking((tracking.data||[]) as PieceTracking[]);setStep('serviceRequests');
  }catch(e){setNotice(e instanceof Error?e.message:'Could not load your requests')}finally{setBusy(false)}
 };
 const sendServiceRequest=async()=>{
  if(busy||!requestOrder||requestReason.trim().length<10){setNotice('Enter at least ten characters describing your request.');return}
  setBusy(true);setNotice('');try{
   if(!requestId.current)requestId.current=idempotency();
   const {error:e}=await supabase.rpc('konsoliss_customer_request_service',{
    p_order_id:requestOrder,p_kind:requestKind,p_reason:requestReason.trim(),p_key:requestId.current
   });
   if(e)throw new Error(e.message);
   requestId.current=null;setRequestReason('');await loadServiceRequests(true);
  }catch(e){setNotice(e instanceof Error?e.message:'Could not send this request. Retry using the same request.')}finally{setBusy(false)}
 };
 const declarePiece=async()=>{
  if(busy||!requestOrder||pieceRef.trim().length<4||pieceDescription.trim().length<3||
    !Number.isFinite(Number(pieceValue))||Number(pieceValue)<0||!Number.isFinite(Number(pieceVolume))||Number(pieceVolume)<=0){
   setNotice('Enter a piece reference, description, declared value and physical CBM.');return;
  }
  setBusy(true);setNotice('');try{
   const {error:e}=await supabase.rpc('konsoliss_customer_declare_piece',{
    p_order_id:requestOrder,p_piece_reference:pieceRef.trim(),p_description:pieceDescription.trim(),
    p_category:pieceCategory,p_value_usd:Number(pieceValue),p_cbm:Number(pieceVolume)
   });if(e)throw new Error(e.message);
   setPieceRef('');setPieceDescription('');setPieceValue('');setPieceVolume('');await loadServiceRequests(true);
  }catch(e){setNotice(e instanceof Error?e.message:'Could not declare this piece')}finally{setBusy(false)}
 };
 const submitTracking=async()=>{
  if(busy||!activePiece||pieceTrack.trim().length<6){setNotice('Enter your complete carrier tracking number.');return}
  setBusy(true);setNotice('');try{
   const {error:e}=await supabase.rpc('konsoliss_customer_submit_piece_tracking',{
    p_piece_id:activePiece,p_tracking_number:pieceTrack.trim()
   });if(e)throw new Error(e.message);
   setPieceTrack('');await loadServiceRequests(true);
  }catch(e){setNotice(e instanceof Error?e.message:'Could not submit carrier tracking')}finally{setBusy(false)}
 };
 const reset=()=>{setStep('edit');setNotice('');setScopeAgreed(false);bump()};
 const quoteScope=(key:string):string=>{const v=quote?.approved_scope?.[key];return Array.isArray(v)?v.join(' · '):typeof v==='string'?v:v==null?'Not specified':String(v)};
 const acceptQuote=async()=>{if(!scopeAgreed||busy||!quote||quote.status!=='approved')return;setBusy(true);setNotice('');try{const {data,error:e}=await supabase.rpc('konsoliss_customer_acknowledge_quote',{p_quote_id:quote.id,p_quote_version:quote.quote_version});if(e)throw new Error(e.message);if(data?.payment_taken||data?.space_reserved)throw new Error('Unexpected checkout state; contact support.');setQuote({...quote,status:'accepted_awaiting_checkout'});setStep('acknowledged')}catch(e){setNotice(e instanceof Error?e.message:'Could not confirm your acknowledgement. Please refresh the quote.')}finally{setBusy(false)}};
 const renderQuote=(q:Quote)=><View key={q.id}>{box(<>
   {text((q.shipping_mode||'LCL')+' · '+q.country+' · '+q.region,13,ink,true)}
   {text('Status: '+q.status.replace(/_/g,' '),11,muted)}
   {text('Request '+q.id.slice(0,8),10,muted)}
   {q.approved_total_cents!=null?text('Approved quote: '+cash(q.approved_total_cents),15,ink,true):q.requested_total_cents!=null?text('Indicative freight: '+cash(q.requested_total_cents),13):null}
   {q.approved_scope?text('Service scope reviewed by Konsoliss',11,muted):null}
   {q.review_note?text(q.review_note,11,muted):null}
   {q.status==='approved'?footer('Review approved quotation',()=>{setQuote(q);setScopeAgreed(false);setNotice('');setStep('quoteReview')}):null}
   {q.status==='accepted_awaiting_checkout'?text('Scope acknowledged · checkout preparation pending. No payment taken.',11,accent,true):null}
  </>)}</View>;
 return <View style={{maxHeight:height*.86,minHeight:220,backgroundColor:t.bg}}>
  <View style={{width:40,height:4,borderRadius:3,backgroundColor:dark?'#6D6050':'#C3B38F',alignSelf:'center',marginBottom:12}}/>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:.5,borderBottomColor:line,paddingVertical:4,marginBottom:10}}>
   <View>{text(step==='quotes'?'My quotes':step==='sent'?'Request received':step==='review'?'Review shipping request':step==='quoteReview'?'Review approved quote':step==='acknowledged'?'Quote acknowledged':tx('heading','Book Space'),21,ink,true)}
   {text(tx('subtitle','China warehouse → Your destination'),11,muted)}</View>
   <Pressable accessibilityRole="button" accessibilityLabel="Close Book Space" onPress={onClose}>{text('×',26,ink)}</Pressable>
  </View>
  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:18}}>
   {step==='edit'?<>
    {pill(btn('LCL · Shared space',true,mode==='LCL',()=>{setMode('LCL');bump()}),btn('FCL · Full container',true,mode==='FCL',()=>{setMode('FCL');bump()}))}
    <View style={{marginTop:10}}>{heading(tx('destination','Destination'))}
     {select('country',tx('destination','Destination'),country,countryOptions)}
     {country==='HT'?select('region',tx('region','Pickup region'),region,regionOptions):text(tx('unpublished','Pricing for this destination is confirmed by quotation.'),11,muted)}
     {pill(btn('⌂  Warehouse pickup',true,!door,()=>{setDoor(false);bump()}),btn(country==='HT'?'♧  Door delivery 🔒':'♧  Door delivery',country!=='HT',door,()=>{setDoor(true);bump()}))}
    </View>
    <View style={{height:.5,backgroundColor:line,marginVertical:13}}/>
    {mode==='LCL'?<>
     {heading(tx('method','How would you like to reserve your space?'))}
     {pill(btn('▣\nChoose CBM',true,method==='cbm',()=>{setMethod('cbm');bump()}),btn('⌗\nL × W × H',true,method==='dims',()=>{setMethod('dims');bump()}),btn('▤\nNo goods yet',true,method==='future',()=>{setMethod('future');bump()}))}
     <View style={{height:2,backgroundColor:line,flexDirection:'row',marginBottom:12}}><View style={{backgroundColor:R,height:2,width:'33.333%',marginLeft:method==='dims'?'33.333%':method==='future'?'66.666%':'0%'}}/></View>
     {method==='dims'?<>
       <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:9}}>{heading(tx('packages','Packages'))}<Pressable onPress={()=>{setPacks(xs=>[...xs,newPack(nextPack)]);setNextPack(x=>x+1);bump()}}>{text('+ Add Package',11,accent,true)}</Pressable></View>
       {pill(...units.map(u=>btn(u,true,dimUnit===u,()=>{if(u===dimUnit)return;setPacks(xs=>xs.map(p=>{const v={...p};for(const k of ['l','w','h'] as const){const x=num(p[k]);if(Number.isFinite(x))v[k]=fmt(x*factors[dimUnit]/factors[u])}return v}));setDimUnit(u);bump()},true)))}
       {packs.map((p,i)=><View key={p.id}>{box(<>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>{heading('Package '+(i+1))}
        {packs.length>1?<Pressable onPress={()=>{setPacks(xs=>xs.filter(x=>x.id!==p.id));bump()}}>{text('×',20,muted)}</Pressable>:null}</View>
        {pill(btn('L × W × H',true,p.kind==='dims',()=>{if(p.kind==='dims')return;const side=Math.cbrt(num(p.v))/factors[dimUnit];setPacks(xs=>xs.map(x=>x.id===p.id?{...x,kind:'dims',l:fmt(side),w:fmt(side),h:fmt(side)}:x));bump()}),btn('CBM / box',true,p.kind==='cbm',()=>{if(p.kind==='cbm')return;const v=num(p.l)*num(p.w)*num(p.h)*factors[dimUnit]**3;setPacks(xs=>xs.map(x=>x.id===p.id?{...x,kind:'cbm',v:fmt(v)}:x));bump()}))}
        {p.kind==='dims'?<View style={{flexDirection:'row',gap:7}}>{(['l','w','h'] as const).map((k,j)=><View key={k} style={{flex:1}}>{text(['Length','Width','Height'][j],11)}{input(p[k],v=>updatePack(p.id,k,v),'0')}</View>)}</View>:<View>{text('CBM per box',11)}{input(p.v,v=>updatePack(p.id,'v',v),'0.500')}</View>}
        <View style={{flexDirection:'row',gap:7,marginTop:9}}><View style={{flex:1}}>{text('Number of boxes',11)}{input(p.q,v=>updatePack(p.id,'q',v),'1')}</View><View style={{flex:1}}>{text('Weight per box ('+weightUnit+')',11)}{input(p.weight,v=>updatePack(p.id,'weight',v),'0')}</View></View>
        {text('Package volume: '+(Number.isFinite(calc.lines[i]?.volume)?fmt(calc.lines[i].volume):'—')+' CBM',11,muted,false,{marginTop:8})}
       </>)}</View>)}
      </>:<View>{pill(...presets.map(n=>btn(n.toFixed(2),true,num(space)===n,()=>{setSpace(String(n));bump()},true)))}
       {text(tx('custom','Custom CBM'),11,ink,true)}
       {input(space,setSpace,'0.500')}
      </View>}
      {text(tx('shopLater','Reserve now, shop later. Submit carrier-accepted tracking by Day 25.'),11,muted,false,{marginTop:10,marginBottom:14})}
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>{heading(method==='future'?tx('estimatedWeight','Estimated shipment weight'):tx('grossWeight','Gross shipment weight'))}
       <View style={{width:94}}>{pill(btn('kg',true,weightUnit==='kg',()=>{if(weightUnit==='kg')return;setWeight(v=>fmt(num(v)*.45359237));setPacks(xs=>xs.map(p=>({...p,weight:fmt(num(p.weight)*.45359237)})));setWeightUnit('kg');bump()},true),btn('lb',true,weightUnit==='lb',()=>{if(weightUnit==='lb')return;setWeight(v=>fmt(num(v)/.45359237));setPacks(xs=>xs.map(p=>({...p,weight:fmt(num(p.weight)/.45359237)})));setWeightUnit('lb');bump()},true))}</View></View>
      <Pressable onPress={()=>{setWeightUnknown(x=>!x);bump()}} style={{paddingVertical:8}}>{text((weightUnknown?'☑':'□')+'  '+tx('unknownWeight',"I don't know my estimated weight yet"),12)}</Pressable>
      {!weightUnknown&&method!=='dims'?input(weight,setWeight,'Weight in '+weightUnit):null}
      {calc.valid?text('Includes up to '+fmt(calc.physical*412)+' kg',11,muted):text('Minimum 0.020 CBM',11,muted)}
      {calc.kg!=null&&calc.valid&&calc.kg>calc.physical*412?text('Additional weight · '+fmt(calc.kg-calc.physical*412)+' kg',11,COPPER,true):null}
     </>:<>{heading('FCL · 40HQ full container')}{text('One or more full containers, individually quoted. 68 CBM is nominal planning capacity only.',11,muted)}{text('Number of containers',11,ink,true,{marginTop:10})}{input(fclCount,setFclCount,'1')}</>}
     <View style={{height:.5,backgroundColor:line,marginVertical:13}}/>
     <Pressable onPress={()=>setCargoOpen(v=>!v)}>{heading(tx('goods','What are you shipping?')+'   '+(cargoOpen?'⌃':'⌄'))}</Pressable>
     {cargoOpen?<View>{pill(btn('Not chosen yet',true,category==='unknown',()=>{setCategory('unknown');bump()},true),btn('General',true,category==='general',()=>{setCategory('general');bump()},true))}
      {pill(btn('Electronics',true,category==='battery',()=>{setCategory('battery');bump()},true),btn('Special cargo',true,category==='special',()=>{setCategory('special');bump()},true))}
      {category==='battery'?pill(btn('Installed',true,battery==='installed',()=>{setBattery('installed');bump()},true),btn('Loose',true,battery==='loose',()=>{setBattery('loose');bump()},true),btn('Damaged',true,battery==='damaged',()=>{setBattery('damaged');bump()},true)):null}
      {(category==='battery'||category==='special')?box(text(unsupported?'Damaged or recalled batteries cannot be carried as standard cargo.':'Some products need extra documents or inspection. We check your options before you send them.',11,accent)):null}
      {text('Goods description (optional if not purchased)',11,ink,true)}
      {input(description,setDescription,'Describe the products','default')}
      {text('Estimated merchandise value (USD)',11,ink,true,{marginTop:7})}
      <Pressable onPress={()=>{setValueUnknown(x=>!x);bump()}} style={{paddingVertical:6}}>{text((valueUnknown?'☑':'□')+"  I don't know the value yet",11)}</Pressable>
      {!valueUnknown?input(value,setValue,'Invoice or expected value'):null}
     </View>:null}
     {door?<View>{heading('Destination delivery address')}{input(address,setAddress,'Street, city and postal code','default')}</View>:null}
     <View style={{backgroundColor:dark?'#2B1210':'#2B1210',borderRadius:8,padding:14,marginTop:12,marginBottom:14}}>
       {text(mode==='FCL'?'FCL · CARRIER QUOTATION':country==='HT'&&region==='PAP'?'HAITI LCL · FREIGHT ESTIMATE':'DESTINATION QUOTATION',10,'#D9CCB5',true,{letterSpacing:1})}
       {text(unsupported?'Not available':amount!=null&&!quoteOnly?cash(amount):amount!=null?cash(amount):'Quote required',35,GOLD,true,{marginTop:4,marginBottom:8})}
       {amount!=null?<>{text('Indicative freight only · final price follows review.',11,'#D5C7B0')}
         <View style={{height:.5,backgroundColor:'#67534C',marginVertical:9}}/>
         <View style={{flexDirection:'row',justifyContent:'space-between'}}>{text('Freight for reserved space',11,C)}{text(cash(base),11,C,true)}</View>
         <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:5}}>{text('Additional weight charge',11,C)}{text(calc.kg===null?'Pending':surcharge?('+'+cash(surcharge)):'No extra charge',11,surcharge?COPPER:GREEN,true)}</View>
       </>:text('A destination-specific, carrier-backed quote is needed before payment.',11,'#D5C7B0')}
     </View>
     {heading(tx('covers','What your shipping service covers'))}
     {['China warehouse receiving & consolidation','Ocean shipping','Destination warehouse pickup'].map((str,i)=><View key={i} style={{flexDirection:'row',gap:8,marginBottom:7}}>
      {text('○',16,'#AD8929')}{text(str,12,ink)}
     </View>)}
     {text('Customs, duties and final-mile delivery are confirmed in your reviewed quotation.',11,muted,false,{marginTop:5,marginBottom:14})}
     <Pressable onPress={()=>setInspectionOpen(x=>!x)}>{heading(tx('inspection','Pricing after inspection')+'   '+(inspectionOpen?'⌃':'⌄'))}</Pressable>
     {inspectionOpen?text('We measure and weigh your goods when they reach our China warehouse. If they differ from your booking, we explain any permitted change and ask for approval before collecting more.',11,muted,false,{marginBottom:12}):null}
     <View style={{backgroundColor:dark?'#33281A':'#F2E5B4',padding:12,borderRadius:8,marginBottom:14}}>
      <Pressable onPress={()=>setGuaranteeOpen(x=>!x)}>{text(tx('delivery','Delivery commitment'),13,ink,true)}
       {text(mode==='LCL'&&country==='HT'&&region==='PAP'?'45–80 calendar days · Day 80 latest':'Confirmed with your destination quote',12,ink,true)}</Pressable>
      {guaranteeOpen?text(mode==='LCL'&&country==='HT'&&region==='PAP'?'The clock starts after eligible goods are verified at our China warehouse and ends at Haiti warehouse pickup readiness. It does not start when you pay.':'Route-specific timing is agreed before a final quotation is accepted.',11,muted,false,{marginTop:8}):null}
     </View>
     {text('Day 12 cancellation terms · Day 25 carrier-accepted tracking · Optional paid extension to Day 32 when eligible.',11,muted,false,{marginBottom:13})}
     <Pressable onPress={()=>setTerms(x=>!x)}>{text((terms?'☑':'□')+'  '+tx('terms','I accept the booking terms and delivery conditions.'),12)}</Pressable>
     <Pressable onPress={()=>setTruth(x=>!x)} style={{marginTop:10}}>{text((truth?'☑':'□')+'  '+(category==='unknown'?tx('consentReserve',"I understand this reserves space, not a final customs-inclusive shipment price. I'll declare goods before sending."):'My declaration is accurate. I understand goods are subject to inspection and eligible loading.'),12)}</Pressable>
     {notice?text(notice,11,accent,true,{marginTop:10}):null}
     <Pressable onPress={()=>{void loadServiceRequests()}} style={{paddingVertical:7,alignItems:'center'}}>{text(tx('myRequests','My shipment requests'),11,accent,true)}</Pressable>
     <Pressable onPress={()=>{void loadQuotes()}} style={{paddingVertical:13,alignItems:'center'}}>{text('My quotes',11,accent,true)}</Pressable>
   </>:null}
   {step==='review'?<>
    {box(<>{heading(category==='unknown'?'Your provisional space request':'Shipping quote request')}
     {text('Shipping: '+mode+' · '+(countryOptions.find(x=>x[0]===country)?.[1]||country),12)}
     {text('Destination: '+(country==='HT'?regions.find(x=>x[0]===region)?.[1]:door?'Door delivery':'Warehouse pickup'),12)}
     {mode==='LCL'?text('Physical space: '+fmt(calc.physical)+' CBM',12):text('Full containers: '+fclCount+' × 40HQ',12)}
     {text('Gross weight: '+(calc.kg==null?'Not known yet':fmt(calc.kg)+' kg'),12)}
     {text('Goods: '+(category==='unknown'?'Not chosen yet':category),12)}
     {text('Estimated freight: '+(amount==null?'Pending review':cash(amount)),14,ink,true,{marginTop:8})}
     {text('Amount charged today: $0.00 · Payments are not enabled for this route yet.',11,accent,true,{marginTop:8})}
    </>)}
    {box(<>{heading('What happens next')}{text('Konsoliss will review your goods, available space, customs responsibilities and the service scope. This request does not reserve capacity or take payment.',12,muted)}</>)}
    {notice?text(notice,11,accent):null}
    {footer('Submit shipping request',()=>{void submit()})}
    {footer('‹ Edit booking',reset)}
   </>:null}
   {step==='sent'?<>{box(<>{heading('Request received')}{text('Your reference: '+(quote?.id||'—'),12)}
    {text('Our team will review the service, price and availability. No payment was taken and no space has been reserved.',12,muted,false,{marginTop:6})}</>)}
    {footer('View my quotes',()=>{void loadQuotes()})}{footer('Back to Book Space',reset)}{footer('Close',onClose)}</>:null}
   {step==='quoteReview'&&quote?<>
     {box(<>{heading('Approved service and price')}
       {text(quote.shipping_mode+' · '+quote.country+' · '+quote.region+' · '+quote.delivery,13)}
       {text('Quote version '+quote.quote_version,11,muted)}
       {text('Approved route '+quoteScope('route_code')+' · '+quoteScope('country')+' · '+quoteScope('region'),11,ink,true,{marginTop:7})}
       {text('Equipment '+quoteScope('equipment')+' · '+quoteScope('shipping_mode'),11)}
       {text('Delivery method '+quoteScope('delivery_method'),11)}
       {quote.approved_scope?.destination_address?text('Destination '+quoteScope('destination_address'),11):text('Pickup area '+quoteScope('pickup_region'),11)}
       {text('Quote validity '+quoteScope('validity_days')+' days from approval',11,muted)}

       {text('Reviewed price '+cash(quote.approved_total_cents),20,ink,true,{marginVertical:7})}
       {text('Included services',11,ink,true)}{text(quoteScope('services_included'),11)}
       {text('Excluded services',11,ink,true,{marginTop:9})}{text(quoteScope('services_excluded'),11)}
       {text('Customs and import costs',11,ink,true,{marginTop:9})}{text(quoteScope('customs_treatment'),11)}
       {text('Cargo eligibility',11,ink,true,{marginTop:9})}{text(quoteScope('cargo_review'),11)}
       {text('Delivery commitment',11,ink,true,{marginTop:9})}{text(quoteScope('delivery_commitment'),11)}
       {text('Quote expires '+(quote.expires_at||'at a time set by Konsoliss'),11,muted,false,{marginTop:7})}
     </>)}
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:scopeAgreed}} onPress={()=>setScopeAgreed(x=>!x)}>{text((scopeAgreed?'☑':'□')+'  I have read the included services, exclusions and delivery terms. I understand no payment or space reservation is made at this step.',12)}</Pressable>
     {notice?text(notice,11,accent,true,{marginTop:8}):null}
     {footer('Acknowledge quotation scope',()=>{void acceptQuote()},!scopeAgreed)}
     {footer('‹ Back to quotes',()=>{void loadQuotes()})}
    </>:null}
   {step==='acknowledged'?<>
     {box(<>{heading('Quote scope acknowledged')}{text('Konsoliss has recorded your reviewed quote. Secure checkout will become available only after route capacity, payment provider and contract terms are verified.',12,muted)}
       {text('No payment taken · No space reserved',12,accent,true,{marginTop:8})}</>)}
     {footer('View my quotes',()=>{void loadQuotes()})}{footer('Close',onClose)}
   </>:null}
   {step==='serviceRequests'?<>
     {box(<>{heading(tx('myRequests','My shipment requests'))}{text(tx('requestExplanation','Request a refund, cargo return or alternative service only for a confirmed paid booking. Requests do not automatically move funds or cargo.'),11,muted)}</>)}
     {paidBookings.length?paidBookings.map(b=><View key={b.id}>{box(<>
       {text('Booking '+b.id.slice(0,8)+' · '+b.status,12,ink,true)}
       {text('Paid '+cash(b.paid_cents)+' · Reserved '+(b.physical_entitlement_cbm??'—')+' CBM',11,muted)}
       {footer(tx('declarePiece','Declare goods'),()=>{setRequestOrder(b.id);setPieceRef('');setPieceDescription('');setPieceCategory('general');setPieceValue('');setPieceVolume('');setStep('pieceDeclaration')})}
       {pieces.filter(p=>p.order_id===b.id).map(p=><View key={p.id} style={{borderTopWidth:.5,borderColor:line,paddingVertical:7}}>
         {text(p.piece_reference+' · '+(p.description||'Goods not described'),11,ink,true)}
         {text('Declared '+p.declared_cbm+' CBM · '+(p.declared_category||'unknown')+' · '+(p.received_at?'Warehouse received':'Not warehouse-received'),11,muted)}
         {pieceTracking.find(x=>x.piece_id===p.id)?text('Tracking: '+pieceTracking.find(x=>x.piece_id===p.id)?.tracking_number+' · '+pieceTracking.find(x=>x.piece_id===p.id)?.status,11,muted):footer(tx('addTracking','Add carrier tracking'),()=>{setRequestOrder(b.id);setActivePiece(p.id);setPieceTrack('');setStep('pieceTracking')})}
       </View>)}
       {footer(tx('createRequest','Create service request'),()=>{setRequestOrder(b.id);setRequestKind('refund');setRequestReason('');requestId.current=null;setStep('serviceRequestForm')})}
     </>)}</View>):box(text(tx('noPaidBookings','No eligible paid shipping bookings yet. Quotation requests are not reservations.'),12,muted))}
     {serviceRequests.map(r=><View key={r.id}>{box(<>
       {text(r.request_kind.replace(/_/g,' ')+' · '+r.status.replace(/_/g,' '),12,ink,true)}
       {text('Booking '+r.order_id.slice(0,8)+' · '+r.description,11)}
       {r.decision_note?text('Admin response: '+r.decision_note,11,muted):null}
     </>)}</View>)}
     {notice?text(notice,11,accent):null}
     {footer(tx('refreshRequests','Refresh requests'),()=>{void loadServiceRequests()})}
     {footer('‹ Book Space',reset)}
   </>:null}
   {step==='pieceDeclaration'?<>
     {box(<>{heading(tx('declarePiece','Declare goods'))}
       {text('Booking '+(requestOrder?.slice(0,8)||'—'),11,muted)}
       {text(tx('pieceReference','Parcel / piece reference'),11,ink,true,{marginTop:9})}
       <TextInput value={pieceRef} onChangeText={setPieceRef} autoCapitalize="characters" placeholder="e.g. CARTON-01" placeholderTextColor={muted} style={{borderWidth:.5,borderColor:line,color:ink,backgroundColor:paper,borderRadius:6,padding:10}}/>
       {text(tx('pieceDescription','Goods description'),11,ink,true,{marginTop:9})}
       <TextInput value={pieceDescription} onChangeText={setPieceDescription} placeholder="What is inside this parcel?" placeholderTextColor={muted} style={{borderWidth:.5,borderColor:line,color:ink,backgroundColor:paper,borderRadius:6,padding:10}}/>
       <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginVertical:9}}>
         {(['general','electronics','battery','special','unknown'] as const).map(k=><Pressable key={k} onPress={()=>setPieceCategory(k)} style={{borderWidth:.5,borderColor:line,backgroundColor:pieceCategory===k?R:paper,padding:8,borderRadius:6}}>{text(k,11,pieceCategory===k?C:ink)}</Pressable>)}
       </View>
       {text(tx('pieceValue','Declared item value (USD)'),11,ink,true)}
       <TextInput value={pieceValue} keyboardType="decimal-pad" onChangeText={setPieceValue} placeholder="e.g. 80.00" placeholderTextColor={muted} style={{borderWidth:.5,borderColor:line,color:ink,backgroundColor:paper,borderRadius:6,padding:10}}/>
       {text(tx('pieceCBM','Physical volume (CBM)'),11,ink,true,{marginTop:8})}
       <TextInput value={pieceVolume} keyboardType="decimal-pad" onChangeText={setPieceVolume} placeholder="e.g. 0.020" placeholderTextColor={muted} style={{borderWidth:.5,borderColor:line,color:ink,backgroundColor:paper,borderRadius:6,padding:10}}/>
       {text(tx('pieceDocuments','Some goods require documents or specialist review. No file is uploaded from this screen; do not send restricted cargo until approved.'),11,muted,false,{marginTop:9})}
     </>)}
     {notice?text(notice,11,accent):null}
     {footer(tx('saveDeclaration','Save declaration'),()=>{void declarePiece()},busy||pieceRef.trim().length<4||pieceDescription.trim().length<3)}
     {footer('‹ My bookings',()=>{void loadServiceRequests()})}
   </>:null}
   {step==='pieceTracking'?<>
     {box(<>{heading(tx('addTracking','Add carrier tracking'))}
       {text('Piece '+(pieces.find(p=>p.id===activePiece)?.piece_reference||'—'),12,muted)}
       {text(tx('carrierTracking','Carrier tracking number'),11,ink,true,{marginTop:9})}
       <TextInput value={pieceTrack} onChangeText={setPieceTrack} autoCapitalize="characters" placeholder="Full China-domestic tracking number" placeholderTextColor={muted} style={{borderWidth:.5,borderColor:line,color:ink,backgroundColor:paper,borderRadius:6,padding:10}}/>
       {text(tx('trackingNeedsScan','A submitted tracking number is not carrier acceptance. Staff verifies the first carrier scan separately.'),11,muted,false,{marginTop:9})}
     </>)}
     {notice?text(notice,11,accent):null}
     {footer(tx('submitTracking','Submit tracking'),()=>{void submitTracking()},busy||pieceTrack.trim().length<6)}
     {footer('‹ My bookings',()=>{void loadServiceRequests()})}
   </>:null}
   {step==='serviceRequestForm'?<>
     {box(<>{heading(tx('createRequest','Create service request'))}
       {text('Booking '+(requestOrder?.slice(0,8)||'—'),12,muted)}
       {text(tx('requestType','Request type'),11,ink,true,{marginTop:9})}
       <View style={{flexDirection:'row',gap:5,flexWrap:'wrap',marginTop:7}}>
        {(['refund','return','alternative_service','claim'] as const).map(k=><Pressable key={k} accessibilityRole="button" onPress={()=>{setRequestKind(k);requestId.current=null}} style={{borderWidth:.5,borderColor:line,padding:8,borderRadius:6,backgroundColor:k===requestKind?R:paper}}>{text(k.replace(/_/g,' '),11,k===requestKind?C:ink,true)}</Pressable>)}
       </View>
       {text(tx('requestDetails','Explain your request'),11,ink,true,{marginTop:10})}
       <TextInput multiline value={requestReason} onChangeText={v=>{setRequestReason(v);requestId.current=null}} maxLength={2000} placeholder="Describe the issue and expected resolution" placeholderTextColor={muted} style={{minHeight:88,borderWidth:.5,borderColor:line,backgroundColor:paper,color:ink,borderRadius:7,padding:10,marginTop:7}}/>
       {text(tx('requestNotSettlement','Admin review does not automatically issue a refund or return shipment.'),11,muted,false,{marginTop:8})}
     </>)}
     {notice?text(notice,11,accent):null}
     {footer(tx('submitRequest','Submit request'),()=>{void sendServiceRequest()},busy||requestReason.trim().length<10)}
     {footer('‹ My requests',()=>{void loadServiceRequests()})}
   </>:null}
   {step==='quotes'?<>{quotes.length?quotes.map(renderQuote):box(text('No quote requests yet.',12,muted))}
    {notice?text(notice,11,accent):null}
    {footer('Refresh quotes',()=>{void loadQuotes()})}{footer('‹ Book Space',reset)}{footer('Close',onClose)}</>:null}
  </ScrollView>
  {step==='edit'?<View style={{borderTopWidth:.5,borderTopColor:line,paddingTop:9,paddingBottom:3,marginTop:2}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
      <View>{text('Indicative freight · not payable yet',10,muted)}{text(unsupported?'Not available':amount==null?'Quote required':cash(amount),18,ink,true)}</View>
      <View style={{minWidth:145}}>{footer(unsupported?'Unavailable':tx('requestQuote','Review shipping quote'),review,
       !route||routes===null||!valid||unsupported||!terms||!truth||(door&&address.trim().length<8))}</View>
     </View>
    </View>:null}
 </View>;
}
