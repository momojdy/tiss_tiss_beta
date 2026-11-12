const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {test}=require('node:test'),{analyze}=require('../scripts/goodies-cms-source.cjs');
const root=path.resolve(__dirname,'../src/features/Goodies'),state={S:{lang:'en'},contentHooks:{}},cache=new Map();
function load(filename){
 if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 function local(id){
  if(id==='@react-native-async-storage/async-storage')return {getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};
  if(id.endsWith('/store'))return state;
  if(id.endsWith('/wantissCms'))return {fetchPublishedWantissContent:async()=>({content:[],assets:[]})};
  if(!id.startsWith('.'))return require(id);
  const target=path.resolve(path.dirname(filename),id),resolved=[target,target+'.ts',target+'.tsx',path.join(target,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(!resolved)throw Error('Missing '+target);return load(resolved);
 }
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(local,module,module.exports);return module.exports;
}
const content=load(path.join(root,'content.ts')),i18n=load(path.join(root,'i18n/index.ts'));
const source=analyze();
test('every source CMS field resolves manually edited published text in each configured locale',()=>{
 const labels=source.entries.map(field=>({id:field.id,t:Object.fromEntries(['en','fr','ht','es','zh-Hans'].map(locale=>[locale,{v:locale+' edited '+field.text,s:'reviewed'}]))}));
 content.applyContent({v:5,labels});
 for(const locale of ['en','fr','ht','es','zh-Hans']){state.S.lang=locale;for(const field of source.entries)assert.equal(content.label(field.id,'fallback'),locale+' edited '+field.text,field.id);}
 state.S.lang='fr';assert.equal(i18n.t('back'),'fr edited Back');
});
test('review boundaries, structured content, formatting and content refresh remain intact',async()=>{
 state.S.lang='ht';let updates=0;const stop=content.onContent(()=>updates++);
 content.applyContent({v:5,labels:[{id:'lbl.interface.back',t:{en:{v:'Go back',s:'reviewed'},ht:{v:'Unreviewed',s:'draft'}}}],faq:[{q:{en:{v:'Edited question'}},a:{en:{v:'Edited answer'}}}],topics:[{t:{en:{v:'Edited topic'}}}],legal:[{id:'legal.terms',st:'Live',t:{en:{v:'Edited policy'}}}]});
 assert.equal(i18n.t('back'),'Go back');assert.deepEqual(content.faq([]),[['Edited question','Edited answer']]);assert.deepEqual(content.supportTopics([]),['Edited topic']);assert.equal(content.legalDoc('legal.terms'),'Edited policy');assert.equal(updates,1);
 await content.clearContent();assert.equal(i18n.t('back'),'Back');stop();
});
test('generated source register remains synchronized with every literal call and interface key',()=>{
 const tracked=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/goodies/cms-field-coverage.json'),'utf8'));
 assert.deepEqual(source, {restrictionTexts:tracked.restrictionTexts,entries:tracked.entries,pages:tracked.pages,references:tracked.references,routes:tracked.routes});
 for(const reference of source.references)assert.ok(source.entries.some(field=>field.id===reference.id));
});
test('Goodies card-form copy is editable and safely escaped without changing the shared default flow',()=>{
 const filename=path.resolve(__dirname,'../src/screens/Wallet/WalletAddNewCardScreen.tsx');
 const sourceFile=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);
 const declaration=sourceFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='makeStripeHtml');assert.ok(declaration);
 const code=ts.transpileModule('const defaultCardLabel=(_id, fallback)=>fallback;\n'+declaration.getText(sourceFile)+'\nmodule.exports=makeStripeHtml;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};vm.runInThisContext('(function(module){'+code+'})')(module);
 const makeHtml=module.exports,normal=makeHtml('synthetic-secret','pk_test_synthetic');
 assert.ok(normal.includes('<label>Card Number</label>'));assert.ok(normal.includes('<label>Expiry Date</label>'));
 const attack='</label><script>untrusted()</script>',edited=makeHtml('synthetic-secret','pk_test_synthetic',()=>attack);
 assert.ok(!edited.includes(attack));assert.ok(edited.includes('&lt;script&gt;untrusted()&lt;/script&gt;'));
});

test('unfinished Creole stays unavailable in production and falls back to reviewed English across app text and content',()=>{
 for(const status of ['draft','missing',undefined,'unknown']){
  const ht={v:'Synthetic unfinished Creole',...(status?{s:status}:{})},text={en:{v:'Reviewed English',s:'reviewed'},fr:{v:'Français',s:'reviewed'},es:{v:'Español',s:'reviewed'},'zh-Hans':{v:'中文',s:'reviewed'},ht};
  const before=JSON.stringify(text);state.S.lang='ht';
  content.applyContent({v:5,labels:[{id:'lbl.interface.back',t:text}],faq:[{q:text,a:text}],topics:[{t:text}],legal:[{id:'legal.terms',st:'Live',t:text}],modes:[{id:'mode.food',title:text,sub:text}]});
  assert.equal(content.label('lbl.interface.back','Source fallback'),'Reviewed English');assert.equal(i18n.t('back'),'Reviewed English');
  assert.deepEqual(content.faq([]),[['Reviewed English','Reviewed English']]);assert.deepEqual(content.supportTopics([]),['Reviewed English']);assert.equal(content.legalDoc('legal.terms'),'Reviewed English');
  assert.equal(JSON.stringify(text),before);
 }
 const text={en:{v:'Reviewed English',s:'reviewed'},ht:{v:'Synthetic reviewed Creole',s:'reviewed'}};content.applyContent({v:5,labels:[{id:'lbl.interface.back',t:text}]});assert.equal(content.label('lbl.interface.back','fallback'),'Synthetic reviewed Creole');
});


test('filter labels update with CMS content while selection keys remain stable',()=>{
 const file=path.join(root,'store.ts'),source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,99,true);
 const declarations=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['filterChoice','FCH'].includes(d.name.getText(ast))));
 const code=ts.transpileModule(declarations.map(n=>n.getText(ast)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 let wording='All';const module={exports:{}};vm.runInThisContext('(function(module,exports,label){'+code+'})')(module,module.exports,(id,fallback)=>id==='lbl.filterAll'?wording:fallback);
 const rows=module.exports.FCH;assert.deepEqual(rows.map(row=>row[0]),['','offers','free','top','fast','open','near']);
 assert.equal(rows[0][1],'All');wording='Edited filter';assert.equal(rows[0][1],'Edited filter');assert.equal(JSON.parse(JSON.stringify(rows))[0][1],'Edited filter');
});

test('card verification errors show app-owned editable copy instead of provider details',()=>{
 const file=path.join(root,'screens/CardAuthentication.tsx'),ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let handler;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='onMessage')handler=node.initializer.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(handler);
 const code=ts.transpileModule('module.exports='+handler,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};let shown;vm.runInThisContext('(function(module,label,setProblem,setBusy,onComplete){'+code+'})')(module,(id,fallback)=>'CMS '+fallback,value=>shown=value,()=>{},()=>{});
 module.exports({nativeEvent:{data:JSON.stringify({error:'SQL failure secret_token=do-not-show'})}});
 assert.match(shown,/^CMS /);assert.doesNotMatch(shown,/SQL|secret_token/);
});
