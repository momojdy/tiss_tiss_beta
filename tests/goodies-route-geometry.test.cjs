const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('supabase/functions/goodies-delivery-quote/index.ts','utf8');
const ast=ts.createSourceFile('quote.ts',source,ts.ScriptTarget.Latest,true);
const names=new Set(['numericValue','validPoint','roadGeometryValid']);
const declarations=ast.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>names.has(d.name.getText(ast))));
assert.equal(declarations.length,3);
const moduleScope={exports:{}};
const script=declarations.map(d=>d.getText(ast)).join('\n')+'\nmodule.exports={validPoint,roadGeometryValid};';
vm.runInNewContext(ts.transpileModule(script,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleScope});
const {validPoint,roadGeometryValid}=moduleScope.exports;
test('routing rejects coerced and nonfinite coordinates instead of fabricating a pin',()=>{
 for(const bad of [true,false,[],[18.5],{},null,undefined,'','  ','0x12','Infinity',NaN,Infinity]){
  assert.equal(validPoint(bad,-72.3),false);assert.equal(validPoint(18.5,bad),false);
 }
 assert.equal(validPoint(91,0),false);assert.equal(validPoint(0,-181),false);
 assert.equal(validPoint(18.5,-72.3),true);assert.equal(validPoint('18.5','-72.3'),true);assert.equal(validPoint(0,0),true);
});
test('road routes require real numeric coordinates at every point',()=>{
 const good=[[-72.3,18.5],[-72.29,18.51]];
 assert.equal(roadGeometryValid({type:'LineString',coordinates:good}),true);
 for(const point of [[true,18.5],[-72.3,[]],[-72.3,91],['-72.3','18.5'],[NaN,18.5],[]]){
  assert.equal(roadGeometryValid({type:'LineString',coordinates:[good[0],point]}),false);
 }
 assert.equal(roadGeometryValid({type:'LineString',coordinates:[good[0]]}),false);
});
test('disconnected route segments are accepted only when every segment is valid',()=>{
 const good=[[-72.3,18.5],[-72.29,18.51]];
 assert.equal(roadGeometryValid({type:'MultiLineString',coordinates:[good,good]}),true);
 for(const bad of [[],[good,[]],[good,[good[0]]],[good,[good[0],[200,18]]]]){
  assert.equal(roadGeometryValid({type:'MultiLineString',coordinates:bad}),false);
 }
 assert.equal(roadGeometryValid({type:'Polygon',coordinates:[good]}),false);
});
