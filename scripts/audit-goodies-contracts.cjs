/* Schema-only audit: matching named arguments does not prove hosted authorization or execution. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const [inventoryPath, livePath, candidatePath, outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Expected inventory, live catalog, isolated candidate catalog and output paths.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const inventory = read(inventoryPath), live = read(livePath), candidate = read(candidatePath);
function signature(fn) {
  const modes=typeof fn.modes==='string'?fn.modes.replace(/[{}]/g,'').split(','):fn.modes;
  const names = (fn.names || []).filter((_, index) => !modes || ['i', 'b', 'v'].includes(modes[index])).slice(0, fn.inputCount);
  return { names, required: names.slice(0, fn.inputCount - fn.defaultCount) };
}
function shape(source) {
  const ast = ts.createSourceFile('argument.ts', 'const value = (' + (source || '{}') + ');', ts.ScriptTarget.Latest, true);
  let node = ast.statements[0]?.declarationList?.declarations[0]?.initializer;
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
  if (!node || !ts.isObjectLiteralExpression(node)) return { keys: [], dynamic: true };
  const keys = [], dynamic = node.properties.some(p => ts.isSpreadAssignment(p) || ts.isComputedPropertyName(p.name));
  for (const property of node.properties) if (property.name && !ts.isComputedPropertyName(property.name)) keys.push(property.name.text);
  return { keys, dynamic };
}
function matches(parameters, provided) {
  return provided.keys.every(key => parameters.names.includes(key)) && (provided.dynamic || parameters.required.every(key => provided.keys.includes(key)));
}
const calls = [];
// These generic marketplace APIs have no deployed contract. Goodies has explicit
// page/service dispatches that bypass them. Preserve and report the legacy gap;
// never turn an unrelated/mixed-workspace branch into a Goodies runtime PASS.
const legacyTargets=new Set(['create_draft','set_draft_stock','publish_listing','go_live','advance_order','cancel_order','set_listing_status','feature_requirements_status','submit_requirement','register_push_token','search_business','set_promotion_status','submit_verification','request_data_action','action_required','activity_feed','dashboard_range','delete_business_check','delete_business','adjust_stock','refund_order','payout_usage','request_payout']);
for (const file of inventory.files.filter(file => file.surface !== 'isolated-admin-preview')) {
  for (const id of file.backend) {
    const call = inventory.callSites.find(row => row.id === id);
    if (!call || !(/(?:^|\.)rpc$/.test(call.callee) || ['call', 'goodiesRequest', 'goodiesOrdersRequest'].includes(call.callee))) continue;
    const target = call.targets.length === 1 ? call.targets[0] : null;
    if (!target) continue;
    const deployed = (live.functions || []).filter(fn => fn.schema === 'public' && fn.name === target).map(signature);
    const prepared = (candidate.functions || []).filter(fn => fn.schema === 'public' && fn.name === target).map(signature);
    const provided = shape(call.arguments[1]);
    const liveMatch = deployed.some(fn => matches(fn, provided));
    const candidateMatch = prepared.some(fn => matches(fn, provided));
    const excluded=legacyTargets.has(target)&&!liveMatch&&!candidateMatch;
    const status = provided.dynamic || excluded ? 'NOT VERIFIED' : liveMatch || candidateMatch ? 'PASS' : 'FAIL';
    calls.push({ repository: file.repository, path: file.path, line: call.line, target, provided, status,
      scope: 'Static named-argument shape only; no RPC executed.',
      deployed: deployed.length ? (liveMatch ? 'MATCH' : provided.dynamic ? 'DYNAMIC' : 'MISMATCH') : 'ABSENT',
      candidate: prepared.length ? (candidateMatch ? 'MATCH' : provided.dynamic ? 'DYNAMIC' : 'MISMATCH') : 'NOT IN ISOLATED FIXTURE',
      ...(excluded?{exclusion:'Legacy/mixed marketplace branch; Goodies dispatches bypass this call. Its missing deployed contract remains an unrelated/shared limitation, not a pass.'}:{}),
      ...(status === 'FAIL' ? { signatures: { deployed, prepared } } : {}) });
  }
}
const report = { capturedAt: new Date().toISOString(), liveCapturedAt: live.capturedAt,
  scope: 'Production/shared source named RPC arguments against read-only deployed metadata and the tested candidate fixture. Dynamic expressions remain NOT VERIFIED. A match is not hosted runtime/authorization acceptance.',
  summary: Object.fromEntries(['PASS', 'FAIL', 'NOT VERIFIED'].map(status => [status, calls.filter(call => call.status === status).length])), calls };
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
if (report.summary.FAIL) process.exitCode = 1;
