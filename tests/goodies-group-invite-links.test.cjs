const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleValue={exports:{}};
const helper=fs.readFileSync('src/features/Goodies/groupInviteLinks.ts','utf8');
vm.runInNewContext(ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleValue,exports:moduleValue.exports});
const {groupInviteCodeFromLink}=moduleValue.exports;
test('Goodies group QR invitation parser accepts current and historical invite codes',()=>{
 assert.equal(groupInviteCodeFromLink('wantiss://goodies/group?code=ABC12345'),'ABC12345');
 assert.equal(groupInviteCodeFromLink('wantiss://goodies/group?code=abc1234def'),'ABC1234DEF');
 assert.equal(groupInviteCodeFromLink('wantiss://goodies/group?utm=messages&code=abc12345#share'),'ABC12345');
});
test('invitation links reject unrelated, duplicate and malformed inputs',()=>{
 for(const url of ['https://site.example/?code=ABC12345','wantiss://goodies/store?code=ABC12345',
 'wantiss://goodies/group?code=ABC12345&code=OTHER123','wantiss://goodies/group?code=%ZZ',
 'wantiss://goodies/group?code=bad','wantiss://goodies/group?code=%0AABC12345',
 'wantiss://goodies/group?code=ABC12345/checkout',null,{}]){
  assert.equal(groupInviteCodeFromLink(url),null,String(url));
 }
});
test('group links route through the Wantiss shell and preserve the code until Goodies mounts',()=>{
 const shell=fs.readFileSync('App.tsx','utf8'),goodies=fs.readFileSync('src/features/Goodies/GoodiesApp.tsx','utf8');
 assert.match(shell,/const incomingGroupCode=groupInviteCodeFromLink\(url\)/);
 assert.match(shell,/setPendingGroupInviteCode\(incomingGroupCode\)/);
 assert.match(shell,/setGoodiesInitialRoute\('groupinvite:'\+pendingGroupInviteCode\)/);
 assert.match(shell,/setBuyerScreen\('goodies'\)/);
 assert.match(goodies,/pendingGroupInviteCode=initialRoute\.slice\(12\)/);
 assert.match(goodies,/reset\('grouporder'\)/);
});
