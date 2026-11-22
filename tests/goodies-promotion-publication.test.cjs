const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleSource=fs.readFileSync('supabase/functions/_shared/goodiesPromotions.ts','utf8');
const compiled={exports:{}};vm.runInNewContext(ts.transpileModule(moduleSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:compiled,exports:compiled.exports});
const {mergeGoodiesPromotions:merge}=compiled.exports;
test('public offers take financial terms only from the authoritative catalogue and preserve CMS wording',()=>{
 const input=[{content_key:'goodies.content',payload:{v:5,coupons:[{code:'REAL10',val:100,min:0,title:'Reviewed campaign',desc:'Existing description'},{code:'FAKE',val:100}] }},{content_key:'other.content',payload:{keep:true}}];
 const rows=merge(input,[{code:'REAL10',val:10,min:5,st:'Live',kind:'Percent'}]);
 assert.equal(rows[0].payload.coupons.length,1);assert.equal(rows[0].payload.coupons[0].val,10);assert.equal(rows[0].payload.coupons[0].min,5);assert.equal(rows[0].payload.coupons[0].title,'Reviewed campaign');assert.equal(rows[1],input[1]);assert.equal(input[0].payload.coupons[0].val,100);
 assert.equal(merge(input,[])[0].payload.coupons.length,0);
 assert.equal(merge(input,[{code:'NEW',val:5}])[0].payload.coupons[0].title,'NEW');
});
test('coupon validity respects precise server timestamps and inclusive legacy end dates',()=>{
 const source=fs.readFileSync('src/features/Goodies/content.ts','utf8'),ast=ts.createSourceFile('content.ts',source,99,true);let expression;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='live')expression=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);
 const result={exports:{}};const FixedDate=class extends Date{static now(){return Date.parse('2026-11-22T15:00:00Z');}};
 vm.runInNewContext(ts.transpileModule('module.exports='+expression,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:result,exports:result.exports,Date:FixedDate});
 const live=result.exports;
 assert.equal(live({st:'Live',from:'2026-11-22T14:00:00Z',to:'2026-11-22T16:00:00Z'}),true);
 assert.equal(live({st:'Live',from:'2026-11-22T16:00:00Z'}),false);
 assert.equal(live({st:'Live',to:'2026-11-22T15:00:00Z'}),false);
 assert.equal(live({st:'Live',to:'2026-11-22'}),true);
 assert.equal(live({st:'Hidden'}),false);
});
