#!/usr/bin/env node
'use strict';

// Read current, bounded source scopes. This script never imports application code,
// connects to a backend, runs handlers, or changes the semantic audit reports.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const adminRoot = path.resolve(root, '../tiss-admin');
const ts = require(path.join(root, 'node_modules/typescript'));
const auditDir = path.join(root, 'docs/goodies/re-audit-20261118');
const output = path.join(auditDir, 'current-source-inventory.json');
const MAX_FILES = 180, MAX_FILE_BYTES = 2 * 1024 * 1024, MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const SOURCE_TRACE = 'SOURCE_TRACE', HOSTED_NOT_VERIFIED = 'HOSTED_NOT_VERIFIED';
const roots = {customer: root, admin: adminRoot};
const scopes = new Map(), parsed = new Map(), seedReports = [];
const controls = [], functions = [], backendCalls = [], serviceCalls = [], navigationCalls = [];
const demoReferences = [], embeddedCodeSurfaces = [], embeddedEventReferences = [], dependencyEdges = [];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const posix = value => value.split(path.sep).join('/');

function readSource(repository, file) {
  if (!/^(src|tests)\//.test(file) || file.includes('..') || path.isAbsolute(file)) throw Error(`Unsafe source path: ${file}`);
  const absolute = path.join(roots[repository], file);
  if (fs.statSync(absolute).size > MAX_FILE_BYTES) throw Error(`Source exceeds size bound: ${file}`);
  return fs.readFileSync(absolute, 'utf8');
}
function add(repository, file, role, options = {}) {
  file = posix(file);
  const key = `${repository}:${file}`, found = scopes.get(key);
  if (found) { found.roles.add(role); return found; }
  if (scopes.size >= MAX_FILES) throw Error(`Source scope exceeds ${MAX_FILES} files`);
  const scope = {repository, file, roles: new Set([role]), includedFunctions: options.includedFunctions || 'all',
    scope: options.scope || 'Dedicated Goodies source', metadataOnly: !!options.metadataOnly};
  scopes.set(key, scope);
  return scope;
}
function seed(repository, name, role, key) {
  const file = path.join(roots[repository], 'docs/goodies/re-audit-20261118', name);
  const text = fs.readFileSync(file, 'utf8'), report = JSON.parse(text);
  seedReports.push({repository, file: posix(path.relative(roots[repository], file)), sha256: sha256(text), role});
  for (const entry of report[key]) add(repository, entry.file, role, {
    includedFunctions: entry.includedFunctions, scope: entry.scope || `Existing ${role} audit scope`,
    metadataOnly: !entry.file.startsWith('src/'),
  });
}
seed('customer', 'customer-controls.json', 'customer', 'sourceFiles');
seed('customer', 'vendor.json', 'vendor', 'files');
seed('customer', 'courier.json', 'courier', 'files');
seed('admin', 'admin.json', 'admin', 'files');

// Include new dedicated source and localization files without expanding the
// shared Business Space files beyond their original includedFunctions lists.
function walk(directory, visit) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, visit); else visit(absolute);
  }
}
walk(path.join(root, 'src/features/Goodies'), absolute => {
  if (/\.(tsx?|json)$/.test(absolute)) add('customer', posix(path.relative(root, absolute)), 'customer');
});
for (const name of fs.readdirSync(path.join(root, 'src/screens/businessSpace')).sort()) {
  if (/^BusinessSpaceGoodies.*\.(tsx?|json)$/.test(name) || name === 'goodiesTemplates.ts') add('customer', `src/screens/businessSpace/${name}`, 'vendor');
}
for (const name of fs.readdirSync(path.join(root, 'src/services')).sort()) {
  if (/^goodies.*\.ts$/.test(name)) add('customer', `src/services/${name}`, 'vendor');
}
add('customer', 'src/features/Goodies/i18n/vendorCopy.json', 'vendor');
add('admin', 'src/features/admin/shell/Nav.tsx', 'admin', {scope: 'Actual admin route registry and navigation implementation'});
for (const name of ['previewRuntime.ts', 'previewNative.tsx', 'previewBuilders.ts', 'previewBuilderTemplates.ts', 'previewMenu.tsx', 'previewLocales.ts', 'previewSourceManifest.json']) {
  const file = `src/features/admin/goodiesConsumer/${name}`;
  if (fs.existsSync(path.join(adminRoot, file))) add('admin', file, 'admin-preview', {metadataOnly: true, scope: 'Isolated preview port/manifest; generated customer mirrors are not recounted'});
}

