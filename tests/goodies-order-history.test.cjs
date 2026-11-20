const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');

const path='src/features/Goodies/serverSync.ts';
const source=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='mapOrder');
assert.ok(declaration,'The server-order mapper must remain testable');
const sandboxModule={exports:{}};
const context={
 module:sandboxModule,exports:sandboxModule.exports,Date,Number,String,Array,
 STB:{},IT:{},ensureGoodiesOrderStore(){},
 stageByStatus:{scheduled:0,placed:0,accepted:1,preparing:2,ready:3,courier_assigned:4,picked_up:5,completed:6,cancelled:0,declined:0,expired:0},
 label:(_key,fallback)=>fallback,
};
vm.runInNewContext(
 ts.transpileModule(declaration.getText(source)+'\nmodule.exports=mapOrder;',{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
 }).outputText,context
);
const mapOrder=sandboxModule.exports;
const row=payment_method=>({
 id:'db-order',order_code:'GD-123',store_id:'store-1',
 status:'placed',order_type:'delivery',items:[],
 created_at:'2026-11-20T08:00:00Z',updated_at:'2026-11-20T08:00:00Z',
 subtotal:10,delivery_fee:2,service_fee:0,discount:0,tip:0,total:12,
 payment_method,payment_status:'paid',
});

test('Goodies history shows the real recorded payment method on another device',()=>{
 for(const [method,name] of [['wallet','Wantiss Wallet'],['card','Credit / debit card'],['cash','Cash'],['moncash','MonCash']]){
  const order=mapOrder(row(method));
  assert.equal(order.pay,method);
  assert.equal(order.payl,name);
 }
});

test('Goodies history never fabricates Cash when payment data is absent or invalid',()=>{
 for(const method of [null,undefined,'other']){
  const order=mapOrder(row(method));
  assert.notEqual(order.pay,'cash');
  assert.equal(order.payl,'Payment method');
 }
});

test('Goodies history restores payment status used by cancelled-order tracking',()=>{
 const order=mapOrder({...row('card'),payment_status:'refunded'});
 assert.equal(order.paymentStatus,'refunded');
 assert.equal(order.payStatus,'refunded');
});
