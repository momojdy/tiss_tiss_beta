const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const scheduling={exports:{}};vm.runInNewContext(compile(fs.readFileSync('src/features/Goodies/scheduling.ts','utf8')),{module:scheduling,exports:scheduling.exports,Date});
const {scheduleMinimum,scheduleDays,scheduleChoice,clampScheduleTime}=scheduling.exports;
const inZone=(zone,run)=>{const previous=process.env.TZ;process.env.TZ=zone;try{return run();}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}};
const stamp=date=>date?.getTime()||0;
test('the earliest slot skips a closed today and selects the first valid future day automatically',()=>inZone('Asia/Manila',()=>{
 const now=new Date('2026-11-22T16:45:00+08:00').getTime();
 const days=scheduleDays(now,date=>date.getDay()===1&&date.getHours()>=10&&date.getHours()<17);
 const selected=scheduleChoice(days,0,now);assert.equal(selected.toISOString(),'2026-11-23T02:00:00.000Z');assert.equal(days[0].slots.length,0);
}));
test('slot rounding never preselects the strict fifteen-minute boundary or an earlier time',()=>{
 const now=Date.parse('2026-11-22T10:00:00Z');assert.equal(scheduleMinimum(now),Date.parse('2026-11-22T10:20:00Z'));
 const days=scheduleDays(now,()=>true);assert.ok(stamp(scheduleChoice(days,0,now))>now+15*60_000);
});
test('native picker events clamp earlier times and closed gaps to real allowed slots',()=>inZone('UTC',()=>{
 const now=Date.parse('2026-11-22T08:00:00Z');const days=scheduleDays(now,date=>(date.getHours()>=10&&date.getHours()<12)||(date.getHours()>=14&&date.getHours()<17));
 const day=days[0];assert.equal(clampScheduleTime(day,new Date('2026-11-22T09:00:00Z'),now).toISOString(),'2026-11-22T10:00:00.000Z');
 assert.equal(clampScheduleTime(day,new Date('2026-11-22T12:30:00Z'),now).toISOString(),'2026-11-22T14:00:00.000Z');
 assert.equal(clampScheduleTime(day,new Date('2026-11-22T23:00:00Z'),now).toISOString(),'2026-11-22T16:55:00.000Z');
 assert.equal(clampScheduleTime(days[1],new Date('2026-11-22T11:00:00Z'),now).toISOString(),'2026-11-23T11:00:00.000Z');
}));
test('valid saved choices survive reopening, while passed choices advance and missing availability stays empty',()=>inZone('UTC',()=>{
 const now=Date.parse('2026-11-22T08:00:00Z'),valid=Date.parse('2026-11-23T11:15:00Z');
 const days=scheduleDays(now,date=>date.getHours()>=10&&date.getHours()<17);assert.equal(stamp(scheduleChoice(days,valid,now)),valid);
 assert.ok(stamp(scheduleChoice(days,now-60_000,now))>=scheduleMinimum(now));
 const none=scheduleDays(now,()=>false);assert.equal(scheduleChoice(none,0,now),null);assert.equal(clampScheduleTime(none[0],new Date(now),now),null);
}));
test('customer calendar days and slot bounds stay correct across daylight-saving transitions',()=>inZone('America/New_York',()=>{
 const now=new Date('2026-10-31T20:00:00-04:00').getTime(),days=scheduleDays(now,()=>true);
 assert.equal(days[2].date.getTime()-days[1].date.getTime(),25*3600_000);
 for(const day of days){const next=new Date(day.date);next.setDate(next.getDate()+1);assert.ok(day.slots.every(slot=>slot>=day.date&&slot<next&&slot.getTime()>=scheduleMinimum(now)));}
}));

