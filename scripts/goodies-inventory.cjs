/* Source inventory, not a claim of runtime verification. Run with both checkouts present. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const roots = process.argv.slice(2);
if (!roots.length) roots.push(process.cwd(), path.resolve(process.cwd(), '../tiss-admin'));
const inventory = {schemaVersion: 1, backendDependencies: [], generatedAt: new Date().toISOString(), verification: 'NOT VERIFIED', repositories: []};
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    if (['node_modules', '.git', 'dist', '.expo'].includes(entry.name)) return [];
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? files(filename) : /\.(tsx?|sql)$/.test(filename) ? [filename] : [];
  });
}
for (const root of roots) {
  const repository = {name: path.basename(root), head: cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(), files: []};
  for (const filename of files(path.join(root, 'src'))) {
    const source = fs.readFileSync(filename, 'utf8');
    if (!/goodies/i.test(filename + source)) continue;
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    const relative = path.relative(root, filename);
    const surface = /goodiesConsumer/.test(relative) ? 'admin-preview' : /tiss-admin/.test(root) ? 'admin' : /businessSpace/.test(relative) ? 'vendor' : /Courier/.test(relative) ? 'courier' : /features\/Goodies|screens\/Goodies/.test(relative) ? 'customer' : 'shared';
    const entry = {path: relative, surface, verification: 'NOT VERIFIED', declarations: [], controls: [], calls: [], content: [], navigation: [], permissions: [], states: [], imports: []};
    const at = node => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
    const text = node => node?.getText(ast) || '';
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name) entry.declarations.push({name: text(node.name), line: at(node)});
      if (ts.isImportDeclaration(node)) entry.imports.push({source: node.moduleSpecifier.text, line: at(node)});
      if (ts.isJsxAttribute(node)) {
        const name = text(node.name), value = text(node.initializer);
        if (/^on(Press|Change|Submit|ValueChange|Refresh|Select|Save|Delete|Close|Complete|Cancel)/.test(name)) entry.controls.push({event: name, handler: value, line: at(node), verification: 'NOT VERIFIED'});
        if (/loading|disabled|error|empty|success|busy/i.test(name)) entry.states.push({name, value, line: at(node)});
      }
      if (ts.isCallExpression(node)) {
        const callee = text(node.expression), args = node.arguments.map(text);
        if (/\.(rpc|from|invoke|channel|subscribe|upload|remove|update|insert|delete|upsert)$/.test(callee)) entry.calls.push({callee, arguments: args, line: at(node)});
        if (/^(label|tx|tr|t|rgText|legalDoc)$/.test(callee)) entry.content.push({callee, arguments: args, key: node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : null, fallback: node.arguments[1] && ts.isStringLiteralLike(node.arguments[1]) ? node.arguments[1].text : null, line: at(node)});
        if (/^(go|push|reset|tab|navigate)$|\.navigate$/.test(callee)) entry.navigation.push({callee, arguments: args, line: at(node)});
        if (/permission|authorize|assert|^can$|^needs$|^guard$/i.test(callee)) entry.permissions.push({callee, arguments: args, line: at(node)});
      }
      if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) entry.navigation.push({route: node.expression.text, line: at(node)});
      ts.forEachChild(node, visit);
    }
    visit(ast); repository.files.push(entry);
  }
  inventory.repositories.push(repository);
}
const dependencies = new Map();
for (const repo of inventory.repositories) for (const file of repo.files) for (const call of file.calls) {
  if (!/\.(rpc|from|invoke)$/.test(call.callee) || !/^['"][^'"]+['"]$/.test(call.arguments[0] || '')) continue;
  const target = call.arguments[0].slice(1,-1), kind = call.callee.split('.').at(-1), key = kind + ':' + target;
  if (!dependencies.has(key)) dependencies.set(key, {kind, target, references: []});
  dependencies.get(key).references.push({repository: repo.name, path: file.path, surface: file.surface, line: call.line});
}
inventory.backendDependencies = [...dependencies.values()];
const output = path.join(process.cwd(), 'docs/goodies/source-inventory.json');
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify(inventory.repositories.map(repo => ({repository: repo.name, files: repo.files.length, controls: repo.files.reduce((n, file) => n + file.controls.length, 0), calls: repo.files.reduce((n, file) => n + file.calls.length, 0)}))));
