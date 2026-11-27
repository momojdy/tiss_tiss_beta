// Run with: node src/screens/ArtsLits/verify-native-spill.cjs
// Exercise UI callbacks separately from the deliberately undrained RN queue.
// This is a contract regression, not an on-device performance measurement.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
function load(file,imports={}){
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',js)(name=>name in imports?imports[name]:require(name),module,module.exports);
 return module.exports;
}
const geometry=load('themeSpillGeometry.ts');
function shared(initial){let value=initial;return {get:()=>value,set:next=>{value=typeof next==='function'?next(value):next;}};}
const rnQueue=[],effects=[],reactions=[],observed=[];
let scene=null;
const hooks={...React,useRef:initial=>({current:initial}),useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:fn=>{const cleanup=fn();if(cleanup)effects.push(cleanup);},useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useId:()=>':scroll:',useContext:()=>scene,useImperativeHandle:(ref,fn)=>{if(ref)ref.current=fn();}};
const native={View:'View',StyleSheet:{absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}}};
let canceled=0;
const animation={__esModule:true,default:{createAnimatedComponent:()=> 'AnimatedPath',ScrollView:'AnimatedScrollView'},
 useSharedValue:shared,useAnimatedProps:fn=>fn,useAnimatedRef:()=>({current:{scrollTo(){}}}),
 useScrollOffset:(ref,offset)=>{if(ref)observed.push({ref,offset});return offset;},
 useAnimatedReaction:(prepare,react)=>reactions.push(()=>react(prepare())),
 scrollTo:()=>assert.fail('No programmatic native scroll during a gesture'),
 setNativeProps:(ref,updates)=>{ref.lastProps=updates;},
 withTiming:(to,config,done)=>({to,config,done}),withDelay:(delay,animation)=>({...animation,delay}),
 cancelAnimation:()=>canceled++,Easing:{linear:'linear'},ReduceMotion:{Never:'never'},
};
const worklets={scheduleOnRN:(fn,...args)=>rnQueue.push(()=>fn(...args))};
const clockModule=load('spillClock.ts',{'react':hooks});
const {useSpillClock}=load('useSpillClock.native.ts',{'react':hooks,'react-native-reanimated':animation,'./spillClock':clockModule});
const clock=useSpillClock();let sourceUpdates=0,done=0;
clock.subscribe(()=>sourceUpdates++);
const {default:ThemeSpill,SpillPaper}=load('ThemeSpill.native.tsx',{'react':hooks,'react-native':native,'react-native-svg':{},'react-native-reanimated':animation,'react-native-worklets':worklets,'./SpillPath':{SpillPath:'SpillPath'},'./themeSpillGeometry':geometry});
const {SpillPath}=load('SpillPath.native.tsx',{'react':hooks,'react-native-svg':{},'react-native-reanimated':animation,'./themeSpillGeometry':geometry});
for(const hz of [60,90,120]){
 clock.set(0);ThemeSpill({clock,onDone:()=>done++,startedAt:hz});
 const timing=clock.motion.get();assert.equal(timing.to,1);assert.equal(timing.config.duration,3000);assert.equal(timing.config.easing,'linear');
 const paths=geometry.SPILL_EDGE_LAYERS.map(({lead,opacity})=>SpillPath({width:390,height:844,progress:0,clock,lead,opacity,color:'#ffffff'}));
 // Scroll/JS work is not drained during these UI frames. Geometry still advances
 // at the display rate, with no React render or external-store frame update.
 const before=sourceUpdates,beforeDone=done;
 for(let i=0;i<=hz*3;i++){
  const progress=i/(hz*3);clock.motion.set(progress);
  paths.forEach((p,j)=>assert.equal(p.props.animatedProps().d,geometry.spillPath(390,844,progress,geometry.SPILL_EDGE_LAYERS[j].lead)));
 }
 timing.done(false);assert.equal(rnQueue.length,0,'Cancellation cannot commit a theme');
 timing.done(true);assert.equal(rnQueue.length,1);assert.equal(done,beforeDone);assert.equal(sourceUpdates,before);
 assert.equal(clock.motion.get(),1,'Hold full coverage while RN is busy');
 rnQueue.shift()();assert.equal(done,beforeDone+1);
 effects.splice(0).forEach(fn=>fn());
}
assert.equal(canceled,3);
clock.set(0);ThemeSpill({clock,onDone:()=>done++});
clock.motion.get().done(true);const beforeCancel=done;effects.splice(0).forEach(fn=>fn());rnQueue.shift()();assert.equal(done,beforeCancel,'Discard an already queued completion after unmount');
console.log('Native spill: approved geometry at 60/90/120 Hz, 3000 ms UI clock, one completion callback and no RN frame updates.');
// Exercise the actual paper/mask wiring, keeping React's progress prop at zero.
const {SpillReveal}=load('SpillReveal.native.tsx',{'react':hooks,'react-native':native,'react-native-svg':{G:'G'},'@react-native-masked-view/masked-view':{__esModule:true,default:'MaskedView'},'./SpillPath':{SpillPath:'SpillPath'},'./themeSpillGeometry':geometry});
function paths(node,out=[]){if(Array.isArray(node))node.forEach(n=>paths(n,out));else if(React.isValidElement(node)){if(node.type==='SpillPath')out.push(node.props);paths(node.props.children,out);paths(node.props.maskElement,out);}return out;}
const paper=SpillPaper({width:390,height:844,progress:0,clock,color:'#142021'});
const mask=SpillReveal({width:390,height:844,waveWidth:390,waveHeight:844,progress:0,clock,x:0,y:0,children:React.createElement('View')});
const paperPaths=paths(paper),maskPaths=paths(mask);
assert.equal(paperPaths.length,3);assert.equal(maskPaths.length,3);
for(const progress of [.15,.45,.75,1]){
 clock.motion.set(progress);
 for(let i=0;i<3;i++){
  assert.equal(paperPaths[i].clock,clock);assert.equal(maskPaths[i].clock,clock);
  const a=SpillPath(paperPaths[i]).props.animatedProps(),b=SpillPath(maskPaths[i]).props.animatedProps();
  assert.equal(a.d,b.d);assert.equal(a.d,geometry.spillPath(390,844,progress,geometry.SPILL_EDGE_LAYERS[i].lead));
 }
}
console.log('Native paper/mask wiring: one shared UI progress and identical contours while React remains at progress zero.');
const {SpillScrollView}=load('SpillScrollView.native.tsx',{'react':hooks,'react-native-reanimated':animation,'./spillScene':{SpillSceneContext:{}}});
for(const horizontal of [false,true]){
 const registry=new Map();scene={presentation:false,scrolls:registry};
 const sourceRef={current:null},contentStyle={paddingHorizontal:16,gap:9,alignItems:'flex-end'},children=React.createElement('View',{style:{width:100,height:170}});let contentEvents=0,scrollEvents=0;
 const source=SpillScrollView.render({testID:'reading',horizontal,contentContainerStyle:contentStyle,children,onScroll:()=>scrollEvents++,onContentSizeChange:()=>contentEvents++},sourceRef);
 const observation=observed.at(-1);assert.ok(sourceRef.current);assert.equal(source.props.scrollEnabled,undefined);
 observation.offset.set(175);scene={presentation:true,scrolls:registry};
 const target=SpillScrollView.render({spillScrollId:'reading',horizontal,contentContainerStyle:contentStyle,children},null);
 const follow=reactions.at(-1);const nativeTarget=target.props.innerViewRef;
 follow();assert.equal(nativeTarget.lastProps,undefined,'Wait for passive content layout');
 target.props.onContentSizeChange(2000,2000);follow();assert.deepEqual(nativeTarget.lastProps,{transform:[{translateX:horizontal?-175:0},{translateY:horizontal?0:-175}]});
 for(const offset of [300,540,240,0,-12,85]){
  observation.offset.set(offset);follow();assert.deepEqual(nativeTarget.lastProps,{transform:[{translateX:horizontal?-offset:0},{translateY:horizontal?0:-offset}]});
 }
 assert.equal(target.props.removeClippedSubviews,false,'Keep translated cards mounted');
 assert.equal(target.props.contentContainerStyle,contentStyle);assert.equal(target.props.children,children,'Translate the original native content view, without extra layout wrappers');
 assert.equal(scrollEvents,0,'UI mirroring does not require RN scroll callbacks');
 assert.equal(target.props.onScroll,undefined,'No scroll feedback loop from the passive scene');
 source.props.onContentSizeChange(2000,2000);assert.equal(contentEvents,1);
 source.props.onScroll({nativeEvent:{contentOffset:{x:0,y:20}}});assert.equal(scrollEvents,1,'Retain existing source callbacks');
 assert.equal(rnQueue.length,0);
}
console.log('Native scroll: vertical/horizontal offsets, pre-scrolled mounts, content readiness, reversals and overscroll translate on UI without native scroll commands.');
