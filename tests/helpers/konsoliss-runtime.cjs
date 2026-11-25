// Lightweight React host harness: executes actual homepage callbacks, never renders the 3D canvas.
const fs=require('fs'),path=require('path'),ts=require('typescript');
module.exports=function homepageHarness(options={}){
 const slots=new Map(),cache=new Map(),events=[];let frame,index=0,root;let mode='light';
 const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.length===1?children[0]:children.length?children:props?.children??[]}),createContext:value=>{const ctx={value};ctx.Provider={context:ctx};return ctx;},useContext:ctx=>ctx.value,useState:initial=>{const owner=frame,key=index++;if(!slots.has(owner))slots.set(owner,[]);const list=slots.get(owner);if(!(key in list))list[key]=typeof initial==='function'?initial():initial;return [list[key],value=>{list[key]=typeof value==='function'?value(list[key]):value;}];},useRef:initial=>React.useState(()=>({current:initial}))[0],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn};
 const rn={};for(const name of ['View','Text','Pressable','Image','TextInput','ScrollView','Modal','StatusBar','KeyboardAvoidingView'])rn[name]=name;
 rn.StyleSheet={create:x=>x,absoluteFill:{}};rn.Platform={OS:'ios'};rn.useWindowDimensions=()=>({width:390,height:844});rn.Animated={Value:class{interpolate(){return 0;}},View:'AnimatedView',timing:()=>({start:done=>done?.({finished:true})})};rn.Easing={in:x=>x,out:x=>x,cubic:()=>0};
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',source)(name=>{
  if(name==='react')return {...React,__esModule:true,default:React};if(name==='react-native')return rn;
  if(name==='react-native-safe-area-context')return {SafeAreaProvider:({children})=>children,useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
  if(name==='react-native-webview')return {WebView:'WebView'};
  if(name==='react-native-svg')return {__esModule:true,default:'Svg',...Object.fromEntries(['Path','G','Circle','Rect','Defs','LinearGradient','Stop','Line','Polyline'].map(x=>[x,x]))};
  if(name.endsWith('/useFeatureTheme'))return {useFeatureTheme:()=>({dark:mode==='dark',toggle:()=>{mode=mode==='dark'?'light':'dark';events.push('theme');},error:null})};
  if(name.endsWith('/useUnreadSummary'))return {useUnreadSummary:()=>({notifications:0,messages:0,notificationColor:'#BD279F',messageColor:'#BD279F',status:'ready',retry:()=>events.push('retry')})};
  if(name==='./useKonsolissCopy')return {useKonsolissHomepageContent:()=>({copy:catalog.KONSOLISS_COPY_DEFAULTS,images:{},locale:'en',status:'ready',accountId:'fixture'})};
  if(name==='./useCurrentKonsolissContainer')return {useCurrentKonsolissContainer:()=>options.failed?{kind:'unavailable'}:options.empty||options.reservedOnly?{kind:'unassigned'}:{kind:'assigned',number:'KS-TEST',status:'filling'},currentKonsolissContainerLabel:(v,c)=>v.kind==='assigned'?v.number+' · '+c['status.filling']:c['status.unassigned']};
  if(name==='./useKonsolissAssignedContainers')return {useKonsolissAssignedContainers:()=>({containers:options.empty||options.failed||options.reservedOnly?[]:[{id:'c',number:'KS-TEST',status:'filling',demo:false}],state:options.failed||options.assignmentUnavailable?'unavailable':'ready'})};
  if(name==='./useKonsolissLoadProgress')return {useKonsolissLoadProgress:()=>options.failed?{kind:'unavailable'}:options.empty?{kind:'unrecorded'}:(options.reservedOnly||options.assignedZero)?{kind:'recorded',progress:{reservedCbm:1,sentCbm:0,loadedCbm:0,inboundCbm:0,allocatedCbm:0,atWarehouseOrInTransitCbm:0,sentNotLoadedCbm:0,reservedNotSentCbm:1,loadedPercent:0}}:{kind:'recorded',progress:{reservedCbm:2,sentCbm:1,loadedCbm:0.5,inboundCbm:0.3,allocatedCbm:0.8,atWarehouseOrInTransitCbm:0.2,sentNotLoadedCbm:0.5,reservedNotSentCbm:1,loadedPercent:40}}};
  if(name==='./useKonsolissContainerOccupancy')return {useKonsolissContainerOccupancy:()=>options.empty||options.failed||options.unverified||options.reservedOnly?null:options.assignedZero?{containerType:'40HQ',capacityCbm:68,loadedCbm:25,otherCargoCbm:25,yourSpaceCbm:0,yourAllocatedCbm:0,freeCbm:43}:{containerType:'40HQ',capacityCbm:68,loadedCbm:51.7,otherCargoCbm:51.2,yourSpaceCbm:0.5,yourAllocatedCbm:0.8,freeCbm:16.3}};
  // This suite exercises the homepage boundary, not the separate booking screen or payment API.
  if(name==='./KonsolissBookSpace')return {__esModule:true,default:'KonsolissBookSpace'};
  if(name==='./supportApi')return {supportRequestId:()=> 'test-request',sendKonsolissSupport:async(id,subject,message)=>{events.push({id,subject,message});if(options.supportFails)throw Error('offline');return 'TEST-TICKET';}};
  if(name.endsWith('.png'))return name;
  if(name.startsWith('.')){const full=path.resolve(path.dirname(file),name);return load(fs.existsSync(full+'.tsx')?full+'.tsx':full+'.ts');}
  throw Error('Unexpected dependency '+name);
 },module,module.exports);return module.exports;
 }
 const base=path.resolve(__dirname,'../../src/screens/Konsoliss');const catalog=load(path.join(base,'cms/catalog.ts'));const Homepage=load(path.join(base,'konsolissHomeScreen.tsx')).default;
 function render(node,where='root'){
  if(node==null||typeof node==='boolean')return null;if(typeof node!=='object')return node;if(Array.isArray(node))return node.map((n,i)=>render(n,where+'.'+i));
  if(node.type?.context){const ctx=node.type.context,old=ctx.value;ctx.value=node.props.value;const output=render(node.children,where+'.provider');ctx.value=old;return output;}
  if(typeof node.type==='function'){const oldFrame=frame,oldIndex=index;frame=where+':'+node.type.name;index=0;const child=node.type({...node.props,children:node.children});const output=render(child,where+'.component');frame=oldFrame;index=oldIndex;return output;}
  if(node.type==='Modal'&&node.props.visible===false)return null;
  if(node.type==='ScrollView'&&node.props.ref)node.props.ref.current={scrollTo:args=>events.push({scroll:args})};
  return {...node,children:render(node.children,where+'.children')};
 }
 const text=node=>node==null?'':Array.isArray(node)?node.map(text).join(''):typeof node==='object'?text(node.children):String(node);
 const all=(node,predicate)=>node==null?[]:Array.isArray(node)?node.flatMap(n=>all(n,predicate)):typeof node==='object'?[...(predicate(node)?[node]:[]),...all(node.children,predicate)]:[];
 const update=()=>root=render(React.createElement(Homepage,{onBack:()=>events.push('back'),onUniversalAction:action=>events.push(action)}));update();
 return {events,webviews:()=>all(root,n=>n.type==='WebView'),text:()=>text(root),find:(label)=>all(root,n=>n.props.accessibilityLabel===label),buttons:label=>all(root,n=>n.type==='Pressable'&&text(n).trim()===label),click:node=>{if(!node)throw Error('Control not found');node.props.onPress({stopPropagation(){}});update();},type:(label,value)=>{const node=all(root,n=>n.type==='TextInput'&&n.props.accessibilityLabel===label)[0];if(!node)throw Error('Input not found '+label);node.props.onChangeText(value);update();},update};
};
