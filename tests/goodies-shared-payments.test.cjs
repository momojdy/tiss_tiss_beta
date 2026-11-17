const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleScope={exports:{}},calls=[];
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/Goodies/helpPayApi.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{process:{env:{}},module:moduleScope,exports:moduleScope.exports,require:()=>({supabase:{rpc:async(...args)=>{calls.push(args);return{data:{ok:true,status:'cancelled',refunded:true}};}}})});
const api=moduleScope.exports;
test('invalid financial status responses fail closed instead of rendering invented zero balances',()=>{
 const valid={id:'00000000-0000-4000-8000-000000000001',mode:'share',service:'goodies',status:'active',is_creator:true,expires_at:'2026-12-01T00:00:00Z',total_cents:100,initial_cents:60,contributed_cents:10,remaining_cents:30,my_contributed_cents:60};
 assert.equal(api.parseHelpPaySnapshot(valid),valid);
 for(const bad of [{},{...valid,total_cents:null},{...valid,remaining_cents:0},{...valid,contributed_cents:50},{...valid,total_cents:NaN},{...valid,total_cents:'100'}])assert.throws(()=>api.parseHelpPaySnapshot(bad),/unavailable/);
});
test('Shared Bill release gate prevents request creation and wallet debits before acceptance',async()=>{
 assert.equal(api.GOODIES_SHARED_PAYMENTS_RELEASED,false);
 await assert.rejects(()=>api.createHelpPayDraft('share',100,'synthetic-checkout-key',{}),/not available/);
 await assert.rejects(()=>api.contributeToHelpPay('00000000-0000-4000-8000-000000000001',100,'synthetic-key'),/not available/);
 assert.equal(calls.length,0);
});
test('existing Shared Bill cancellation remains available so reserved money can be recovered',async()=>{
 await api.cancelHelpPayRequest('00000000-0000-4000-8000-000000000001');assert.equal(calls.at(-1)[0],'help_pay_cancel_request');
});
test('QR parsing accepts a canonical request identifier and rejects forged amount authority',()=>{
 const id='00000000-0000-4000-8000-000000000001';assert.equal(api.helpPayIdFromLink(api.helpPayQRValue(id)),id);assert.equal(api.helpPayIdFromLink('https://attacker.invalid/help-pay/'+id),null);assert.equal(api.helpPayIdFromLink('wantiss://help-pay/not-a-request?amount=1'),null);
});
