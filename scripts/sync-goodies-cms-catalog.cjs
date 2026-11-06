/* Synchronize literal customer CMS keys into the admin starter catalog; never publish. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sourceRoot = path.resolve(__dirname, '../src/features/Goodies');
const adminRoot = path.resolve(process.argv[2] || path.resolve(__dirname, '../../tiss-admin'));
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const filename = path.join(dir,entry.name);
    return entry.isDirectory() ? files(filename) : /\.tsx?$/.test(filename) ? [filename] : [];
  });
}
const entries = new Map();
for (const filename of files(sourceRoot)) {
  const ast = ts.createSourceFile(filename, fs.readFileSync(filename,'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'label' && node.arguments.length >= 2
      && ts.isStringLiteralLike(node.arguments[0]) && ts.isStringLiteralLike(node.arguments[1])) {
      const [key, fallback] = node.arguments;
      const existing = entries.get(key.text);
      if (existing) {
        if (existing.text !== fallback.text) console.warn('Existing key has alternate fallback: ' + key.text);
        return;
      }
      entries.set(key.text, {id:key.text, text:fallback.text});
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
}
const output = path.join(adminRoot,'src/features/admin/goodiesConsumer/customerLabelCatalog.json');
fs.writeFileSync(output,JSON.stringify([...entries.values()].sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');
console.log(`Synchronized ${entries.size} customer CMS labels. Nothing was published.`);