function line(source, node) { return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1; }
function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
  return node;
}
function literal(node) { node = unwrap(node); return node && (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) ? node.text : null; }
function astFor(repository, file) {
  const key = `${repository}:${file}`;
  if (!parsed.has(key)) {
    const text = readSource(repository, file);
    parsed.set(key, {text, source: ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)});
  }
  return parsed.get(key);
}
function namedFunction(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) && node.name) return node.name.getText();
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    if (ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent)) return node.parent.name.getText();
    if (ts.isCallExpression(node.parent) && ts.isVariableDeclaration(node.parent.parent)) return node.parent.parent.name.getText();
  }
  return null;
}
function owner(node) {
  const names = [];
  for (let p = node.parent; p; p = p.parent) { const name = namedFunction(p); if (name) names.unshift(name); }
  return names.join('.') || 'module';
}
function included(node, scope) {
  if (scope.includedFunctions === 'all') return true;
  for (let p = node; p; p = p.parent) if (ts.isFunctionDeclaration(p) && p.name && scope.includedFunctions.includes(p.name.text)) return true;
  return false;
}
function base(scope, source, node) {
  return {repository: scope.repository, file: scope.file, line: line(source, node), owner: owner(node), roles: [...scope.roles].sort(), classification: SOURCE_TRACE, hostedClassification: HOSTED_NOT_VERIFIED};
}
function variable(repository, file, name) {
  const {source} = astFor(repository, file); let result;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) result = unwrap(node.initializer); ts.forEachChild(node, visit); }
  visit(source);
  if (!result) throw Error(`Missing actual registry ${name} in ${file}`);
  return {source, node: result, file};
}
function objectRegistry(repository, file, name) {
  const record = variable(repository, file, name);
  if (!ts.isObjectLiteralExpression(record.node)) throw Error(`Expected object registry ${name}`);
  return {...record, values: Object.fromEntries(record.node.properties.filter(ts.isPropertyAssignment).map(property => [literal(property.name) ?? property.name.getText(record.source), literal(property.initializer) ?? property.initializer.getText(record.source)]))};
}
function arrayRegistry(repository, file, name) {
  const record = variable(repository, file, name);
  if (!ts.isArrayLiteralExpression(record.node)) throw Error(`Expected array registry ${name}`);
  return {...record, values: record.node.elements.map(literal).filter(value => value !== null)};
}
const customerRouteFile = 'src/features/Goodies/GoodiesApp.tsx';
const customerAccountRouteFile = 'src/features/Goodies/screens/Account.tsx';
const customerRoutes = [];
for (const file of [customerRouteFile, customerAccountRouteFile]) {
  const {source} = astFor('customer', file);
  function customerCases(node) {
    if (ts.isSwitchStatement(node) && node.expression.getText(source) === 'r') {
      for (const clause of node.caseBlock.clauses) if (ts.isCaseClause(clause) && literal(clause.expression) !== null) customerRoutes.push({target: literal(clause.expression), file, line: line(source, clause)});
    }
    ts.forEachChild(node, customerCases);
  }
  customerCases(source);
}
const businessPages = objectRegistry('customer', 'src/screens/businessSpace/BusinessSpaceScreen.tsx', 'PAGES');
const adminScreens = objectRegistry('admin', 'src/features/admin/shell/ScreenHost.tsx', 'SCREENS');
const adminModules = arrayRegistry('admin', 'src/features/admin/screens/goodies/GoodiesAdminScreen.tsx', 'MODULES');
const adminHubModules = arrayRegistry('admin', 'src/features/admin/screens/goodies/modules.ts', 'GOODIES_MODULES');
const adminModuleMap = objectRegistry('admin', 'src/features/admin/screens/ecosystem/useOpenModule.ts', 'goodiesState');
if (customerRoutes.length !== 34 || Object.keys(businessPages.values).length !== 22) throw Error('Goodies route registry count changed; review the bounded validation assumptions (customer 34, Business Space 22).');

