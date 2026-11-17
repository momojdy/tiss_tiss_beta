const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('a failed per-store route never exposes routing-provider error details',async()=>{
 const file='supabase/functions/goodies-delivery-quote/index.ts',ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true);let clause;
 function walk(n){if(ts.isCatchClause(n)&&n.block.statements.some(s=>ts.isReturnStatement(s)&&s.expression&&ts.isObjectLiteralExpression(s.expression)))clause=n;ts.forEachChild(n,walk);}walk(ast);assert.ok(clause);
 const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports=async(error,store)=>'+clause.block.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,Error});
 const result=await module.exports(Error('Provider URL with synthetic-secret'),{store_id:'store'});assert.equal(result.error,'Road distance is unavailable for this store.');assert.equal(result.geometry,null);assert.equal(result.distance_m,null);assert.equal(result.store_id,'store');
});
for(const [name,message,status]of [
 ['place-goodies-card-order','Could not confirm the payment. Check your orders before trying again.',400],
 ['refund-goodies-card-order','Could not confirm this refund. Check the order payment status and try again.',500],
 ['process-goodies-card-refunds','Refund processing is temporarily unavailable.',500],
 ['expire-goodies-card-auth','Could not process card authentication updates.',500],
 ['goodies-delivery-quote','Could not calculate delivery. Check the address and try again.',400],
 ['rapid-api','Webhook processing failed.',500],
])test(name+' returns application-owned error copy without database/provider details',async()=>{
 const file='supabase/functions/'+name+'/index.ts',source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,99,true),catches=[];
 function walk(n){if(ts.isCatchClause(n)&&n.block.statements.some(ts.isReturnStatement))catches.push(n);ts.forEachChild(n,walk);}walk(ast);const clause=catches.sort((a,b)=>a.end-b.end).at(-1);assert.ok(clause,'Missing HTTP failure response');
 const module={exports:{}},json=(body,code)=>new Response(JSON.stringify(body),{status:code});
 const script='module.exports=async (error,e,json,reply)=>'+clause.block.getText(ast)+';';
 vm.runInNewContext(ts.transpileModule(script,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,Response,Error,console:{error(){}},orderId:null,authClient:null,service:null});
 const error=Error('SQLSTATE 42501 private.refund_queue password=synthetic-secret provider request id'),response=await module.exports(error,error,json,json),body=await response.json();assert.equal(response.status,status);assert.equal(body.error,message);assert.ok(!JSON.stringify(body).includes('synthetic-secret'));assert.ok(!JSON.stringify(body).includes('SQLSTATE'));
});
