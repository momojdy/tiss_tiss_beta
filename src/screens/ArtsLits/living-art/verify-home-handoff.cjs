// Verify original frame pixels and a continuous source/destination handoff.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript'),React=require('react'),sharp=require('sharp');
const atlas=require('./home-motion-atlas.json');
function load(file,imports){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(name=>imports[name]??(name.endsWith('.png')?name:require(name)),m,m.exports);return m.exports;}
const playback=load('homePlayback.ts',{'./home-motion-atlas.json':atlas});
const shared=value=>({get:()=>value,set:next=>{value=next;}});
let frame=null,tick;
const hooks={...React,useContext:()=>frame};
const animated={__esModule:true,default:{View:'AnimatedView'},useAnimatedStyle:fn=>fn,useSharedValue:shared,useFrameCallback:fn=>{tick=fn;}};
const native={View:'View',Image:'Image',StyleSheet:{absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}}};
const {HomeMotion,HomeMotionProvider}=load('HomeMotion.tsx',{'react':hooks,'react-native':native,'react-native-reanimated':animated,'./homePlayback':playback});
const provider=HomeMotionProvider({paused:false,reducedMotion:false,children:null});frame=provider.props.value;
function flatten(n,out=[]){if(Array.isArray(n))n.forEach(c=>flatten(c,out));else if(React.isValidElement(n)){out.push(n);flatten(n.props.children,out);}return out;}
for(const dark of [false,true]){
 const source=flatten(HomeMotion({dark})),target=flatten(HomeMotion({dark:!dark}));
 const sourcePose=source.find(n=>n.type==='AnimatedView').props.style[1],targetPose=target.find(n=>n.type==='AnimatedView').props.style[1];
 for(let index=0;index<atlas.frames;index++){
  frame.set(index);assert.deepEqual(sourcePose(),targetPose());
  assert.deepEqual(sourcePose().transform,[{translateX:-(index%atlas.columns)*66},{translateY:-Math.floor(index/atlas.columns)*66}]);
 }
 const committed=flatten(HomeMotion({dark:!dark}));
 const oldImages=source.filter(n=>n.type==='Image'),newImages=committed.filter(n=>n.type==='Image');
 assert.deepEqual(oldImages.map(n=>n.props.source),newImages.map(n=>n.props.source),'Theme commits never replace an image source');
 assert.deepEqual(committed.find(n=>n.type==='AnimatedView').props.style[1](),targetPose());
 assert.deepEqual(newImages.map(n=>n.props.style[1].opacity),target.filter(n=>n.type==='Image').map(n=>n.props.style[1].opacity));
}
let elapsed=0;frame.set(0);for(let i=0;i<atlas.frames;i++){const delay=atlas.frameEndsMs[i]-(atlas.frameEndsMs[i-1]??0);tick({timeSincePreviousFrame:delay});elapsed+=delay;assert.equal(frame.get(),playback.homeFrameAt(elapsed));}
for(const options of [{paused:true,reducedMotion:false},{paused:false,reducedMotion:true}]){const p=HomeMotionProvider({...options,children:null});tick({timeSincePreviousFrame:100});assert.equal(p.props.value.get(),0);}
(async()=>{
 for(const theme of ['light','dark']){
  const entry=atlas.themes[theme],original=fs.readFileSync(path.join(__dirname,`home-motion-${theme}.webp`)),packed=fs.readFileSync(path.join(__dirname,entry.file));
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),entry.sourceSha256);assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),entry.sha256);
  const decoded=await sharp(original,{animated:true}).ensureAlpha().raw().toBuffer(),{data,info}=await sharp(packed).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let f=0;f<atlas.frames;f++)for(let y=0;y<atlas.frameHeight;y++){
   const a=((Math.floor(f/atlas.columns)*atlas.frameHeight+y)*info.width+f%atlas.columns*atlas.frameWidth)*4,b=(f*atlas.frameHeight+y)*atlas.frameWidth*4;
   assert.deepEqual(data.subarray(a,a+atlas.frameWidth*4),decoded.subarray(b,b+atlas.frameWidth*4));
  }
 }
 console.log('Home handoff: all 154 original RGBA frames preserved, shared phase, stable loaded image sources, both theme directions, pause/reduced motion.');
})().catch(error=>{console.error(error);process.exitCode=1;});
