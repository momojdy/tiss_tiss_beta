// Optional native test transport. Only the runner's private temporary Unix socket is accepted.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
const host=value('-h'),user=value('-U'),database=value('-d');
assert.ok(path.isAbsolute(host)&&/^wantiss-goodies-postgres-[a-zA-Z0-9]+$/.test(path.basename(path.dirname(host)))&&path.basename(host)==='socket');
assert.equal(fs.realpathSync(host),host);assert.equal(fs.statSync(path.dirname(host)).uid,process.getuid());assert.equal(fs.statSync(path.dirname(host)).mode&0o777,0o700);
assert.equal(user,'postgres');assert.equal(database,'postgres');
const {Client}=require(process.env.GOODIES_TEST_PG_MODULE||'pg');
const sql=args.includes('-f')?fs.readFileSync(value('-f'),'utf8'):value('-c');assert.equal(typeof sql,'string');
const client=new Client({host,user,database,port:5432,password:'',ssl:false});
(async()=>{try{
 await client.connect();
 const result=await client.query(sql);
 for(const item of Array.isArray(result)?result:[result])for(const row of item.rows||[])console.log(Object.values(row).map(value=>value===null?'':typeof value==='object'?JSON.stringify(value):String(value)).join('|'));
}catch(error){console.error(error.message);process.exitCode=1;}finally{await client.end();}})();
