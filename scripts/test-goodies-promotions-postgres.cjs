/* Native PostgreSQL races: a validated network-isolated container or a self-created socket-only temporary cluster. No database URL is accepted. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),nativeIndex=process.argv.indexOf('--native-bin'),native=nativeIndex>=0;
const container=process.argv[process.argv.indexOf('--container')+1];
if(!native&&(!process.argv.includes('--container')||!/^wantiss-goodies-settlement-[a-z0-9-]+$/.test(container||'')))throw Error('Use a named isolated test container or --native-bin for a self-created temporary cluster; database URLs are never accepted.');
const database=process.argv.includes('--database')?process.argv[process.argv.indexOf('--database')+1]:'postgres';if(database!=='postgres'&&!/^goodies_[a-z0-9_]+$/.test(database))throw Error('Only synthetic goodies_* database names are accepted.');
let env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const base=['--host=unix:///var/run/docker.sock'];
const docker=(args)=>execFileSync('docker',[...base,...args],{env,encoding:'utf8',maxBuffer:8*1024*1024});
let nativeBin,nativeRoot,socket,stopped=false;
function cleanupNative(){if(!nativeRoot||stopped)return;stopped=true;try{execFileSync(path.join(nativeBin,'pg_ctl'),['-D',path.join(nativeRoot,'data'),'-m','fast','-w','stop'],{env,stdio:'ignore'});fs.rmSync(nativeRoot,{recursive:true,force:true});}catch{console.warn('Synthetic cluster retained for inspection:',nativeRoot);}}
let execute,queryArgs;
if(native){
 if(database!=='postgres')throw Error('The native mode always creates its own fresh postgres database.');
 nativeBin=fs.realpathSync(process.argv[nativeIndex+1]);
 for(const key of Object.keys(env))if(key.startsWith('PG')||['DATABASE_URL','SUPABASE_DB_URL','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY'].includes(key))delete env[key];
 env={...env,LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC',LD_LIBRARY_PATH:[path.resolve(nativeBin,'../lib'),env.LD_LIBRARY_PATH].filter(Boolean).join(':'),PGPASSFILE:'/dev/null',PGSERVICEFILE:'/dev/null'};
 assert.match(execFileSync(path.join(nativeBin,'postgres'),['--version'],{env,encoding:'utf8'}),/PostgreSQL\) 17\.6\s*$/);
 nativeRoot=fs.mkdtempSync(path.join(os.tmpdir(),'wantiss-goodies-postgres-'));fs.chmodSync(nativeRoot,0o700);socket=path.join(nativeRoot,'socket');fs.mkdirSync(socket,{mode:0o700});
 execFileSync(path.join(nativeBin,'initdb'),['-D',path.join(nativeRoot,'data'),'-U','postgres','--auth=trust','--no-locale','--encoding=UTF8','--no-sync'],{env,stdio:'ignore'});
 execFileSync(path.join(nativeBin,'pg_ctl'),['-D',path.join(nativeRoot,'data'),'-l',path.join(nativeRoot,'server.log'),'-o',`-k ${socket} -c listen_addresses='' -c unix_socket_permissions=0700`,'-w','start'],{env,stdio:'ignore'});
 process.on('exit',cleanupNative);
 execute=process.execPath;queryArgs=[path.join(__dirname,'goodies-postgres-client.cjs'),'-h',socket,'-U','postgres','-d','postgres','-X','-q','-tA','-v','ON_ERROR_STOP=1'];
}else{
 const info=JSON.parse(docker(['inspect',container]))[0];assert.equal(info.HostConfig.NetworkMode,'none','Test container must have no network');assert.match(info.Config.Image,/^postgres:17\.6-alpine/);assert.ok(!info.Mounts.some(m=>m.Type==='bind'),'Host-mounted data is prohibited');
 execute='docker';queryArgs=[...base,'exec',container,'psql','-U','postgres','-d',database,'-X','-q','-tA','-v','ON_ERROR_STOP=1'];
 let ready=false;for(let attempt=0;attempt<80;attempt++){try{docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break;}catch{Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}}assert.ok(ready,'Synthetic PostgreSQL did not become ready');
}
const sql=query=>execFileSync(execute,[...queryArgs,'-c',query],{env,encoding:'utf8',maxBuffer:8*1024*1024}).trim();
assert.equal(sql("begin;select 'goodies_query_transport_ready';commit;"),'goodies_query_transport_ready','The query transport must return rows without PostgreSQL command-status tags.');
if(native){assert.equal(sql('show listen_addresses'),'');assert.equal(sql('show unix_socket_directories'),socket);assert.equal(fs.realpathSync(sql('show data_directory')),fs.realpathSync(path.join(nativeRoot,'data')));assert.equal(fs.statSync(nativeRoot).uid,process.getuid());}
assert.equal(sql("select count(*) from pg_namespace where nspname='auth'"),'0','Use a fresh synthetic test database; existing data is never reset.');
const reaudit=true,sharedBill=true;
const {bootstrap,files,upstreamFiles,forwardFiles}=require('./goodies-isolated-schema.cjs')({reaudit,sharedBill,promotions:false,courierBaseline:process.argv.includes('--courier-baseline')});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'goodies-native-settlement-')),file=path.join(temp,'bootstrap.sql');fs.writeFileSync(file,bootstrap);
try{if(native)execFileSync(execute,[...queryArgs,'-f',file],{env,encoding:'utf8',maxBuffer:8*1024*1024});else{docker(['cp',file,container+':/tmp/goodies-bootstrap.sql']);docker(['exec',container,'psql','-U','postgres','-d',database,'-X','-v','ON_ERROR_STOP=1','-f','/tmp/goodies-bootstrap.sql']);}}finally{fs.rmSync(temp,{recursive:true,force:true});}

const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261122141421_goodies_financial_promotion_management.sql'),'utf8');
sql('begin;'+migration+';rollback;');assert.equal(sql("select to_regprocedure('public.goodies_admin_promotions(integer)') is null"),'true');sql(migration);
const admin='80000000-0000-4000-8000-000000000001',other='80000000-0000-4000-8000-000000000002',id='80000000-0000-4000-8000-000000000010';
sql(`insert into auth.users(id,email_confirmed_at) values('${admin}',now()),('${other}',now());insert into public.wantiss_admin_staff(user_id,display_name,status,role,created_at,updated_at) values('${admin}','Synthetic finance','active','super_admin',now(),now());`);
const data={code:'LOCAL10',discount_type:'percent',discount_value:10,min_subtotal:5,is_active:true};
const literal=x=>"'"+JSON.stringify(x).replace(/'/g,"''")+"'::jsonb";
const auth=(uid,query)=>`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);${query};commit;`;
const save=(value=data,expected='null')=>`select public.goodies_admin_save_promotion('${id}',${expected},${literal(value)},'Synthetic regression review')`;
assert.throws(()=>sql(auth(other,save())),/Not authorized/);
assert.throws(()=>sql('set role anon;select public.goodies_admin_promotions(0)'),/permission denied/);
sql(auth(admin,save()));
assert.equal(sql("select count(*) from public.goodies_promotions where code='LOCAL10'"),'1');
assert.equal(sql("select count(*) from public.wantiss_admin_audit_log where action='goodies_promotion_save'"),'1');
assert.ok(sql('set role anon;select public.goodies_public_promotions()').includes('LOCAL10'));
assert.throws(()=>sql(auth(admin,save())),/Promotion changed/);
const version=()=>"'"+sql(`select updated_at::text from public.goodies_promotions where id='${id}'`)+"'::timestamptz";
for(const invalid of [{...data,redemption_count:0},{...data,discount_value:101},{...data,min_subtotal:-1},{...data,starts_at:'2026-12-02',expires_at:'2026-12-01'},{...data,discount_value:'NaN'}])assert.throws(()=>sql(auth(admin,save(invalid,version()))));
sql(auth(admin,save({...data,is_active:false},version())));assert.ok(!sql('select public.goodies_public_promotions()').includes('LOCAL10'));
sql(auth(admin,save({...data,starts_at:'2099-01-01T00:00:00Z'},version())));assert.ok(!sql('select public.goodies_public_promotions()').includes('LOCAL10'));
sql(auth(admin,save({...data,expires_at:'2000-01-01T00:00:00Z'},version())));assert.ok(!sql('select public.goodies_public_promotions()').includes('LOCAL10'));
sql(`update public.goodies_promotions set redemption_count=1 where id='${id}'`);
assert.throws(()=>sql(auth(admin,save({...data,discount_value:20},version()))),/Create a new code/);
sql(auth(admin,save({...data,max_redemptions:1},version())));assert.ok(!sql('select public.goodies_public_promotions()').includes('LOCAL10'));
assert.equal(sql(`select redemption_count from public.goodies_promotions where id='${id}'`),'1');
assert.throws(()=>sql(auth(other,`update public.goodies_promotions set discount_value=100 where id='${id}'`)),/permission denied/);
(async()=>{
 const {Client}=require(process.env.GOODIES_TEST_PG_MODULE||'pg');const expected=version();
 const edit=async()=>{const client=new Client({host:socket,user:'postgres',database:'postgres',ssl:false});try{await client.connect();await client.query(auth(admin,save({...data,max_redemptions:1,is_active:false},expected)));}finally{await client.end();}};
 const results=await Promise.allSettled([edit(),edit()]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'40001');
 sql(`update public.wantiss_admin_staff set status='revoked' where user_id='${admin}'`);assert.throws(()=>sql(auth(admin,save(data,version()))),/Not authorized/);
 cleanupNative();console.log('PASS: isolated PostgreSQL migration rollback, promotion creation/audit, wrong-role/direct-write denial, concurrent/stale retries, invalid prices/dates, activation/expiry/cap visibility, redemption preservation and revoked-staff denial. No hosted connection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
