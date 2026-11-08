/* Read-only source audit. Static traces are not authenticated end-to-end verification. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const customer=path.resolve(__dirname,'..'),admin=path.resolve(customer,'../tiss-admin');
const inventory={generatedAt:new Date().toISOString(),scope:'Goodies and directly referenced shared infrastructure',runtime:'NOT VERIFIED unless a named test explicitly establishes it',files:[],controls:[],backendTargets:[],comments:[],visibleCopyCandidates:[]};
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const roots=[{root:customer,repository:'tiss_tiss_beta',sources:[...walk(path.join(customer,'src/features/Goodies')),...walk(path.join(customer,'src/screens/Goodies')),path.join(customer,'src/screens/businessSpace/BusinessSpaceGoodies.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceGoodiesOrders.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceShared.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceScreen.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceCommunicationScreens.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceAccountScreens.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceActivityScreens.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceHomeScreen.tsx'),path.join(customer,'src/screens/businessSpace/BusinessSpaceSheets.tsx'),path.join(customer,'src/screens/businessSpace/goodiesLibrarySeed.ts'),path.join(customer,'src/screens/businessSpace/goodiesTemplates.ts'),path.join(customer,'src/screens/Wallet/WalletAddNewCardScreen.tsx'),path.join(customer,'src/services/goodiesDeliveryProof.ts')]},{root:admin,repository:'tiss-admin',sources:[...walk(path.join(admin,'src/features/admin/screens/goodies')),...walk(path.join(admin,'src/features/admin/screens/content')).filter(f=>/Goodies|builderImages/.test(f)),...walk(path.join(admin,'src/features/admin/goodiesConsumer')),path.join(admin,'src/features/admin/lib/adminBackend.ts'),path.join(admin,'src/features/admin/lib/cmsAssetPagination.ts'),path.join(admin,'src/features/admin/shell/NotificationsSheet.tsx'),path.join(admin,'src/features/admin/state/access.ts'),path.join(admin,'src/features/admin/state/people.ts'),path.join(admin,'src/features/admin/overlays/PeopleDrawers.tsx'),path.join(admin,'src/features/admin/screens/finance/FinanceScreen.tsx'),path.join(admin,'src/features/admin/lib/goodiesDeliveryProof.ts')]}];
roots[0].sources.push(path.join(customer,'src/screens/businessSpace/BusinessSpaceGoodiesSettlement.tsx'),path.join(customer,'src/services/goodiesSettlement.ts'));
for(const repo of roots)for(const filename of [...new Set(repo.sources)]){
 const source=fs.readFileSync(filename,'utf8'),relative=path.relative(repo.root,filename),ast=ts.createSourceFile(filename,source,99,true),surface=relative.includes('goodiesConsumer')?'isolated-admin-preview':repo.repository==='tiss-admin'?'admin':relative.includes('businessSpace')?'vendor':relative.includes('Courier')?'courier':relative.includes('/Wallet/')?'shared-card':relative==='src/services/goodiesSettlement.ts'?'shared-finance':'consumer';
 const entry={repository:repo.repository,path:relative,surface,lines:source.split('\n').length,functions:[],imports:[],commentCount:0,commentLines:0,demoReferences:[],rawErrorSinks:[],silentFailures:[],stateEvidence:[],backend:[],navigation:[],review:'SOURCE INSPECTED; flags and unresolved runtime checks are recorded separately'};
 const line=node=>ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,text=node=>node?.getText(ast)||'';
 function owner(node){for(let p=node.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)&&p.name)return p.name.text;if(ts.isVariableDeclaration(p)&&p.initializer&&(ts.isArrowFunction(p.initializer)||ts.isFunctionExpression(p.initializer)))return text(p.name);}return 'module';}
 function moduleName(node){for(let p=node.parent;p;p=p.parent){if(ts.isConditionalExpression(p)||ts.isIfStatement(p)){const exp=ts.isIfStatement(p)?text(p.expression):text(p.condition);const m=/module\s*===\s*['"]([^'"]+)/.exec(exp);if(m)return m[1];}}return null;}
 function strings(node){const out=[];function v(n){if(ts.isStringLiteralLike(n))out.push(n.text);ts.forEachChild(n,v);}if(node)v(node);return out;}
 function callInfo(node){const callee=text(node.expression),arg=node.arguments[0];return {callee,targets:strings(arg),line:line(node),arguments:node.arguments.map(text)};}
 const definitions=[];
 function index(node){let name=null,body=null;
  if(ts.isFunctionDeclaration(node)&&node.name&&node.body){name=node.name.text;body=node.body;}
  else if(ts.isVariableDeclaration(node)&&node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer))){name=text(node.name);body=node.initializer.body;}
  else if(ts.isPropertyAssignment(node)&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer))){name=text(node.name);body=node.initializer.body;}
  if(name&&body){const calls=[],states=[],nav=[];function v(n){if(ts.isCallExpression(n))calls.push(callInfo(n));if(ts.isJsxSelfClosingElement(n)||ts.isJsxOpeningElement(n)){const tag=text(n.tagName);if(/Skel|Empty|ErrBox|ActivityIndicator|Skeleton|Loading/.test(tag))states.push({component:tag,line:line(n)});}ts.forEachChild(n,v);}v(body);const d={name,owner:owner(node),line:line(node),end:ast.getLineAndCharacterOfPosition(node.end).line+1,calls,states};definitions.push(d);entry.functions.push(d);}
  ts.forEachChild(node,index);
 }index(ast);
 function resolve(name,context){const simple=name.split('.').at(-1);return definitions.find(d=>d.name===simple&&d.owner===context)||definitions.find(d=>d.name===simple&&d.owner==='module')||definitions.find(d=>d.name===simple);}
 function trace(node,context){const all=[],visited=new Set();function follow(call,depth){if(depth>8)return;all.push(call);const d=resolve(call.callee,context);if(d&&!visited.has(d.line)){visited.add(d.line);d.calls.forEach(c=>follow(c,depth+1));}}function v(n){if(ts.isCallExpression(n))follow(callInfo(n),0);ts.forEachChild(n,v);}v(node);if(ts.isIdentifier(node)){const d=resolve(node.text,context);if(d)d.calls.forEach(c=>follow(c,0));}return [...new Map(all.map(c=>[c.line+':'+c.callee+':'+c.arguments.join('|'),c])).values()];}
 function visit(node){
  if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)){const imports=[];if(node.importClause?.name)imports.push({local:node.importClause.name.text,imported:'default'});const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamespaceImport(bindings))imports.push({local:bindings.name.text,imported:'*'});else if(bindings)for(const item of bindings.elements)imports.push({local:item.name.text,imported:item.propertyName?.text||item.name.text});entry.imports.push({source:node.moduleSpecifier.text,names:imports});}
  if(ts.isJsxAttribute(node)){
   const event=text(node.name),initializer=node.initializer,handler=initializer&&ts.isJsxExpression(initializer)?initializer.expression:initializer;
   if(/^on[A-Z]/.test(event)){
    const calls=handler?trace(handler,owner(node)):[],backend=calls.filter(c=>/^(rpc|goodiesRequest|goodiesOrdersRequest|call)$|\.(rpc|from|invoke|upload|update|insert|delete|upsert|remove)$/.test(c.callee)),nav=calls.filter(c=>/^(go|push|reset|tab|back|browse|openProduct|navBack)$|\.(go|navigate)$/.test(c.callee));
    const attrs=node.parent.attributes?.properties||[],props={};for(const attr of attrs)if(ts.isJsxAttribute(attr)&&/^(label|title|accessibilityLabel|disabled|busy|loading)$/.test(text(attr.name)))props[text(attr.name)]=text(attr.initializer);
    inventory.controls.push({id:repo.repository+':'+relative+':'+line(node)+':'+event,repository:repo.repository,surface,path:relative,line:line(node),owner:owner(node),module:moduleName(node),event,eventKind:/^on(Press|Change|Submit|ValueChange|Refresh|Select|Save|Delete|Close|Complete|Cancel|Back|Cta|Link|RequestClose|Exit|Focus|Blur|AccessibilityAction)/.test(event)?'interaction':'component or lifecycle callback',props,handler:text(handler),trace:calls,backend,navigation:nav,sourceCheck:handler?'HANDLER PRESENT; TRACE RECORDED':'MISSING HANDLER',runtime:'NOT VERIFIED',findings:[]});
   }
   if(/loading|disabled|error|empty|success|busy|refreshing/i.test(event))entry.stateEvidence.push({property:event,value:text(initializer),line:line(node),owner:owner(node)});
  }
  if(ts.isCallExpression(node)){
   const info=callInfo(node),expr=text(node);
   if(/^(rpc|goodiesRequest|goodiesOrdersRequest|call)$|\.(rpc|from|invoke|upload|update|insert|delete|upsert|remove)$/.test(info.callee))entry.backend.push(info);
   if(/^(go|push|reset|tab|back|browse|openProduct|navBack)$|\.(go|navigate)$/.test(info.callee))entry.navigation.push(info);
   if(/(?:^|\.)(?:toast|setMsg|setErr|setLoadErr|setLoadError|setError|setNotice|setAssetNote|alert)$/i.test(info.callee)&&/\.message|errText\(/.test(expr))entry.rawErrorSinks.push({line:line(node),callee:info.callee,expression:expr,owner:owner(node)});
   if(/\.catch$/.test(info.callee)&&/=>\s*(?:\{\s*\}|\[\]|undefined|null|set\w+\(\[\]\))/.test(expr))entry.silentFailures.push({line:line(node),expression:expr,owner:owner(node)});
  }
  if(ts.isCatchClause(node)&&node.block.statements.length===0)entry.silentFailures.push({line:line(node),expression:text(node),owner:owner(node)});
  if(ts.isStringLiteralLike(node)||ts.isJsxText(node)){
   const value=node.text.trim();if(/demo|prototype|sample|mock|simulat|coming soon|not (?:available|connected)|placeholder/i.test(value))entry.demoReferences.push({line:line(node),value,owner:owner(node),parentKind:ts.SyntaxKind[node.parent.kind]});
   if(value.length>30&&/backend|Supabase|RPC|prototype|demo|server|not connected|coming soon|configured|currently unavailable|not available yet/i.test(value)&&!(ts.isImportDeclaration(node.parent)))inventory.visibleCopyCandidates.push({repository:repo.repository,surface,path:relative,line:line(node),value,owner:owner(node),context:ts.SyntaxKind[node.parent.kind],review:'NEEDS CONTEXT; not all literals are rendered'});
  }
  ts.forEachChild(node,visit);
 }visit(ast);
 const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,filename.endsWith('.tsx')?ts.LanguageVariant.JSX:ts.LanguageVariant.Standard,source);for(let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan())if(token===ts.SyntaxKind.SingleLineCommentTrivia||token===ts.SyntaxKind.MultiLineCommentTrivia){const value=scanner.getTokenText();entry.commentCount++;entry.commentLines+=value.split('\n').length;inventory.comments.push({repository:repo.repository,surface,path:relative,line:ast.getLineAndCharacterOfPosition(scanner.getTokenPos()).line+1,text:value});}
 inventory.files.push(entry);
}
// Follow imported/namespace handlers as well as local closures. Dynamic callbacks
// remain explicit unresolved edges; no runtime success is inferred from a trace.
const byFile=new Map(inventory.files.map(file=>[file.repository+':'+file.path,file]));
function findDefinition(file,callee,owner){
 const pieces=callee.split('.');if(!/^[a-zA-Z_$][\w$.]*$/.test(callee)||pieces[0]==='supabase')return null;
 const last=pieces.at(-1);
 let definition=file.functions.find(fn=>fn.name===last&&fn.owner===owner)||file.functions.find(fn=>fn.name===last&&fn.owner==='module');
 if(definition)return {file,definition};
 const imported=file.imports.flatMap(entry=>entry.names.map(name=>({...name,source:entry.source}))).find(entry=>entry.local===pieces[0]);
 if(!imported||!imported.source.startsWith('.'))return null;
 const relative=path.normalize(path.join(path.dirname(file.path),imported.source));
 const target=[relative,relative+'.ts',relative+'.tsx',path.join(relative,'index.ts')].map(name=>byFile.get(file.repository+':'+name)).find(Boolean);
 if(!target)return null;
 const name=imported.imported==='*'?last:imported.imported;
 definition=target.functions.find(fn=>fn.name===name);return definition?{file:target,definition}:null;
}
for(const control of inventory.controls){
 const file=byFile.get(control.repository+':'+control.path),calls=[],visited=new Set();
 function follow(call,context,owner,depth=0){if(depth>10)return;calls.push({...call,repository:context.repository,path:context.path});const found=findDefinition(context,call.callee,owner);if(!found)return;const key=found.file.repository+':'+found.file.path+':'+found.definition.line;if(visited.has(key))return;visited.add(key);found.definition.calls.forEach(next=>follow(next,found.file,found.definition.name,depth+1));}
 control.trace.forEach(call=>follow(call,file,control.owner));
 const callbackAst=ts.createSourceFile('callback.tsx','const callback = '+control.handler,99,true);
 function followReferences(node){if(ts.isIdentifier(node)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)){const name=ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node?node.parent.getText(callbackAst):node.text;const found=findDefinition(file,name,control.owner);if(found)found.definition.calls.forEach(call=>follow(call,found.file,found.definition.name));}ts.forEachChild(node,followReferences);}followReferences(callbackAst);
 if(/^[a-zA-Z_$][\w$.]*$/.test(control.handler)){const found=findDefinition(file,control.handler,control.owner);if(found)found.definition.calls.forEach(call=>follow(call,found.file,found.definition.name));}
 control.trace=[...new Map(calls.map(call=>[call.path+':'+call.line+':'+call.callee+':'+call.arguments.join('|'),call])).values()];
 control.backend=control.trace.filter(call=>/^(rpc|goodiesRequest|goodiesOrdersRequest|call)$|\.(rpc|from|invoke|upload|update|insert|delete|upsert|remove)$/.test(call.callee));
 control.navigation=control.trace.filter(call=>/^(go|push|reset|tab|back|browse|openProduct|navBack)$|\.(go|navigate)$/.test(call.callee));
 control.unresolvedCalls=control.trace.filter(call=>!/^(set[A-Z]|React\.|console\.|Object\.|Array\.|String$|Number$|Math\.|supabase)/.test(call.callee)&&!findDefinition(byFile.get(call.repository+':'+call.path)||file,call.callee,control.owner)).map(call=>({callee:call.callee,path:call.path,line:call.line}));
}
const targets=new Map();for(const file of inventory.files)for(const call of file.backend)if(/^(rpc|goodiesRequest|goodiesOrdersRequest|call)$|\.(rpc|from|invoke)$/.test(call.callee))for(const target of call.targets){const kind=/rpc$/.test(call.callee)||['goodiesRequest','goodiesOrdersRequest','call'].includes(call.callee)?'rpc':/invoke$/.test(call.callee)?'edge':'table',key=kind+':'+target;if(!targets.has(key))targets.set(key,{kind,target,references:[]});targets.get(key).references.push({repository:file.repository,path:file.path,line:call.line,surface:file.surface});}inventory.backendTargets=[...targets.values()];
// Normalize repeated call-site data so every control keeps a complete trace
// without duplicating large request arguments hundreds of times.
const callSites=[],callIds=new Map();
function intern(call,file){const repository=call.repository||file.repository,source=call.path||file.path;const key=repository+':'+source+':'+call.line+':'+call.callee+':'+JSON.stringify(call.arguments||[]);if(!callIds.has(key)){const id='call-'+callSites.length;callIds.set(key,id);callSites.push({id,repository,path:source,...call});}return callIds.get(key);}
for(const file of inventory.files){file.functions.forEach(fn=>{fn.calls=fn.calls.map(call=>intern(call,file));});file.backend=file.backend.map(call=>intern(call,file));file.navigation=file.navigation.map(call=>intern(call,file));}
for(const control of inventory.controls){control.trace=control.trace.map(call=>intern(call,control));control.backend=control.backend.map(call=>intern(call,control));control.navigation=control.navigation.map(call=>intern(call,control));}
inventory.callSites=callSites;
const out=process.argv[2] ? path.resolve(process.argv[2]) : path.join(customer,'docs/goodies/audit/source-controls.json');fs.writeFileSync(out,JSON.stringify(inventory)+'\n');
console.log(JSON.stringify({files:inventory.files.length,controls:inventory.controls.length,bySurface:Object.fromEntries([...new Set(inventory.controls.map(c=>c.surface))].map(s=>[s,inventory.controls.filter(c=>c.surface===s).length])),backendTargets:inventory.backendTargets.length,errorSinks:inventory.files.reduce((n,f)=>n+f.rawErrorSinks.length,0),comments:inventory.comments.length,copyCandidates:inventory.visibleCopyCandidates.length}));
