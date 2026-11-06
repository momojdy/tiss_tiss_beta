const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {analyze,root}=require('./goodies-cms-source.cjs');
const current=analyze(),tracked=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/goodies/cms-field-coverage.json'),'utf8'));
assert.deepEqual(current,{restrictionTexts:tracked.restrictionTexts,entries:tracked.entries,pages:tracked.pages,references:tracked.references,routes:tracked.routes},'Regenerate the CMS source register: node scripts/sync-goodies-cms-catalog.cjs');
const files=fs.readdirSync(path.join(root,'screens')).filter(f=>f.endsWith('.tsx')).map(f=>'screens/'+f).concat(['GoodiesApp.tsx','GoodiesCourierScreen.tsx','components/ui.tsx','components/Sheets.tsx','components/Overlays.tsx','components/cards.tsx','builders/Builder.tsx']);
const missing=[];
for(const rel of files){const filename=path.join(root,rel),ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);function visit(node){
 if(ts.isJsxText(node)&&/[a-zA-Z]/.test(node.text))missing.push({source:rel,line:ast.getLineAndCharacterOfPosition(node.getStart()).line+1,text:node.text});
 if(ts.isJsxAttribute(node)&&/^(title|label|placeholder|accessibilityLabel|accessibilityHint|text|button|sub|link)$/.test(node.name.getText(ast))&&node.initializer&&ts.isStringLiteral(node.initializer)&&/[a-zA-Z]/.test(node.initializer.text))missing.push({source:rel,line:ast.getLineAndCharacterOfPosition(node.getStart()).line+1,text:node.initializer.text});
 ts.forEachChild(node,visit);
 }visit(ast);}
assert.deepEqual(missing,[],'Hardcoded display text bypasses the CMS');
console.log(`PASS: ${current.entries.length} registered fields; ${current.routes.length} discovered routes; no direct JSX text/label bypass in customer screens and shared Goodies components.`);
console.log('Scope: source coverage. Hosted publication, full visual behavior and provider-owned UI require separate verification.');
