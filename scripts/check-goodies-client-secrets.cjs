const fs=require('node:fs'),path=require('node:path');
const roots=[path.resolve(__dirname,'../src')];
if(process.argv.includes('--paired'))roots.push(path.resolve(__dirname,'../../tiss-admin/src'));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):/\.[cm]?[jt]sx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]);
let inspected=0;const failures=[];
for(const root of roots)for(const file of files(root)){
 inspected++;const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
  try{if(JSON.parse(Buffer.from(match[1],'base64url').toString()).role==='service_role')failures.push({file,line:source.slice(0,match.index).split('\n').length,kind:'privileged Supabase JWT'});}catch{}
 }
 for(const match of source.matchAll(/\b(?:sb_secret_|sk_live_|sk_test_|whsec_)[A-Za-z0-9_-]{20,}/g))failures.push({file,line:source.slice(0,match.index).split('\n').length,kind:'private provider credential'});
}
if(failures.length){console.error('FAIL: privileged client credentials found. Values omitted.',JSON.stringify(failures));process.exitCode=1;}
else console.log(`PASS: ${inspected} client source files scanned; no embedded privileged Supabase JWT or private provider key matched. This does not inspect runtime environments or provider-side restrictions.`);
