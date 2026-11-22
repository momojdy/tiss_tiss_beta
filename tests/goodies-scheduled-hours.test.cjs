const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const storeFile='src/features/Goodies/store.ts',scheduleFile='src/features/Goodies/components/Sheets.tsx';
const storeSrc=ts.createSourceFile(storeFile,fs.readFileSync(storeFile,'utf8'),ts.ScriptTarget.Latest,true);
const scheduleSrc=ts.createSourceFile(scheduleFile,fs.readFileSync(scheduleFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function declaration(name){
 const node=storeSrc.statements.find(n=>(ts.isFunctionDeclaration(n)&&n.name?.text===name)||(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(storeSrc)===name)));
 assert.ok(node,'Missing scheduling declaration: '+name);
 return node.getText(storeSrc);
}
const names=['DAY_NAMES','formatHour','hm','fmtHM','openState','canScheduleGoodiesStore'];
const js=ts.transpileModule(names.map(declaration).join('\n')+'\nmodule.exports={canScheduleGoodiesStore};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let picker=null;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='isAvailableInstant')picker=n.getText(scheduleSrc);ts.forEachChild(n,visit);}visit(scheduleSrc);
assert.ok(picker,'The customer scheduling picker must remain testable');
const pickerJs=ts.transpileModule(picker+'\nmodule.exports=isAvailableInstant;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const shop=(scheduleHours,start='10:00',zone='America/New_York',enabled=true)=>({live:true,acceptScheduledOrders:enabled,scheduledOrderTimezone:zone,scheduledOrderStartTime:start,scheduleHours});
function run(stores,cart,instant){
 const backend={exports:{}};
 vm.runInNewContext(js,{module:backend,exports:backend.exports,STB:stores,label:(_id,message)=>message});
 const canSchedule=backend.exports.canScheduleGoodiesStore;
 const ui={exports:{}};
 vm.runInNewContext(pickerJs,{module:ui,exports:ui.exports,cartStoreIds:()=>cart,canScheduleGoodiesStore:canSchedule});
 return {eligible:sid=>canSchedule(sid,new Date(instant).getTime()),picker:ui.exports(new Date(instant))};
}
const overnight={Monday:{open:'18:00',close:'02:00',closed:false},Tuesday:{open:'08:00',close:'19:00',closed:true}};
test('server-aligned merchant admission accepts valid evening and rejects pre-opening slots',()=>{
 assert.equal(run({a:shop(overnight)},['a'],'2026-11-23T22:59:00Z').eligible('a'),false);
 assert.equal(run({a:shop(overnight)},['a'],'2026-11-24T00:00:00Z').eligible('a'),true);
 assert.equal(run({a:shop(overnight)},['a'],'2026-11-24T04:55:00Z').picker,true);
});
test('overnight previous-day window respects the server minimum clock and closing boundary',()=>{
 assert.equal(run({a:shop(overnight)},['a'],'2026-11-24T06:00:00Z').picker,false);
 assert.equal(run({a:shop(overnight,'00:00')},['a'],'2026-11-24T06:00:00Z').picker,true);
 assert.equal(run({a:shop(overnight,'00:00')},['a'],'2026-11-24T07:00:00Z').picker,false);
 assert.equal(run({a:shop(overnight,'00:00')},['a'],'2026-11-24T15:00:00Z').picker,false);
});
test('normal hours, closed and absent windows cannot invent merchant slots',()=>{
 const day={Monday:{open:'09:00',close:'17:00',closed:false}};
 assert.equal(run({a:shop(day)},['a'],'2026-11-23T14:30:00Z').picker,false);
 assert.equal(run({a:shop(day)},['a'],'2026-11-23T15:00:00Z').picker,true);
 assert.equal(run({a:shop(day)},['a'],'2026-11-23T22:00:00Z').picker,false);
 assert.equal(run({a:shop(null)},['a'],'2026-11-23T15:00:00Z').picker,false);
 assert.equal(run({a:shop({})},['a'],'2026-11-23T15:00:00Z').picker,false);
 assert.equal(run({a:shop({Monday:{open:'24:00',close:'25:00'}})},['a'],'2026-11-23T15:00:00Z').picker,false);
});
test('continuous 24-hour store windows respect the server open-equals-close convention',()=>{
 assert.equal(run({a:shop({Monday:{open:'00:00',close:'00:00',closed:false}},'00:00')},['a'],'2026-11-24T04:50:00Z').picker,true);
});
test('multi-store schedule is valid only when every merchant accepts the selected local instant',()=>{
 const at='2026-11-24T00:00:00Z',allow={Monday:{open:'18:00',close:'22:00',closed:false}},deny={Monday:{open:'09:00',close:'17:00',closed:false}};
 assert.equal(run({a:shop(overnight),b:shop(allow)},['a','b'],at).picker,true);
 assert.equal(run({a:shop(overnight),b:shop(deny)},['a','b'],at).picker,false);
 assert.equal(run({a:shop(overnight),b:shop(allow,'10:00','America/New_York',false)},['a','b'],at).picker,false);
 assert.equal(run({a:shop(overnight)},[],at).picker,false);
});