const customerTargets = new Set(customerRoutes.map(route => route.target));
const labelKeys = new Set(['label', 'title', 'accessibilityLabel', 'cta', 'text', 'name']);
const eventName = name => (name !== 'onConflict' && /^on[A-Z]/.test(name)) || ['retry', 'action', 'press'].includes(name);
function properties(node) { return node && ts.isObjectLiteralExpression(node) ? node.properties : []; }
function objectLabels(node, source) {
  return properties(node).filter(property => ts.isPropertyAssignment(property) && labelKeys.has(property.name.getText(source).replace(/^['"]|['"]$/g, '')))
    .map(property => ({property: property.name.getText(source), expression: property.initializer.getText(source)}));
}
function childLabels(element, source) {
  if (!element || !ts.isJsxElement(element) || !/(?:Pressable|Touchable|Button|Btn|Cta|Link|Tab|Action)/.test(element.openingElement.tagName.getText(source))) return [];
  const labels = [];
  function visit(node) {
    if (ts.isJsxText(node) && node.getText(source).trim()) labels.push(node.getText(source).trim());
    else if (ts.isJsxExpression(node) && node.expression) labels.push(`{${node.expression.getText(source)}}`);
    else ts.forEachChild(node, visit);
  }
  for (const child of element.children) visit(child);
  return labels;
}
function resolvedImport(repository, file, module) {
  if (!module.startsWith('.')) return null;
  const candidate = path.resolve(roots[repository], path.dirname(file), module);
  for (const suffix of ['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
    const absolute = candidate + suffix;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return posix(path.relative(roots[repository], absolute));
  }
  return null;
}
function navRecord(scope, source, node, call, kind, targetNode, registry, extra = {}) {
  const target = literal(targetNode);
  navigationCalls.push({...base(scope, source, node), call, kind, targetExpression: targetNode?.getText(source) ?? null, target,
    validation: registry ? target === null ? 'DYNAMIC_TARGET_NOT_EXHAUSTIVELY_VALIDATED' : Object.hasOwn(registry, target) ? 'LITERAL_REGISTERED_SOURCE_TARGET' : 'UNRESOLVED_LITERAL_SOURCE_TARGET' : 'TARGET_RECORDED_WITHOUT_REGISTRY_VALIDATION', ...extra});
}

const files = [];
for (const scope of [...scopes.values()].sort((a, b) => `${a.repository}:${a.file}`.localeCompare(`${b.repository}:${b.file}`))) {
  const {text, source} = astFor(scope.repository, scope.file);
  if (!scope.metadataOnly && !scope.file.endsWith('.json') && source.parseDiagnostics.length) throw Error(`Source has ${source.parseDiagnostics.length} TypeScript parse diagnostics: ${scope.repository}:${scope.file}`);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, text);
  let commentCount = 0, commentLines = 0;
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) { commentCount++; commentLines += scanner.getTokenText().split('\n').length; }
  }
  files.push({repository: scope.repository, file: scope.file, roles: [...scope.roles].sort(), sha256: sha256(text), bytes: Buffer.byteLength(text),
    lines: text.split('\n').length, commentCount, commentLines, includedFunctions: scope.includedFunctions, scope: scope.scope,
    extraction: scope.metadataOnly ? 'HASH_AND_REFERENCE_METADATA_ONLY' : scope.file.endsWith('.json') ? 'JSON_DATA_HASH_AND_REFERENCE_METADATA' : 'TYPESCRIPT_AST',
    classification: SOURCE_TRACE, hostedClassification: HOSTED_NOT_VERIFIED});
  const isPreview = scope.file.startsWith('src/features/admin/goodiesConsumer/') || scope.file.endsWith('/GoodiesConsumerPreview.tsx');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const terms = [...lines[i].matchAll(/\b(demo|sample|mock|fixture|fake|prototype|preview|placeholder)[\w-]*\b/gi)].map(match => match[0]);
    if (terms.length) demoReferences.push({repository: scope.repository, file: scope.file, line: i + 1, terms: [...new Set(terms)],
      category: isPreview ? 'ISOLATED_ADMIN_PREVIEW' : scope.file.startsWith('tests/') ? 'ISOLATED_LOCAL_TEST' : 'PRODUCTION_SOURCE_REFERENCE',
      context: /placeholder/i.test(terms.join(' ')) && /(?:placeholder(?:TextColor)?\s*[:=]|::placeholder)/.test(lines[i]) ? 'INPUT_HINT_OR_STYLE' : /\b(?:sample|newest|freshGpsSample)\b/.test(lines[i]) && /[Ll]ocation|timestamp|coords|sample/.test(lines[i]) && /[Ll]ocation|Tracking/.test(scope.file) ? 'GPS_SAMPLE_TERMINOLOGY' : /^\s*(?:\/\/|\/\*|\*|\*\/)/.test(lines[i]) ? 'COMMENT_REFERENCE' : 'REVIEW_SOURCE_CONTEXT',
      classification: SOURCE_TRACE, hostedClassification: HOSTED_NOT_VERIFIED});
  }
  if (scope.metadataOnly || scope.file.endsWith('.json')) continue;
  const imports = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const module = statement.moduleSpecifier.text, resolvedFile = resolvedImport(scope.repository, scope.file, module);
    dependencyEdges.push({repository: scope.repository, file: scope.file, line: line(source, statement), module, resolvedFile, inventoried: !!resolvedFile && scopes.has(`${scope.repository}:${resolvedFile}`)});
    const bindings = statement.importClause;
    if (bindings?.name) imports.set(bindings.name.text, {module, resolvedFile, imported: 'default'});
    if (bindings?.namedBindings && ts.isNamedImports(bindings.namedBindings)) for (const binding of bindings.namedBindings.elements) {
      if (!binding.isTypeOnly && !bindings.isTypeOnly) imports.set(binding.name.text, {module, resolvedFile, imported: binding.propertyName?.text || binding.name.text});
    }
    if (bindings?.namedBindings && ts.isNamespaceImport(bindings.namedBindings)) imports.set(bindings.namedBindings.name.text, {module, resolvedFile, imported: '*'});
  }
  const localDefinitions = [];
  function findDefinitions(node) {
    const name = namedFunction(node);
    if (name && ts.isFunctionLike(node) && node.body && included(node, scope)) localDefinitions.push({name, owner: owner(node), line: line(source, node), endLine: source.getLineAndCharacterOfPosition(node.end).line + 1});
    ts.forEachChild(node, findDefinitions);
  }
  findDefinitions(source);
  function handlerTrace(initializer, controlNode) {
    let expression = initializer;
    if (expression && ts.isJsxExpression(expression)) expression = expression.expression;
    expression = unwrap(expression);
    if (!expression) return {reference: null, definitions: [], calls: []};
    function resolve(reference) {
      const first = reference.match(/^[A-Za-z_$][\w$]*/)?.[0], imported = imports.get(first);
      const context = owner(controlNode);
      return {reference, imported: imported || null, definitions: imported ? [] : localDefinitions.filter(definition => definition.name === reference && (definition.owner === 'module' || context === definition.owner || context.startsWith(definition.owner + '.')))};
    }
    const direct = !ts.isArrowFunction(expression) && !ts.isFunctionExpression(expression) ? resolve(expression.getText(source)) : {reference: null, imported: null, definitions: []};
    const calls = [];
    function visitHandler(node) {
      if (ts.isCallExpression(node)) calls.push({line: line(source, node), ...resolve(node.expression.getText(source))});
      ts.forEachChild(node, visitHandler);
    }
    visitHandler(expression);
    return {...direct, calls};
  }
  function visit(node) {
    if (!included(node, scope)) { ts.forEachChild(node, visit); return; }
    const functionName = namedFunction(node);
    if (functionName && (ts.isFunctionLike(node)) && node.body) functions.push({...base(scope, source, node), name: functionName, endLine: source.getLineAndCharacterOfPosition(node.end).line + 1});
    if (ts.isJsxAttribute(node) && eventName(node.name.getText(source))) {
      const opening = node.parent.parent, attrs = opening.attributes.properties;
      const labels = attrs.filter(attribute => ts.isJsxAttribute(attribute) && labelKeys.has(attribute.name.getText(source))).map(attribute => ({property: attribute.name.getText(source), expression: attribute.initializer?.getText(source) || null}));
      const event = node.name.getText(source);
      controls.push({...base(scope, source, node), id: `${scope.repository}:${scope.file}:${node.pos}:${event}`, binding: 'JSX_ATTRIBUTE', element: opening.tagName.getText(source), event,
        handler: node.initializer?.getText(source) || null, handlerTrace: handlerTrace(node.initializer, node), labels, childLabels: ts.isJsxOpeningElement(opening) ? childLabels(opening.parent, source) : [],
        state: attrs.filter(attribute => ts.isJsxAttribute(attribute) && ['disabled', 'editable', 'busy', 'loading', 'accessibilityRole'].includes(attribute.name.getText(source))).map(attribute => ({property: attribute.name.getText(source), expression: attribute.initializer?.getText(source) || 'true'}))});
    }
    if ((ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node) || ts.isShorthandPropertyAssignment(node)) && eventName(node.name.getText(source).replace(/^['"]|['"]$/g, '')) &&
      !(ts.isPropertyAssignment(node) && (ts.isStringLiteralLike(node.initializer) || ts.isNumericLiteral(node.initializer) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.initializer.kind)))) {
      const event = node.name.getText(source);
      controls.push({...base(scope, source, node), id: `${scope.repository}:${scope.file}:${node.pos}:${event}`, binding: 'OBJECT_EVENT_BINDING', element: 'Object callback/action', event,
        handler: ts.isPropertyAssignment(node) ? node.initializer.getText(source) : node.getText(source), handlerTrace: handlerTrace(ts.isPropertyAssignment(node) ? node.initializer : node, node), labels: objectLabels(node.parent, source), childLabels: [], state: []});
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(source), args = node.arguments.map(argument => argument.getText(source));
      const localRoot = call.match(/^[A-Za-z_$][\w$]*/)?.[0], imported = imports.get(localRoot);
      const isBackend = /(?:^|\.)rpc$/.test(call) || /^(?:goodiesRequest|goodiesRpc|rpc|invoke)$/.test(call) ||
        (call === 'call' && scope.file === 'src/services/goodiesSettlement.ts') || /^supabase\.(?:from|functions\.invoke|channel|removeChannel)$/.test(call) ||
        /^supabase\.auth\.[\w.]+$/.test(call) || /^supabase\.storage\.from$/.test(call) ||
        /^supabase\.storage\.from\([\s\S]*\)\.(?:upload|update|remove|download|list|move|copy|createSignedUrl|createSignedUrls|createSignedUploadUrl|getPublicUrl)$/.test(call);
      if (isBackend) backendCalls.push({...base(scope, source, node), call, contract: literal(node.arguments[0]), arguments: args});
      if (imported && /(?:services\/|lib\/|helpPayApi|helpPayRecovery|serverSync|goodiesWorkspace|goodiesSettlement|goodiesDeliveryProof|adminBackend)/i.test(imported.module) && localRoot !== 'supabase') {
        serviceCalls.push({...base(scope, source, node), call, imported, arguments: args});
      }
      if (scope.repository === 'customer' && /^src\/features\/Goodies\//.test(scope.file) && /^(?:A\.)?(?:go|push|reset|tab)$/.test(call)) navRecord(scope, source, node, call, 'CUSTOMER_INTERNAL_STACK', node.arguments[0], Object.fromEntries([...customerTargets].map(target => [target, true])));
      else if (scope.repository === 'customer' && /^(?:app|nav)\.go$/.test(call)) navRecord(scope, source, node, call, 'BUSINESS_SPACE_PAGE', node.arguments[0], businessPages.values);
      else if (scope.repository === 'customer' && /^app\.(?:sheet|panel|tab|wizard)$/.test(call)) navRecord(scope, source, node, call, 'BUSINESS_SPACE_OVERLAY_OR_TAB', node.arguments[0], null);
      else if (scope.repository === 'admin' && /^(?:nav\.)?go$/.test(call)) {
        navRecord(scope, source, node, call, 'ADMIN_SCREEN', node.arguments[0], adminScreens.values);
        const state = unwrap(node.arguments[1]);
        for (const property of properties(state)) if (ts.isPropertyAssignment(property) && property.name.getText(source) === 'goodiesModule') navRecord(scope, source, node, call, 'ADMIN_GOODIES_MODULE_STATE', property.initializer, Object.fromEntries(adminModules.values.map(target => [target, true])));
      } else if (scope.repository === 'admin' && call === 'setModule' && scope.file.endsWith('/GoodiesAdminScreen.tsx')) navRecord(scope, source, node, call, 'ADMIN_GOODIES_MODULE', node.arguments[0], Object.fromEntries(adminModules.values.map(target => [target, true])));
      else if (scope.repository === 'admin' && call === 'openModule') {
        const service = literal(node.arguments[0]);
        if (service === 'Goodies') navRecord(scope, source, node, call, 'ADMIN_GOODIES_HUB_MODULE', node.arguments[1], adminModuleMap.values, {mappedModule: adminModuleMap.values[literal(node.arguments[1])] || null});
        else navRecord(scope, source, node, call, 'ADMIN_SERVICE_MODULE', node.arguments[1], null, {serviceExpression: args[0] || null, service});
      } else if (/(?:^|\.)(?:navigate|replace|push|goBack|openURL|openBrowserAsync)$/.test(call) || /^(?:ui\.sheet|setSheet|navBack)$/.test(call)) navRecord(scope, source, node, call, 'OTHER_NAVIGATION_OR_EXTERNAL_TARGET', node.arguments[0], null);
    }
    if ((ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /<(?:script|html)\b/i.test(node.getText(source))) {
      const value = node.getText(source);
      embeddedCodeSurfaces.push({...base(scope, source, node), kind: 'EMBEDDED_HTML_OR_SCRIPT_TEMPLATE', sha256: sha256(value), endLine: source.getLineAndCharacterOfPosition(node.end).line + 1, limitation: 'Text event references below are source locations; TypeScript AST does not parse the embedded browser program.'});
      for (const match of value.matchAll(/(?:addEventListener\s*\(\s*['"]([^'"]+)['"]|\bon(?:click|error|load|change|submit)\s*=|\.on\s*\(\s*['"]([^'"]+)['"])/g)) embeddedEventReferences.push({...base(scope, source, node), line: line(source, node) + value.slice(0, match.index).split('\n').length - 1, event: match[1] || match[2] || match[0].split('=')[0].trim(), binding: 'EMBEDDED_TEXT_REFERENCE_NOT_AST_BINDING'});
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const unresolved = navigationCalls.filter(call => call.validation === 'UNRESOLVED_LITERAL_SOURCE_TARGET');
const dynamic = navigationCalls.filter(call => call.validation === 'DYNAMIC_TARGET_NOT_EXHAUSTIVELY_VALIDATED');
const hubMappings = adminHubModules.values.map(target => ({target, mappedModule: adminModuleMap.values[target] || null, registered: adminModules.values.includes(adminModuleMap.values[target])}));
const changedDuringGeneration = files.filter(file => sha256(readSource(file.repository, file.file)) !== file.sha256).map(file => `${file.repository}:${file.file}`);
if (changedDuringGeneration.length) throw Error(`Source changed while reading; rerun after edits stabilize: ${changedDuringGeneration.join(', ')}`);
const report = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), classification: SOURCE_TRACE, hostedClassification: HOSTED_NOT_VERIFIED,
  purpose: 'Reproducible inventory of current Goodies source. A binding, handler, route or contract trace is never hosted acceptance or a role authorization PASS.',
  generator: {file: 'scripts/inventory-goodies-controls.cjs', sha256: sha256(fs.readFileSync(__filename)), command: 'node scripts/inventory-goodies-controls.cjs'},
  writeBoundary: {onlyOutput: 'docs/goodies/re-audit-20261118/current-source-inventory.json', applicationCodeExecuted: false, networkOrDatabaseCalls: false, deploymentPerformed: false, semanticReportsModified: false},
  sourceSnapshot: {consistency: 'SCOPED_FILE_HASHES_RECHECKED_BEFORE_WRITE', changedDuringGeneration, limitation: 'Subsequent source edits invalidate this snapshot; rerun before reporting final evidence.'},
  classificationRules: {SOURCE_TRACE: 'Current source was parsed or hashed; behavior, authorization and outcomes have not been executed by this generator.', HOSTED_NOT_VERIFIED: 'No signed-in hosted button, cross-role, provider or device acceptance was performed.'},
  scopeRules: {seedReports, sharedVendorFunctions: 'Existing vendor.json includedFunctions are retained; whole-file hashes/comment metadata cover shared files but AST controls/calls are limited to the named functions and their nested callbacks.', additions: 'Dedicated src/features/Goodies TS/TSX/JSON, BusinessSpaceGoodies files, goodiesTemplates and goodies services; actual admin navigation implementation and isolated preview port/manifest metadata.', exclusions: 'Unrelated service screens, SQL, environment/credential files, node_modules, generated admin consumer mirror controls, and test execution. Test files listed by the courier report receive metadata only.', bounds: {maxFiles: MAX_FILES, maxFileBytes: MAX_FILE_BYTES, maxOutputBytes: MAX_OUTPUT_BYTES}},
  counts: {files: files.length, astFiles: files.filter(file => file.extraction === 'TYPESCRIPT_AST').length, functions: functions.length, interactiveBindings: controls.length, jsxBindings: controls.filter(control => control.binding === 'JSX_ATTRIBUTE').length, objectEventBindings: controls.filter(control => control.binding === 'OBJECT_EVENT_BINDING').length, backendCallSites: backendCalls.length, serviceCallSites: serviceCalls.length, navigationCallSites: navigationCalls.length, commentTokens: files.reduce((total, file) => total + file.commentCount, 0), demoReferenceLines: demoReferences.length, embeddedEventReferences: embeddedEventReferences.length, unresolvedLiteralRegistryTargets: unresolved.length, dynamicRegistryTargets: dynamic.length},
  routeValidation: {classification: SOURCE_TRACE, hostedClassification: HOSTED_NOT_VERIFIED, scope: 'Only literal targets at recognized calls are compared with current source registries. Dynamic expressions and unrecognized call aliases are not exhaustively validated.',
    customer: {files: [customerRouteFile, customerAccountRouteFile], registry: 'GoodiesApp switch(r) and delegated Account switch(r) case clauses', count: customerRoutes.length, targets: customerRoutes},
    businessSpace: {file: businessPages.file, registry: 'PAGES', count: Object.keys(businessPages.values).length, targets: businessPages.values},
    admin: {screenRegistry: {file: adminScreens.file, registry: 'SCREENS', count: Object.keys(adminScreens.values).length, targets: Object.keys(adminScreens.values)}, moduleRegistry: {file: adminModules.file, registry: 'MODULES', count: adminModules.values.length, targets: adminModules.values}, hubRegistry: {file: adminHubModules.file, registry: 'GOODIES_MODULES', count: adminHubModules.values.length, targets: adminHubModules.values}, mappingRegistry: {file: adminModuleMap.file, registry: 'goodiesState', count: Object.keys(adminModuleMap.values).length, targets: adminModuleMap.values}, advertisedHubMappings: hubMappings},
    unresolvedLiteralTargets: unresolved, dynamicTargets: dynamic},
  limitations: ['Static bindings are instances in source; mapped rows, conditional render branches and spread props do not yield an exhaustive runtime button count.', 'Object callback/action properties are included conservatively and may include a non-UI callback.', 'Full handler expressions and named function ranges identify source logic; no handler, permission path, RPC, payment or provider was executed.', 'Service imports outside the bounded source scope remain explicit dependency edges; this inventory does not recursively audit unrelated modules.', 'Demo/reference categories describe source location, not proof of isolation or a production-data defect. Input placeholders, GPS samples and comments require their recorded context.', 'Embedded HTML/script event references are recorded separately and are not exhaustively parsed browser bindings.', 'Whole-file hashes can change while other agents edit; rerun after final source synchronization.'],
  files, functions, controls, backendCalls, serviceCalls, navigationCalls, dependencyEdges, demoReferences, embeddedCodeSurfaces, embeddedEventReferences,
};
const serialized = JSON.stringify(report, null, 2) + '\n';
if (Buffer.byteLength(serialized) > MAX_OUTPUT_BYTES) throw Error('Inventory output exceeds size bound');
if (!fs.statSync(auditDir).isDirectory()) throw Error('Existing re-audit directory is required');
fs.writeFileSync(output, serialized);
console.log(JSON.stringify({output: posix(path.relative(root, output)), classification: SOURCE_TRACE, hostedClassification: HOSTED_NOT_VERIFIED, counts: report.counts, routeRegistries: {customer: customerRoutes.length, businessSpace: Object.keys(businessPages.values).length, adminScreens: Object.keys(adminScreens.values).length, adminModules: adminModules.values.length, adminHubModules: adminHubModules.values.length, adminModuleMappings: Object.keys(adminModuleMap.values).length}, invalidAdvertisedHubMappings: hubMappings.filter(mapping => !mapping.registered).length}));
