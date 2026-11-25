// Source-level component tree tests. No device/simulator or native layout engine is mocked as a screenshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = __dirname;
let state = [], index = 0, width = 390, fontScale = 1, refs = [], refIndex = 0, platform = "android";
let scheduled = new Map(), nextTimer = 0;
const queueTimer=(fn)=>{const id=++nextTimer;scheduled.set(id,fn);return id;};
const cancelTimer=id=>scheduled.delete(id);
const flushTimers=()=>{const jobs=[...scheduled.entries()];scheduled.clear();jobs.forEach(([,fn])=>fn());};
const element = (type, props) => ({type, props: props || {}});
const React = {
  useState(initial) { const slot = index++; if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial; return [state[slot], v => {state[slot] = typeof v === 'function' ? v(state[slot]) : v;}]; },
  useRef(initial) { const slot=refIndex++; return refs[slot]??(refs[slot]={current:initial}); }, useEffect() {},
};
const rn = new Proxy({Platform:{get OS(){return platform},select:o=>o[platform]??o.default}, useWindowDimensions:()=>({width,height:844,fontScale}), StyleSheet:{absoluteFillObject:{position:'absolute',left:0,top:0,right:0,bottom:0},create:o=>o}}, {get:(o,k)=>o[k]??String(k)});
const modules = new Map();
function load(name) {
  if (name === 'react') return {...React,default:React};
  if (name === 'react/jsx-runtime') return {jsx:element,jsxs:element,Fragment:'Fragment'};
  if (name === 'react-native') return rn;
  if (name === 'react-native-safe-area-context') return {useSafeAreaInsets:()=>({top:24,bottom:24})};
  if (name === 'expo-status-bar') return {StatusBar:'StatusBar'};
  if (name === 'expo-linear-gradient') return {LinearGradient:'LinearGradient'};
  if (name === 'react-native-svg') return {default:'Svg',Circle:'Circle',Ellipse:'Ellipse',G:'G',Path:'Path'};
  if (name.includes('async-storage')||name.includes('netinfo')) return {default:{}};
  if (name === './PreviewSheet') return {default:'PreviewSheet'};
  if (/\.(png|jpg)$/.test(name)) return name;
  const base=path.join(root,name); const file=[base,base+'.ts',base+'.tsx'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!file) throw Error('Unexpected import '+name);
  if(modules.has(file))return modules.get(file);
  const module={exports:{}}; modules.set(file,module.exports);
  const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','setTimeout','clearTimeout',out)(load,module,module.exports,queueTimer,cancelTimer);return module.exports;
}
const Home=load('./ArtsLitsHomeScreen').default;
const {categories,profileOptions,connectionOptions,editorPicks}=load('./model');
const {catalog}=load('./catalog');
function tree(){index=0;refIndex=0;return Home({onBack(){}});}
function flatten(node, out=[]){if(Array.isArray(node)){node.forEach(x=>flatten(x,out));return out;}if(!node||typeof node!=='object'||!node.props)return out;out.push(node);if(node.type==='FlatList')node.props.data.forEach((item,index)=>flatten(node.props.renderItem({item,index}),out));flatten(node.props.children,out);return out;}
function find(nodes,id){const n=nodes.find(n=>n.props.testID===id);assert.ok(n,'Missing '+id);return n;}
function preview(nodes){return nodes.find(n=>n.type==='PreviewSheet').props;}
function textLink(nodes,label){const n=nodes.find(n=>n.props.label===label);assert.ok(n,'Missing link '+label);return n;}
let scenarios=0;
for(const w of [320,375,390,430,768])for(const scale of [1,1.5])for(const [profile] of profileOptions)for(const [connection] of connectionOptions)for(const sponsor of [false,true]){
  width=w;fontScale=scale;state=[];refs=[];scheduled.clear();let nodes=flatten(tree());const p=preview(nodes);p.setProfile(profile);p.setConnection(connection);p.setSponsor(sponsor);nodes=flatten(tree());
  const scroll=find(nodes,'arts-lits-home-scroll');assert.equal(scroll.props.removeClippedSubviews,false);assert.ok(scroll.props.nestedScrollEnabled);assert.equal(scroll.type,'FlatList');assert.equal(scroll.props.initialNumToRender,scroll.props.data.length);assert.equal(new Set(scroll.props.data.map(r=>r.id)).size,scroll.props.data.length);assert.ok(scroll.props.contentContainerStyle.paddingBottom>=117);assert.ok(scroll.props.data.findIndex(r=>r.id==='editor')<scroll.props.data.findIndex(r=>r.id==='market'));const nav=find(nodes,'arts-lits-bottom-nav');assert.equal(nav.props.style.borderRadius,18);assert.equal(nav.props.style.backgroundColor,'rgba(255,255,255,0.88)');assert.equal(nav.props.style.borderColor,'rgba(255,255,255,0.55)');assert.equal(nav.props.style.height,65);const dock=find(nodes,'arts-lits-dock-position');assert.equal(dock.props.style.bottom,18);assert.equal(dock.props.style.left,14);assert.equal(dock.props.style.right,14);const sponsored=nodes.find(n=>n.props.testID==='arts-lits-sponsored-card');assert.equal(!!sponsored,sponsor);if(sponsored){const photo=find(flatten(sponsored),'arts-lits-sponsored-photo');assert.equal(photo.props.style.top,0);assert.equal(photo.props.style.bottom,0);assert.equal(photo.props.style.width,w<=350?86:104);assert.equal(flatten(photo).find(n=>n.type==='Image').props.source,'./assets/night.jpg');}for(const tab of ['home','explore','museum','library','me'])find(nodes,`arts-lits-tab-${tab}`);
  const editor=find(nodes,'arts-lits-editor-picks'),market=find(nodes,'arts-lits-marketplace');assert.ok(nodes.indexOf(editor)<nodes.indexOf(market));
  const erows=flatten(editor);editorPicks.forEach((e,i)=>{const b=find(erows,`arts-lits-editor-pick-${i}`);assert.equal(b.props.accessibilityLabel,`${e[0]}, ${e[1]}`);assert.equal(b.props.style.alignItems,'baseline');assert.ok(b.props.style.minHeight>=44);});
  const filters=find(flatten(market),'arts-lits-marketplace-filters');assert.ok(filters.props.horizontal&&filters.props.nestedScrollEnabled);assert.equal(filters.props.removeClippedSubviews,false);assert.ok(filters.props.style.height>=44);
  for(const c of categories)find(flatten(filters),`arts-lits-filter-${c.toLowerCase()}`);
  const visible=connection==='live'||connection==='offline';const items=nodes.filter(n=>n.props.testID?.startsWith('arts-lits-product-'));assert.equal(items.length,visible?6:0,`${profile}/${connection}`);
  scenarios++;
}
width=390;fontScale=1;state=[];refs=[];scheduled.clear();let nodes=flatten(tree());for(const cat of categories){find(nodes,`arts-lits-filter-${cat.toLowerCase()}`).props.onPress();nodes=flatten(tree());const items=nodes.filter(n=>n.props.testID?.startsWith('arts-lits-product-'));const expected=catalog.filter(v=>cat==='All'||v[2]===cat).slice(0,6);assert.deepEqual(items.map(n=>n.props.testID.slice('arts-lits-product-'.length)).sort(),expected.map(v=>v[0]).sort());assert.equal(find(nodes,`arts-lits-filter-${cat.toLowerCase()}`).props.accessibilityState.selected,true);}
find(nodes,'arts-lits-filter-all').props.onPress();nodes=flatten(tree());textLink(nodes,'Load more works').props.onPress();nodes=flatten(tree());assert.equal(nodes.filter(n=>n.props.testID?.startsWith('arts-lits-product-')).length,12);assert.equal(nodes.some(n=>n.props.label==='Load more works'),false);
for(const [i,e] of editorPicks.entries()){find(nodes,`arts-lits-editor-pick-${i}`).props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),e[0]);preview(nodes).close();nodes=flatten(tree());assert.equal(preview(nodes).stack.length,0);}
find(nodes,'arts-lits-product-p01').props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),'p01');
assert.equal(find(nodes,'arts-lits-home-scroll').props.data.at(-1).id,'footer');
// Verify direct access, failed index recovery, Home reset, and measured dock inset.
preview(nodes).close();nodes=flatten(tree());
const calls=[];const nativeList={scrollToIndex:x=>calls.push(['index',x]),scrollToOffset:x=>calls.push(['offset',x])};
let list=find(nodes,'arts-lits-home-scroll');list.props.ref.current=nativeList;
find(nodes,'arts-lits-tab-explore').props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),'Explore');
preview(nodes).open('Editor’s picks');nodes=flatten(tree());assert.equal(preview(nodes).stack.length,0);flushTimers();
list=find(nodes,'arts-lits-home-scroll');assert.deepEqual(calls.at(-1),['index',{index:list.props.data.findIndex(r=>r.id==='editor'),animated:true,viewPosition:0}]);
preview(nodes).open('Marketplace');nodes=flatten(tree());flushTimers();list=find(nodes,'arts-lits-home-scroll');const marketIndex=list.props.data.findIndex(r=>r.id==='market');assert.equal(calls.at(-1)[1].index,marketIndex);
list.props.onScrollToIndexFailed({index:marketIndex,highestMeasuredFrameIndex:4,averageItemLength:200});assert.equal(calls.at(-1)[0],'offset');flushTimers();assert.equal(calls.at(-1)[1].index,marketIndex);
find(nodes,'arts-lits-tab-home').props.onPress();assert.deepEqual(calls.at(-1),['offset',{offset:0,animated:true}]);
for(const [tab,label] of [['museum','Museum'],['library','Library'],['me','Me']]){find(nodes,'arts-lits-tab-'+tab).props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),label);preview(nodes).close();nodes=flatten(tree());}
find(nodes,'arts-lits-bottom-nav').props.onLayout({nativeEvent:{layout:{height:90}}});nodes=flatten(tree());assert.ok(find(nodes,'arts-lits-home-scroll').props.contentContainerStyle.paddingBottom>=142);

// Sponsor opens the existing exhibition preview; no changes to admission or payment rules.
state=[];refs=[];nodes=flatten(tree());find(nodes,'arts-lits-sponsored-card').props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),'Between Worlds');
for(const os of ['android','ios']){platform=os;state=[];refs=[];nodes=flatten(tree());assert.equal(find(nodes,'arts-lits-dock-position').props.style.bottom,18);const nav=find(nodes,'arts-lits-bottom-nav');const icons=flatten(nav).filter(n=>n.props.size===24);assert.equal(icons.length,5);}
console.log(`Native component-tree checks passed: ${scenarios} combinations of widths, text scales, profiles, connection states and sponsorship; all three editorial routes, seven filters, pagination, and product routing. Native rendering still requires device testing.`);