const source=fs.readFileSync('src/features/Goodies/components/Sheets.tsx','utf8'),ast=ts.createSourceFile('Sheets.tsx',source,99,true,ts.ScriptKind.TSX);
const declarations=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['isAvailableInstant','ScheduleSheet'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
function pickerHarness(platform='ios',available=date=>date.getUTCDay()===1&&date.getUTCHours()>=10&&date.getUTCHours()<17){
 let now=Date.parse('2026-11-22T16:45:00Z');class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const state=[],memo=[],effects=[],deps=[];let cursor=0,changed=false;
 const differs=(before,after)=>!before||after.some((value,i)=>!Object.is(value,before[i]));
 const S={cart:{sid:'store'},sch:0,lang:'en',mode:'delivery'},calls=[],dialogs=[],intervals=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}})},module={exports:{}};
 const context={module,exports:module.exports,React,Date:Clock,Intl,STB:{store:{live:true,open:false,acceptScheduledOrders:true,scheduleHours:{Monday:{open:'10:00',close:'17:00'}}}},S,Platform:{OS:platform},
  useTheme:()=>({br:'orange',soft:'#eee',line:'#ddd',mut:'#666',ink:'#111'}),label:(_key,fallback)=>fallback,wantissLocale:()=> 'en',cartStoreIds:()=>['store'],canScheduleGoodiesStore:(_id,timestamp)=>available(new Date(timestamp)),
  useState:initial=>{const id=cursor++;if(!(id in state))state[id]=typeof initial==='function'?initial():initial;return[state[id],value=>{const next=typeof value==='function'?value(state[id]):value;if(!Object.is(next,state[id])){state[id]=next;changed=true;}}];},
  useMemo:(fn,d)=>{const id=cursor++;if(differs(deps[id],d)){memo[id]=fn();deps[id]=d;}return memo[id];},
  useEffect:(fn,d)=>{const id=cursor++;if(differs(deps[id],d)){deps[id]=d;effects.push(fn);}},setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval:()=>{},
  A:{setSch:value=>{S.sch=value;calls.push(value);},setMode:value=>{S.mode=value;}},toast:()=>{},...scheduling.exports,
  View:'View',T:'T',Row:'Row',Icon:'Icon',SegSchedule:'SegSchedule',ScrollView:'ScrollView',Pressable:'Pressable',DateTimePicker:'DateTimePicker',DateTimePickerAndroid:{open:props=>dialogs.push(props)},Cta:'Cta'};
 vm.runInNewContext(compile(declarations+'\nmodule.exports=ScheduleSheet;'),context);
 function render(){let tree,attempt=0;do{changed=false;cursor=0;tree=module.exports({close:()=>{},inline:true,autoApply:true});effects.splice(0).forEach(fn=>fn());assert.ok(++attempt<10,'Schedule hooks did not settle');}while(changed);return tree;}
 const nodes=node=>{if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object')return[];return[node,...nodes(node.props?.children)];};
 const picker=tree=>{if(platform!=='android')return nodes(tree).find(n=>n.type==='DateTimePicker');const trigger=nodes(tree).find(n=>n.type==='Pressable'&&n.props.accessibilityRole==='button');if(!trigger)return;trigger.props.onPress();return{props:dialogs.at(-1)};};
 return{S,calls,dialogs,render,picker,nodes,tick:ms=>{now+=ms;intervals.forEach(fn=>fn());}};
}
test('the actual inline picker saves its automatic minimum and keeps Android/iOS events within bounds',()=>inZone('UTC',()=>{
 for(const platform of ['ios','android']){const h=pickerHarness(platform);let tree=h.render(),picker=h.picker(tree);assert.ok(picker);assert.equal(h.S.sch,Date.parse('2026-11-23T10:00:00Z'));assert.equal(stamp(picker.props.value),h.S.sch);
  picker.props.onChange({type:'set'},new Date('2026-11-23T09:00:00Z'));tree=h.render();assert.equal(h.S.sch,Date.parse('2026-11-23T10:00:00Z'));assert.equal(stamp(h.picker(tree).props.value),h.S.sch);
  h.picker(tree).props.onChange({type:'set'},new Date('2026-11-23T11:25:00Z'));tree=h.render();assert.equal(h.S.sch,Date.parse('2026-11-23T11:25:00Z'));assert.equal(stamp(h.picker(tree).props.value),h.S.sch);
  const count=h.calls.length;h.picker(tree).props.onChange({type:'dismissed'},new Date('2026-11-23T08:00:00Z'));h.render();assert.equal(h.calls.length,count);
  assert.ok(!h.nodes(tree).some(n=>n.type==='Cta'),'Automatic checkout scheduling must not require another Apply button');
 }
}));
test('a store with no real future slots never gets a midnight picker or an invented scheduled time',()=>inZone('UTC',()=>{
 const h=pickerHarness('ios',()=>false),tree=h.render();assert.equal(h.picker(tree),undefined);assert.equal(h.S.sch,0);
}));
test('Android opens its clock only on a tap and never reopens it after confirmation, cancellation or a refresh',()=>inZone('UTC',()=>{
 const h=pickerHarness('android');let tree=h.render();assert.equal(h.dialogs.length,0);
 let picker=h.picker(tree);assert.equal(h.dialogs.length,1);picker.props.onChange({type:'set'},new Date('2026-11-23T11:25:00Z'));
 tree=h.render();h.tick(30_000);tree=h.render();assert.equal(h.dialogs.length,1);assert.equal(h.S.sch,Date.parse('2026-11-23T11:25:00Z'));
 picker=h.picker(tree);assert.equal(h.dialogs.length,2);picker.props.onChange({type:'dismissed'});h.render();h.tick(30_000);h.render();assert.equal(h.dialogs.length,2);
}));
