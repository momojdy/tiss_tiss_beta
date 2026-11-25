// Source-level component tree tests. No device/simulator or native layout engine is mocked as a screenshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = __dirname;
let state = [], index = 0, width = 390, fontScale = 1;
const element = (type, props) => ({type, props: props || {}});
const React = {
  useState(initial) { const slot = index++; if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial; return [state[slot], v => {state[slot] = typeof v === 'function' ? v(state[slot]) : v;}]; },
  useRef(initial) { return {current: initial}; }, useEffect() {},
};
const rn = new Proxy({Platform:{OS:'android',select:o=>o.android??o.default}, useWindowDimensions:()=>({width,height:844,fontScale}), StyleSheet:{absoluteFillObject:{position:'absolute',left:0,top:0,right:0,bottom:0},create:o=>o}}, {get:(o,k)=>o[k]??String(k)});
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
  new Function('require','module','exports','setTimeout','clearTimeout',out)(load,module,module.exports,()=>1,()=>{});return module.exports;
}
const Home=load('./ArtsLitsHomeScreen').default;
const {categories,profileOptions,connectionOptions,editorPicks}=load('./model');
const {catalog}=load('./catalog');
function tree(){index=0;return Home({onBack(){}});}
function flatten(node, out=[]){if(Array.isArray(node)){node.forEach(x=>flatten(x,out));return out;}if(!node||typeof node!=='object'||!node.props)return out;out.push(node);flatten(node.props.children,out);return out;}
function find(nodes,id){const n=nodes.find(n=>n.props.testID===id);assert.ok(n,'Missing '+id);return n;}
function preview(nodes){return nodes.find(n=>n.type==='PreviewSheet').props;}
function textLink(nodes,label){const n=nodes.find(n=>n.props.label===label);assert.ok(n,'Missing link '+label);return n;}
let scenarios=0;
for(const w of [320,375,390,430,768])for(const scale of [1,1.5])for(const [profile] of profileOptions)for(const [connection] of connectionOptions)for(const sponsor of [false,true]){
  width=w;fontScale=scale;state=[];let nodes=flatten(tree());const p=preview(nodes);p.setProfile(profile);p.setConnection(connection);p.setSponsor(sponsor);nodes=flatten(tree());
  const scroll=find(nodes,'arts-lits-home-scroll');assert.equal(scroll.props.removeClippedSubviews,false);assert.ok(scroll.props.nestedScrollEnabled);
  const editor=find(nodes,'arts-lits-editor-picks'),market=find(nodes,'arts-lits-marketplace');assert.ok(nodes.indexOf(editor)<nodes.indexOf(market));
  const erows=flatten(editor);editorPicks.forEach((e,i)=>{const b=find(erows,`arts-lits-editor-pick-${i}`);assert.equal(b.props.accessibilityLabel,`${e[0]}, ${e[1]}`);assert.equal(b.props.style.alignItems,'baseline');assert.ok(b.props.style.minHeight>=44);});
  const filters=find(flatten(market),'arts-lits-marketplace-filters');assert.ok(filters.props.horizontal&&filters.props.nestedScrollEnabled);assert.equal(filters.props.removeClippedSubviews,false);assert.ok(filters.props.style.height>=44);
  for(const c of categories)find(flatten(filters),`arts-lits-filter-${c.toLowerCase()}`);
  const visible=connection==='live'||connection==='offline';const items=nodes.filter(n=>n.props.testID?.startsWith('arts-lits-product-'));assert.equal(items.length,visible?6:0,`${profile}/${connection}`);
  scenarios++;
}
width=390;fontScale=1;state=[];let nodes=flatten(tree());for(const cat of categories){find(nodes,`arts-lits-filter-${cat.toLowerCase()}`).props.onPress();nodes=flatten(tree());const items=nodes.filter(n=>n.props.testID?.startsWith('arts-lits-product-'));const expected=catalog.filter(v=>cat==='All'||v[2]===cat).slice(0,6);assert.deepEqual(items.map(n=>n.props.testID.slice('arts-lits-product-'.length)).sort(),expected.map(v=>v[0]).sort());assert.equal(find(nodes,`arts-lits-filter-${cat.toLowerCase()}`).props.accessibilityState.selected,true);}
find(nodes,'arts-lits-filter-all').props.onPress();nodes=flatten(tree());textLink(nodes,'Load more works').props.onPress();nodes=flatten(tree());assert.equal(nodes.filter(n=>n.props.testID?.startsWith('arts-lits-product-')).length,12);assert.equal(nodes.some(n=>n.props.label==='Load more works'),false);
for(const [i,e] of editorPicks.entries()){find(nodes,`arts-lits-editor-pick-${i}`).props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),e[0]);preview(nodes).close();nodes=flatten(tree());assert.equal(preview(nodes).stack.length,0);}
find(nodes,'arts-lits-product-p01').props.onPress();nodes=flatten(tree());assert.equal(preview(nodes).stack.at(-1),'p01');
console.log(`Native component-tree checks passed: ${scenarios} combinations of widths, text scales, profiles, connection states and sponsorship; all three editorial routes, seven filters, pagination, and product routing. Native rendering still requires device testing.`);
