const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test('a shared-shop entry is consumed once without changing the destination of the mounted Goodies instance',()=>{
 const file='src/screens/Goodies/goodiesHomeScreen.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true,ts.ScriptKind.TSX);
 const declaration=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='GoodiesHomeScreen').getText(ast).replace('export default ','');
 const refs=[],effects=[];let cursor=0,consumed=0;const module={exports:{}};
 vm.runInNewContext(compile(declaration+'\nmodule.exports=GoodiesHomeScreen;'),{module,React:{createElement:(type,props)=>({type,props})},GoodiesApp:'GoodiesApp',useRef:initial=>refs[cursor++]||=( {current:initial}),useEffect:fn=>{if(!effects.length)effects.push(fn);}});
 const render=initialRoute=>{cursor=0;return module.exports({initialRoute,onInitialRouteConsumed:()=>consumed++,onBack:()=>{}});};
 assert.equal(render('store:shared-shop').props.initialRoute,'store:shared-shop');effects[0]();assert.equal(consumed,1);
 assert.equal(render(undefined).props.initialRoute,'store:shared-shop','Clearing the shell intent must not cancel an in-progress shared-shop entry');
 refs.length=0;assert.equal(render(undefined).props.initialRoute,undefined,'A later mount must not reuse the shared-shop destination');
});
test('the real carousel handler clears stale shop destinations while message shop buttons retain their destination',()=>{
 const file='App.tsx',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true,ts.ScriptKind.TSX),handlers=[];
 function visit(n){if(ts.isJsxAttribute(n)&&['onGoodiesPress','onOpenShop','onInitialRouteConsumed'].includes(n.name.getText(ast))&&ts.isJsxExpression(n.initializer))handlers.push({name:n.name.getText(ast),owner:n.parent.parent.tagName.getText(ast),source:n.initializer.expression.getText(ast)});ts.forEachChild(n,visit);}visit(ast);
 let route='store:previous-shop',screen='home';const run=(handler,...args)=>{const module={exports:{}};vm.runInNewContext(compile('module.exports='+handler.source),{module,setGoodiesInitialRoute:value=>route=value,setBuyerScreen:value=>screen=value});module.exports(...args);};
 const carousel=handlers.find(h=>h.name==='onGoodiesPress');assert.ok(carousel);run(carousel);assert.equal(route,undefined);assert.equal(screen,'goodies');
 const shops=handlers.filter(h=>h.name==='onOpenShop'&&['MessagesScreen','MessageHubScreen'].includes(h.owner));assert.equal(shops.length,2);for(const shop of shops){run(shop,'shared-shop');assert.equal(route,'store:shared-shop');}
 const consume=handlers.find(h=>h.name==='onInitialRouteConsumed');assert.ok(consume);run(consume);assert.equal(route,undefined);
});
