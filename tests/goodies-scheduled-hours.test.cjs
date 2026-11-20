const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const path='src/features/Goodies/components/Sheets.tsx';
const source=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let initializer=null;
const visit=node=>{
 if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='isAvailableInstant')initializer=node.initializer?.getText(source);
 ts.forEachChild(node,visit);
};
visit(source);
assert.ok(initializer,'The customer scheduling handler must remain testable');
const js=ts.transpileModule('module.exports='+initializer+';',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function allowed(schedule,min,at,zone='America/New_York'){
 const [minimumHour,minimumMinute]=min.split(':').map(Number),module={exports:{}};
 const store={scheduleHours:schedule};
 const storeParts=instant=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const get=type=>parts.find(part=>part.type===type)?.value;
  return {weekday:get('weekday'),hour:Number(get('hour')),minute:Number(get('minute'))};
 };
 vm.runInNewContext(js,{module,exports:module.exports,store,storeParts,minimumHour,minimumMinute,dayNames});
 return module.exports(new Date(at));
}
const overnight={Monday:{open:'18:00',close:'02:00',closed:false},Tuesday:{open:'08:00',close:'19:00',closed:true}};
test('overnight Goodies merchant allows evening slots and rejects pre-opening slots',()=>{
 assert.equal(allowed(overnight,'10:00','2026-11-23T22:59:00Z'),false); // Mon 17:59 EST
 assert.equal(allowed(overnight,'10:00','2026-11-24T00:00:00Z'),true);  // Mon 19:00 EST
 assert.equal(allowed(overnight,'10:00','2026-11-24T04:55:00Z'),true);  // Mon 23:55 EST
 assert.equal(allowed(overnight,'10:00','2026-11-24T06:00:00Z'),false); // Tue 01:00 EST, server minimum 10:00
});
test('after-midnight slots follow the previous opening day, server minimum and closing boundary',()=>{
 assert.equal(allowed(overnight,'00:00','2026-11-24T06:00:00Z'),true);  // Tue 01:00 EST
 assert.equal(allowed(overnight,'00:00','2026-11-24T07:00:00Z'),false); // Tue 02:00 EST
 assert.equal(allowed(overnight,'00:00','2026-11-24T15:00:00Z'),false); // Tue closed
});
test('normal opening hours honor the earliest merchant ordering clock',()=>{
 const normal={Monday:{open:'09:00',close:'17:00',closed:false}};
 assert.equal(allowed(normal,'10:00','2026-11-23T14:30:00Z'),false); // Mon 09:30 EST
 assert.equal(allowed(normal,'10:00','2026-11-23T15:00:00Z'),true);  // Mon 10:00 EST
 assert.equal(allowed(normal,'10:00','2026-11-23T22:00:00Z'),false); // Mon 17:00 EST
});
test('unknown hours or invalid hours never advertise order slots',()=>{
 assert.equal(allowed(null,'00:00','2026-11-23T15:00:00Z'),false);
 assert.equal(allowed({},'00:00','2026-11-23T15:00:00Z'),false);
 assert.equal(allowed({Monday:{open:'24:00',close:'25:00'}},'00:00','2026-11-23T15:00:00Z'),false);
});
test('24-hour opening remains consistent with the server open-equals-close convention',()=>{
 assert.equal(allowed({Monday:{open:'00:00',close:'00:00',closed:false}},'00:00','2026-11-24T04:50:00Z'),true);
});
