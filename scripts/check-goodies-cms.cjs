const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {analyze,root}=require('./goodies-cms-source.cjs');
const current=analyze();
const files=fs.readdirSync(path.join(root,'screens')).filter(f=>f.endsWith('.tsx')).map(f=>'screens/'+f).concat(['GoodiesApp.tsx','GoodiesQuickMenu.tsx','GoodiesCourierScreen.tsx','components/ui.tsx','components/Sheets.tsx','components/Overlays.tsx','components/cards.tsx','builders/Builder.tsx']);
const missing=[];
for(const rel of files){const filename=path.join(root,rel),ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);function visit(node){
 if(ts.isJsxText(node)&&/[a-zA-Z]/.test(node.text))missing.push({source:rel,line:ast.getLineAndCharacterOfPosition(node.getStart()).line+1,text:node.text});
 if(ts.isJsxAttribute(node)&&/^(title|label|placeholder|accessibilityLabel|accessibilityHint|text|button|sub|link)$/.test(node.name.getText(ast))&&node.initializer&&ts.isStringLiteral(node.initializer)&&/[a-zA-Z]/.test(node.initializer.text))missing.push({source:rel,line:ast.getLineAndCharacterOfPosition(node.getStart()).line+1,text:node.initializer.text});
 ts.forEachChild(node,visit);
 }visit(ast);}
assert.deepEqual(missing,[],'Hardcoded display text bypasses the CMS');
console.log(`PASS: ${current.entries.length} registered fields; ${current.routes.length} discovered routes; no direct JSX text/label bypass in customer screens and shared Goodies components.`);
console.log('Scope: source coverage. Hosted publication, full visual behavior and provider-owned UI require separate verification.');
const registered=new Set(current.entries.map(entry=>entry.id));
const violations=[];
function inspect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())inspect(file);else if(/\.tsx?$/.test(file)){const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);function visit(node){
 if(ts.isCallExpression(node)&&/^(label|cmsLabel|cardText|walletText)$/.test(node.expression.getText(ast))&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&!registered.has(node.arguments[0].text))violations.push('Unregistered '+node.arguments[0].text);
 if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind))for(const side of [node.left,node.right])if(ts.isCallExpression(side)&&/^(label|cmsLabel)$/.test(side.expression.getText(ast)))violations.push('CMS text used as an internal state comparison in '+file);
 ts.forEachChild(node,visit);}visit(ast);}}}
inspect(root);assert.deepEqual(violations,[],'CMS labels must cover literal references without changing internal states');
assert.equal(new Set(current.routes.map(route=>route.route)).size,34,'Update the explicit route acceptance register when navigation changes.');
