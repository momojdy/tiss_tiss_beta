const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.createSourceFile('WalletHelpPayScreen.tsx',fs.readFileSync('src/screens/Wallet/WalletHelpPayScreen.tsx','utf8'),99,true);
function extract(name,context,evaluate=false){let match;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)match=node.initializer;ts.forEachChild(node,visit);}visit(source);assert.ok(match);const module={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports='+(evaluate?'()=>('+match.getText(source)+')':match.getText(source))+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,...context});return module.exports;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){const alerts=[],calls=[],receipts=[],errors=[];let resolve;
 const response=new Promise(done=>resolve=done),context={valid:true,busy:false,request:{status:'active'},walletBalance:100,value:100,requestId:'synthetic-request',owner:{current:'synthetic-payer'},scope:{current:'synthetic-request'},mounted:{current:true},lifecycle:{current:1},submitting:{current:false},confirmation:{current:null},helpPayPaymentKey:()=> 'synthetic-key-'+alerts.length,label:(_id,text)=>text,price:value=>'$'+(value/100).toFixed(2),Alert:{alert:(...args)=>alerts.push(args)},setBusy(){},setReceipt:value=>receipts.push(value),receiptText:()=> 'Contribution confirmed',load:async()=>{},payRecoverableHelpPay:async(...args)=>{calls.push(args);return response;}};
 return{context,alerts,calls,receipts,errors,resolve,confirm:extract('confirm',context)};}
test('Wallet confirmation double taps and repeated alert callbacks dispatch one account-bound payment',async()=>{
 const h=harness();h.confirm();h.confirm();assert.equal(h.alerts.length,1);const pay=h.alerts[0][2][1].onPress;pay();pay();await tick();assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0],['synthetic-request',100,'synthetic-key-0','synthetic-payer']);h.resolve({ok:true});await tick();assert.equal(h.receipts.length,1);assert.equal(h.context.submitting.current,false);
});
test('a confirmation opened before an account/request change cannot debit the new session',async()=>{
 const h=harness();h.confirm();h.context.owner.current='another-payer';h.context.lifecycle.current++;h.alerts[0][2][1].onPress();await tick();assert.equal(h.calls.length,0);
});
test('late financial responses after leaving a request never show another account a success receipt',async()=>{
 const h=harness();h.confirm();h.alerts[0][2][1].onPress();await tick();h.context.lifecycle.current++;h.context.scope.current='another-request';h.resolve({ok:true});await tick();assert.equal(h.receipts.length,0);
});
test('cancelling a confirmation permits a new intent while stale callbacks cannot cancel it',()=>{
 const h=harness();h.confirm();const cancel=h.alerts[0][2][0].onPress;cancel();h.confirm();const current=h.context.confirmation.current;cancel();assert.equal(h.context.confirmation.current,current);assert.equal(h.context.submitting.current,true);
});
test('terminal and refund-pending requests display no active funding',()=>{
 for(const status of ['expired','cancelled','refund_pending'])assert.equal(extract('funded',{request:{status,total_cents:1100},remaining:440},true)(),0);
 assert.equal(extract('funded',{request:{status:'active',total_cents:1100},remaining:440},true)(),660);
});
