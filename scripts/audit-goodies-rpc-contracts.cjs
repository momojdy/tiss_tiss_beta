// Compare literal call-site argument names with an independently captured
// pg_proc catalog. Signature compatibility is not authorization or E2E proof.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
const value=flag=>process.argv[process.argv.indexOf(flag)+1];
for(const flag of ['--inventory','--catalog','--output'])if(!process.argv.includes(flag))throw Error('Required: '+flag);
const inventoryPath=value('--inventory'),catalogPath=value('--catalog'),output=path.resolve(value('--output'));
if(!output.startsWith(path.resolve('docs/goodies')+path.sep))throw Error('Output must remain in docs/goodies');
const inventory=JSON.parse(fs.readFileSync(inventoryPath)),raw=JSON.parse(fs.readFileSync(catalogPath));
const catalog=(Array.isArray(raw)?raw:raw.entries||raw.functions||[]).filter(row=>!row.schema||row.schema==='public').map(row=>({name:row.name,names:row.input_names||row.names?.slice(0,row.inputCount)||[],count:row.arg_count??row.inputCount,defaults:row.default_count??row.defaultCount,authenticated:row.authenticated_execute}));
function expression(text){const ast=ts.createSourceFile('args.ts','const value='+text+';',99,true);return ast.statements[0]?.declarationList?.declarations[0]?.initializer;}
function names(node){if(!node)return[];if(ts.isStringLiteralLike(node))return[node.text];if(ts.isConditionalExpression(node))return[...names(node.whenTrue),...names(node.whenFalse)];return[];}
function keys(node){
 if(!node)return{certain:[],possible:[],unknown:false};
 if(ts.isParenthesizedExpression(node))return keys(node.expression);
 if(ts.isConditionalExpression(node)){const a=keys(node.whenTrue),b=keys(node.whenFalse);return{certain:a.certain.filter(k=>b.certain.includes(k)),possible:[...new Set([...a.possible,...b.possible])],unknown:a.unknown||b.unknown};}
 if(!ts.isObjectLiteralExpression(node))return{certain:[],possible:[],unknown:true};
 const out={certain:[],possible:[],unknown:false};
 for(const p of node.properties){if(ts.isSpreadAssignment(p)){const next=keys(p.expression);out.certain.push(...next.certain);out.possible.push(...next.possible);out.unknown||=next.unknown;}else if((ts.isPropertyAssignment(p)||ts.isShorthandPropertyAssignment(p))&&(ts.isIdentifier(p.name)||ts.isStringLiteralLike(p.name))){out.certain.push(p.name.text);out.possible.push(p.name.text);}else out.unknown=true;}
 out.certain=[...new Set(out.certain)];out.possible=[...new Set(out.possible)];return out;
}
const sites=[],dynamic=[];
for(const row of inventory.backendCalls){
 if(!/(?:^|\.)rpc$/.test(row.call)&&!['goodiesRequest','goodiesOrdersRequest','goodiesRpc','rpc','call','legacy'].includes(row.call))continue;
 const functions=names(expression(row.arguments[0]||''));
 if(!functions.length){dynamic.push({...row,classification:'NOT VERIFIED',reason:'RPC name is computed or passed through a wrapper.'});continue;}
 for(const contract of functions){
  const input=keys(expression(row.arguments[1]||'{}')),variants=catalog.filter(fn=>fn.name===contract);
  // A conditional RPC name can correlate with a conditional object spread.
  // Retain partial evidence instead of treating the other branch's keys as
  // arguments sent to this overload or claiming the branch was executed.
  const partial=input.unknown||input.certain.length!==input.possible.length;
  const matches=variants.filter(fn=>input.certain.every(key=>fn.names.includes(key))&&(input.unknown||fn.names.slice(0,fn.count-fn.defaults).every(key=>input.possible.includes(key)))&&(partial||input.possible.every(key=>fn.names.includes(key))));
  const classification=!variants.length?'MISSING':!matches.length?'INCOMPATIBLE':partial?'PARTIAL':'COMPATIBLE';
  sites.push({...row,contract,input,classification,matchingSignatures:matches});
 }
}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={observedAt:new Date().toISOString(),scope:'Literal RPC name/argument compatibility only. No application, authorization, provider, return-value or hosted execution is inferred.',inventory:{path:inventoryPath,sha256:sha(inventoryPath)},catalog:{path:catalogPath,sha256:sha(catalogPath)},counts:Object.fromEntries(['COMPATIBLE','PARTIAL','MISSING','INCOMPATIBLE'].map(state=>[state,sites.filter(row=>row.classification===state).length])),dynamicSites:dynamic.length,sites,dynamic};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({counts:report.counts,dynamic:dynamic.length,unresolved:sites.filter(row=>['MISSING','INCOMPATIBLE'].includes(row.classification)).map(row=>({file:row.file,line:row.line,contract:row.contract,classification:row.classification}))}));
