const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript'),vm=require('node:vm');
const root=path.resolve(__dirname,'../src/screens/Konsoliss');const home=fs.readFileSync(path.join(root,'konsolissHomeScreen.tsx'),'utf8');
function renderer(){const ast=ts.createSourceFile('home.tsx',home,99,true,ts.ScriptKind.TSX);let value;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='CONTAINER_JS')value=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);return value;}
test('approved carton renderer is byte-identical; localized annotations are supplied separately',()=>{
 const source=renderer();assert.equal(crypto.createHash('sha256').update(source).digest('hex'),require('./konsoliss-renderer-contract.json').sha256);
 const script=vm.runInNewContext(source);assert.doesNotThrow(()=>new vm.Script(script)); // parse only; no canvas or visual regression execution
 assert.match(home,/annotationScript\(copy\)/);
});
test('original animation contract retains 4.8-second loading, 3.8-second highlight, five-second empty period',()=>{
 const source=renderer();for(const token of ['%13600','cycle<4800','cycle<8600','cycle>=4800&&cycle<8600'])assert.ok(source.includes(token),token);
});
test('lifecycle explanation remains temporary and server state is not mutated by the homepage',()=>{
 assert.match(home,/setTimeout\(\(\) => setLifecycleNotice\(null\), 7000\)/);
 assert.match(home,/previousContainerStage\.current === assignedStage/);
 assert.match(home,/copy\['lifecycle\.'\+lifecycleNotice\+'\.description'\]/);
 assert.doesNotMatch(home,/supabase\.(from|rpc)/);
});
test('customer and shared-container progress are separate and manually restart the seven-second dwell',()=>{
 assert.match(home,/progress\.allocatedCbm\/progress\.reservedCbm/);
 assert.match(home,/containerOccupancy\.loadedCbm\/containerOccupancy\.capacityCbm/);
 assert.match(home,/\[selectedContainer\?\.id,progressView\]/);
 assert.match(home,/showEmptyLoadHint/);assert.doesNotMatch(home,/KS-DEMO-/);
});

test('annotation localization preserves measured suffixes and safely escapes embedded HTML',()=>{
 const ast=ts.createSourceFile('home.tsx',home,99,true,ts.ScriptKind.TSX);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='annotationScript');
 const plain=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const make=vm.runInNewContext(plain+';annotationScript;');const script=make({'canvas.current':'Ma cargaison','canvas.free':'Libre {volume} CBM','canvas.ceiling':'Plafond {height} m </script>'});assert.ok(!script.includes('</script>'));
 const calls=[];class Canvas{}Canvas.prototype.fillText=function(...args){calls.push(args);};Canvas.prototype.strokeText=Canvas.prototype.fillText;
 vm.runInNewContext(script,{CanvasRenderingContext2D:Canvas});const canvas=new Canvas();canvas.fillText('My current loaded space 0.02 CBM',12,20);canvas.strokeText('67.9 CBM free',2,3);canvas.fillText('Ceiling 2.69 m',3,4);
 assert.deepEqual(calls,[['Ma cargaison 0.02 CBM',12,20],['Libre 67.9 CBM',2,3],['Plafond 2.69 m </script>',3,4]]);
});

 test('new annotation templates localize measured parts and measure translated text without modifying numbers or running CMS script',()=>{
 const ast=ts.createSourceFile('home.tsx',home,99,true,ts.ScriptKind.TSX);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='annotationScript');const make=vm.runInNewContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText+';annotationScript;');const copy={'load.loadedVolume':'Chargé {volume} CBM','load.unassignedVolume':'Non affecté {volume} CBM','canvas.reservedHere':'Réservé {volume} CBM','load.illustration':'Illustration </script>','canvas.preview':'{label}: {volume} CBM','load.reserved':'Réservé'};const script=make(copy);assert.ok(!script.includes('</script>'));const calls=[];class Canvas{fillText(x){calls.push(x)}strokeText(x){calls.push(x)}measureText(x){return {width:x.length}}};vm.runInNewContext(script,{CanvasRenderingContext2D:Canvas});const ctx=new Canvas();const input='0.3 CBM loaded • 0.2 CBM unassigned',expected='Chargé 0.3 CBM • Non affecté 0.2 CBM';ctx.fillText(input);ctx.strokeText('0.500 CBM reserved here · not loaded yet');ctx.fillText('Space preview: 0.020 CBM');ctx.fillText('Illustration · not a real container');assert.deepEqual(calls,[expected,'Réservé 0.500 CBM','Réservé: 0.020 CBM','Illustration </script>']);assert.equal(ctx.measureText(input).width,expected.length);
 });
