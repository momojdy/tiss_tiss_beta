const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const root=path.resolve(__dirname,'..');
function config(upstream){const module={exports:{}},port=name=>{assert.equal(name,'expo/metro-config');return {getDefaultConfig:()=>({resolver:{assetExts:['png'],resolveRequest:upstream}})};};port.resolve=id=>require.resolve(path.resolve(root,id));vm.runInNewContext(fs.readFileSync(path.join(root,'metro.config.js'),'utf8'),{module,require:port,__dirname:root});return module.exports;}
test('the browser resolves native maps without importing native codegen, while Android and iOS retain their normal resolver',()=>{
 const seen=[],context={resolveRequest:(...args)=>{seen.push(args);return {type:'sourceFile',filePath:'native-maps-entry'};}},c=config();
 assert.equal(c.resolver.resolveRequest(context,'react-native-maps','web').filePath,path.join(root,'src/components/NativeMap.web.tsx'));assert.equal(seen.length,0);
 for(const platform of ['android','ios'])assert.equal(c.resolver.resolveRequest(context,'react-native-maps',platform).filePath,'native-maps-entry');
 c.resolver.resolveRequest(context,'react-native','web');assert.deepEqual(seen.map(args=>[args[1],args[2]]),[['react-native-maps','android'],['react-native-maps','ios'],['react-native','web']]);assert.ok(c.resolver.assetExts.includes('PNG'));
});
test('an existing Metro resolver remains in control of other imports and native platforms',()=>{
 const calls=[],upstream=(...args)=>{calls.push(args);return 'upstream';},c=config(upstream),context={resolveRequest:()=>{throw Error('Bypassed existing resolver');}};
 assert.equal(c.resolver.resolveRequest(context,'react-native-maps','ios'),'upstream');assert.equal(c.resolver.resolveRequest(context,'another-module','web'),'upstream');assert.equal(calls.length,2);
});
test('unsupported browser maps show the supplied CMS message and do not draw sample positions or routes',()=>{
 const module={exports:{}},ports={react:React,'react-native':{View:'View',Text:'Text'}};
 const source=ts.transpileModule(fs.readFileSync(path.join(root,'src/components/NativeMap.web.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>{assert.ok(name in ports,'A browser map must not load '+name);return ports[name];}});
 const element=module.exports.default.render({style:{height:250},accessibilityLabel:'Localisation indisponible',children:'Never render a sample courier'},null);
 assert.equal(element.type,'View');assert.equal(element.props.children.type,'Text');assert.equal(element.props.children.props.children,'Localisation indisponible');assert.equal(module.exports.Marker(),null);assert.equal(module.exports.Polyline(),null);
});
