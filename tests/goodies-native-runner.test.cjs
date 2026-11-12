const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const run=(script,args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
test('native financial tooling rejects production URLs and existing system sockets before connecting',()=>{
 for(const host of ['https://external.invalid','/var/run/postgresql'])assert.notEqual(run('scripts/goodies-postgres-client.cjs',['-h',host,'-U','postgres','-d','postgres','-c','select 1']).status,0);
 assert.notEqual(run('scripts/test-goodies-settlement-postgres.cjs',['--container','production-database']).status,0);
 assert.notEqual(run('scripts/test-goodies-settlement-postgres.cjs',['--container','wantiss-goodies-settlement-synthetic','--database','production']).status,0);
});
test('native financial tooling rejects symlinks that escape its private temporary cluster',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wantiss-goodies-postgres-'));fs.chmodSync(dir,0o700);
 try{const socket=path.join(dir,'socket');fs.symlinkSync(os.tmpdir(),socket);assert.notEqual(run('scripts/goodies-postgres-client.cjs',['-h',socket,'-U','postgres','-d','postgres','-c','select 1']).status,0);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
