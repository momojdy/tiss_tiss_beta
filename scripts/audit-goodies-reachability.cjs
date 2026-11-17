/* Source reachability only. Import presence does not establish hosted behavior. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
const customer=path.resolve(__dirname,'..'),admin=path.resolve(customer,'../tiss-admin');
function audit(root){
 const config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);if(config.error)throw Error('Cannot read TypeScript config');
 const {options}=ts.parseJsonConfigFileContent(config.config,ts.sys,root),seen=new Map(),queue=[path.join(root,'index.ts')];
 while(queue.length){const file=queue.shift();if(seen.has(file)||!fs.existsSync(file))continue;const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,99,true),imports=[];
  function visit(node){let name;if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteralLike(node.moduleSpecifier))name=node.moduleSpecifier.text;
   if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||node.expression.getText(source)==='require')&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0]))name=node.arguments[0].text;
   if(name){const target=ts.resolveModuleName(name,file,options,ts.sys).resolvedModule?.resolvedFileName;if(target&&target.startsWith(root+path.sep)&&!target.includes('/node_modules/')&&/\.[cm]?[jt]sx?$/.test(target)){imports.push(path.relative(root,target));queue.push(target);}}
   ts.forEachChild(node,visit);
  }visit(source);seen.set(file,{path:path.relative(root,file),sha256:crypto.createHash('sha256').update(text).digest('hex'),imports:[...new Set(imports)]});
 }
 const all=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.[jt]sx?$/.test(file))all.push(file);}}walk(path.join(root,'src'));
 const scoped=all.filter(file=>/\/features\/Goodies\/|\/screens\/Goodies\/|\/businessSpace\/[^/]*[Gg]oodies|\/Wallet\/WalletHelpPay|\/admin\/goodiesConsumer\/|\/admin\/screens\/[^/]+\/[^/]*Goodies/.test(file));
 return{repository:path.basename(root),entry:'index.ts',reachableSourceFiles:seen.size,scoped:scoped.map(file=>({path:path.relative(root,file),reachable:seen.has(file)})),graph:[...seen.values()].filter(row=>scoped.some(file=>path.relative(root,file)===row.path))};
}
const result={generatedAt:new Date().toISOString(),scope:'Literal imports, exports and require/dynamic-import paths reachable from each actual application entry; no hosted runtime claim',repositories:[audit(customer),audit(admin)]};
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(result,null,2)+'\n');
for(const repo of result.repositories)console.log(JSON.stringify({repository:repo.repository,scopedFiles:repo.scoped.length,reachable:repo.scoped.filter(row=>row.reachable).length,unreachable:repo.scoped.filter(row=>!row.reachable).map(row=>row.path)}));
