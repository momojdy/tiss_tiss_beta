/* Generate manual editor fields and source associations. Never save or publish remotely. */
const fs=require('node:fs'),path=require('node:path');
const {analyze,criticalKeys:sourceCriticalKeys}=require('./goodies-cms-source.cjs');
const adminRoot=path.resolve(process.argv[2]||path.resolve(__dirname,'../../tiss-admin'));
const result=analyze();
const criticalKeys=sourceCriticalKeys(result);
const target=path.join(adminRoot,'src/features/admin/goodiesConsumer');
fs.writeFileSync(path.join(target,'criticalContentKeys.json'),JSON.stringify(criticalKeys,null,2)+'\n');
fs.writeFileSync(path.join(target,'customerLabelCatalog.json'),JSON.stringify(result.entries,null,2)+'\n');
fs.writeFileSync(path.join(target,'customerRestrictionCatalog.json'),JSON.stringify(result.restrictionTexts,null,2)+'\n');
fs.writeFileSync(path.join(target,'customerPageCatalog.json'),JSON.stringify(result.pages,null,2)+'\n');
console.log(`${result.entries.length} fields, ${result.pages.length} page/shared groups, ${result.routes.length} routes; no publication.`);
