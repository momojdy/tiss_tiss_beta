/* Generate manual editor fields and source associations. Never save or publish remotely. */
const fs=require('node:fs'),path=require('node:path');
const {analyze}=require('./goodies-cms-source.cjs');
const adminRoot=path.resolve(process.argv[2]||path.resolve(__dirname,'../../tiss-admin'));
const result=analyze();
const target=path.join(adminRoot,'src/features/admin/goodiesConsumer');
fs.writeFileSync(path.join(target,'customerLabelCatalog.json'),JSON.stringify(result.entries,null,2)+'\n');
fs.writeFileSync(path.join(target,'customerRestrictionCatalog.json'),JSON.stringify(result.restrictionTexts,null,2)+'\n');
fs.writeFileSync(path.join(target,'customerPageCatalog.json'),JSON.stringify(result.pages,null,2)+'\n');
fs.mkdirSync(path.resolve(__dirname,'../docs/goodies'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,'../docs/goodies/cms-field-coverage.json'),JSON.stringify({scope:'Source coverage; hosted save/publication and visual verification are separate',...result},null,2)+'\n');
console.log(`${result.entries.length} fields, ${result.pages.length} page/shared groups, ${result.routes.length} routes; no publication.`);
