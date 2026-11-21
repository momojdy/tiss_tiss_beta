/* Real local Auth + PostgREST + PostgreSQL acceptance. No hosted URL or credentials accepted. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),http=require('node:http');
const {Duplex}=require('node:stream');
const assert=require('node:assert/strict'),{execFileSync,spawnSync,spawn}=require('node:child_process');
const buildSchema=require('./goodies-isolated-schema.cjs');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
const useStorage=args.includes('--storage');
const useStripe=args.includes('--stripe-sandbox');
assert.ok(!useStripe||args.includes('--deno-bin'),'Stripe sandbox checks require the real local Edge runtime.');
assert.ok(args.includes('--native-bin'),'Provide the existing local PostgreSQL 17.6 native bin directory.');
assert.ok(!args.some(arg=>/^(?:postgres(?:ql)?|https?):\/\//i.test(arg)),'Hosted URLs are not accepted.');
const nativeBin=fs.realpathSync(value('--native-bin')),state=fs.mkdtempSync(path.join(os.tmpdir(),'wantiss-goodies-postgres-'));
fs.chmodSync(state,0o700);const socket=path.join(state,'socket');fs.mkdirSync(socket);fs.chmodSync(socket,0o777);
const suffix=crypto.randomBytes(6).toString('hex'),network='wantiss-goodies-local-'+suffix;
const containers=[],env={...process.env,LD_LIBRARY_PATH:path.resolve(nativeBin,'../lib'),LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC'};
for(const key of Object.keys(env))if(key.startsWith('PG')||/^(?:DATABASE_URL|SUPABASE_|STRIPE_|EXPO_TOKEN|EAS_ACCESS_TOKEN|DOCKER_HOST|DOCKER_CONTEXT|DOCKER_TLS|DOCKER_TLS_VERIFY|DOCKER_CERT_PATH)/.test(key))delete env[key];
env.PGPASSFILE='/dev/null';env.PGSERVICEFILE='/dev/null';
const docker=values=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...values],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
const pg=statement=>{
 const queryFile=Buffer.byteLength(statement)>64000?path.join(state,'statement-'+crypto.randomBytes(6).toString('hex')+'.sql'):null;
 if(queryFile)fs.writeFileSync(queryFile,statement,{mode:0o600});
 try{return execFileSync(process.execPath,[path.join(__dirname,'goodies-postgres-client.cjs'),'-h',socket,'-U','postgres','-d','postgres',...(queryFile?['-f',queryFile]:['-c',statement])],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024}).trim();}finally{if(queryFile)fs.rmSync(queryFile);}
};
const images={auth:'supabase/gotrue:v2.197.0@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b',rest:'postgrest/postgrest:v14.18@sha256:c7cd7e265a85b05248abf53f4473fcec7e327c282d0bd0cf60f1551996d09fcf',gateway:'haproxy:3.2-alpine@sha256:7816a9801a6846b912bc37e48529808e2fa87c3c47992441940f68e393ebcfeb'};
if(useStorage)images.storage='supabase/storage-api:v1.89.12@sha256:4a71028f91060c8d2e86d7426faa6841947d63f4ee97f9683d058d3ec367fb6c';
const jwtSecret=crypto.randomBytes(48).toString('hex');
function jwt(role){const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url'),payload=encode({role,iss:'local-goodies-acceptance',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});const body=encode({alg:'HS256',typ:'JWT'})+'.'+payload;return body+'.'+crypto.createHmac('sha256',jwtSecret).update(body).digest('base64url');}
const anonKey=jwt('anon'),serviceKey=jwt('service_role');
const privateValues=[jwtSecret,anonKey,serviceKey];
const redact=value=>privateValues.reduce((text,secret)=>text.split(secret).join('[redacted]'),String(value));
let started=false,networkCreated=false,proxy,cmsProcess,cmsPort,sandbox,activeDataDirectory=path.join(state,'data');
const report={observedAt:new Date().toISOString(),scope:'Actual local Auth/PostgREST/'+(useStorage?'Storage/':'')+'SQL with synthetic users and balances. Not hosted or physical-device acceptance.',productionContacted:false,hostedTestCreated:false,images,scenarios:[]};
function service(kind,port,settings){
 const name=network+'-'+kind;containers.push(name);
 const options=Object.entries(settings).flatMap(([key,val])=>['-e',key+'='+val]);
 const extra=kind==='storage'?['--user',process.getuid()+':'+process.getgid(),'--mount',`type=bind,src=${path.join(state,'storage')},dst=/var/lib/storage`]:[];
 docker(['run','--name',name,'--network',network,'--mount',`type=bind,src=${socket},dst=/run/goodies-db,readonly`,...extra,...options,'-d',images[kind]]);
 const info=JSON.parse(docker(['inspect',name]))[0];
 assert.deepEqual(info.HostConfig.PortBindings,{});
 return {name,port,ip:info.NetworkSettings.Networks[network].IPAddress};
}
async function ready(service,pathName){
 let lastStatus;
 for(let attempt=0;attempt<80;attempt++){
  assert.equal(docker(['inspect','--format','{{.State.Running}}',service.name]).trim(),'true','Local '+service.name+' exited during startup.');
  try{const response=await fetch('http://127.0.0.1:'+service.port+pathName,{signal:AbortSignal.timeout(5000)});lastStatus=response.status;await response.arrayBuffer();if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error('Local service did not become ready; last HTTP status '+lastStatus);
}
async function authStarted(service){
 for(let attempt=0;attempt<80;attempt++){
  assert.equal(docker(['inspect','--format','{{.State.Running}}',service.name]).trim(),'true','Local Auth exited during migrations.');
  const logs=spawnSync('docker',['--host=unix:///var/run/docker.sock','logs',service.name],{env,encoding:'utf8'});
  if((logs.stdout+logs.stderr).includes('GoTrue API started on:'))return;
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error('Local Auth did not finish its schema migrations.');
}
async function localTransport(auth,rest,storage){
 const name=network+'-transport';containers.push(name);
 docker(['run','--name',name,'--network',network,'--read-only','--entrypoint','/bin/busybox','-d',images.gateway,'sleep','3600']);
 const agents=new Map(),functionPorts=new Map();
 function agentFor(target){
  if(agents.has(target.name))return agents.get(target.name);
  const agent=new http.Agent({keepAlive:false});
  agent.createConnection=()=>{
   const child=spawn('docker',['--host=unix:///var/run/docker.sock','exec','-i',name,'/bin/busybox','nc','-w','10',target.ip,String(target.port)],{env,stdio:['pipe','pipe','pipe']});
   const channel=Duplex.from({readable:child.stdout,writable:child.stdin});
   child.stderr.resume();child.on('error',error=>channel.destroy(error));
   channel.setTimeout=()=>channel;channel.setNoDelay=()=>channel;channel.setKeepAlive=()=>channel;
   channel.on('close',()=>child.kill());return channel;
  };
  agents.set(target.name,agent);return agent;
 }
 proxy=http.createServer((incoming,outgoing)=>{
  const name=incoming.url.match(/^\/functions\/v1\/([^/?]+)(?:[/?]|$)/)?.[1];
  const functionPort=name==='wantiss-public-content'?cmsPort:functionPorts.get(name);
  if(functionPort){
   const request=http.request({hostname:'127.0.0.1',port:functionPort,path:incoming.url,method:incoming.method,headers:incoming.headers},response=>{outgoing.writeHead(response.statusCode,response.headers);response.pipe(outgoing);});
   request.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});incoming.pipe(request);return;
  }
  const isAuth=incoming.url.startsWith('/auth/v1/'),isRest=incoming.url.startsWith('/rest/v1/'),isStorage=storage&&incoming.url.startsWith('/storage/v1/');
  if(!isAuth&&!isRest&&!isStorage){outgoing.writeHead(404).end();return;}
  const prefix=isAuth?'/auth/v1':isStorage?'/storage/v1':'/rest/v1',target=isAuth?auth:isStorage?storage:rest;
  const request=http.request({hostname:target.ip,port:target.port,path:incoming.url.slice(prefix.length)||'/',method:incoming.method,agent:agentFor(target),headers:{...incoming.headers,connection:'close'}},response=>{outgoing.writeHead(response.statusCode,response.headers);response.pipe(outgoing);});
  request.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});incoming.pipe(request);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 report.transport='Real local HTTP through a loopback proxy and Docker exec TCP streams; no fabricated API response.';
 return {name,port:proxy.address().port,functionPorts};
}
async function scenario(name,work){try{await work();report.scenarios.push({name,classification:'PASS'});console.log('PASS: '+name);}catch(error){report.scenarios.push({name,classification:'FAIL'});throw error;}}
async function main(){
 if(useStripe)sandbox=await require('./goodies-stripe-sandbox.cjs').prepare({args,report,registerSecret:secret=>privateValues.push(secret)});
 assert.match(execFileSync(path.join(nativeBin,'postgres'),['--version'],{env,encoding:'utf8'}),/PostgreSQL\) 17\.6\s*$/);
 execFileSync(path.join(nativeBin,'initdb'),['-D',path.join(state,'data'),'-U','postgres','--auth=trust','--no-locale','--encoding=UTF8','--no-sync'],{env,stdio:'ignore'});
 execFileSync(path.join(nativeBin,'pg_ctl'),['-D',path.join(state,'data'),'-l',path.join(state,'server.log'),'-o',`-k ${socket} -c listen_addresses='' -c unix_socket_permissions=0777`,'-w','start'],{env,stdio:'ignore'});started=true;
 assert.equal(pg('show listen_addresses'),'');assert.equal(pg("select count(*) from pg_namespace where nspname='auth'"),'0');pg('create schema auth;');
 docker(['network','create','--internal',network]);networkCreated=true;
 assert.equal(JSON.parse(docker(['network','inspect',network]))[0].Internal,true);
 const auth=service('auth',9999,{GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:9999,API_EXTERNAL_URL:'http://localhost/auth/v1',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:'postgres://postgres@localhost/postgres?host=/run/goodies-db&search_path=auth',GOTRUE_SITE_URL:'http://localhost',GOTRUE_JWT_SECRET:jwtSecret,GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_EXP:3600,GOTRUE_EXTERNAL_EMAIL_ENABLED:true,GOTRUE_MAILER_AUTOCONFIRM:true,GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:false});
 await authStarted(auth);
 const useCms=args.includes('--deno-bin'),target=buildSchema({reaudit:true,managedAuth:true,managedStorage:useStorage,cmsLifecycle:useCms}),file=path.join(state,'bootstrap.sql');
 let storage;
 if(useStorage){
  pg(target.storagePrerequisites);fs.mkdirSync(path.join(state,'storage'),{mode:0o700});
  storage=service('storage',5000,{ANON_KEY:anonKey,SERVICE_KEY:serviceKey,AUTH_JWT_SECRET:jwtSecret,DATABASE_URL:'postgres://postgres@localhost/postgres?host=/run/goodies-db',DATABASE_SEARCH_PATH:'storage,public,extensions',DB_INSTALL_ROLES:true,STORAGE_BACKEND:'file',FILE_STORAGE_BACKEND_PATH:'/var/lib/storage',GLOBAL_S3_BUCKET:'goodies-local',TENANT_ID:'goodies-local',REGION:'local',ENABLE_IMAGE_TRANSFORMATION:false,PG_QUEUE_ENABLE:false,VECTOR_ENABLED:false,WORKERS_NUM:1,SERVER_PORT:5000,SERVER_HOST:'0.0.0.0'});
  let migrated=false;
  for(let attempt=0;attempt<200;attempt++){
   assert.equal(docker(['inspect','--format','{{.State.Running}}',storage.name]).trim(),'true','Local Storage exited during its own schema migrations.');
   if(pg("select to_regclass('storage.migrations') is not null")==='true'){
    report.storageMigrations=JSON.parse(pg('select json_build_object(\'ledgerRows\',count(*),\'appliedVersions\',count(*) filter(where id between 1 and 79),\'latestVersion\',max(id)) from storage.migrations'));
    if(report.storageMigrations.appliedVersions===79&&report.storageMigrations.latestVersion===79){migrated=true;break;}
   }
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(migrated,'The pinned Storage service must finish all 79 versioned migrations: '+JSON.stringify(report.storageMigrations));
 }
 fs.writeFileSync(file,target.bootstrap,{mode:0o600});
 execFileSync(process.execPath,[path.join(__dirname,'goodies-postgres-client.cjs'),'-h',socket,'-U','postgres','-d','postgres','-f',file],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});
 pg("do $$begin if not exists(select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login;end if;end $$;grant anon,authenticated,service_role to authenticator;");
 report.migrationCount=target.files.length+2+target.upstreamFiles.length+target.forwardFiles.length;
 report.sharedCmsMigrationFiles=target.cmsBaselineFiles;
 const rest=service('rest',3000,{PGRST_DB_URI:'postgres://authenticator@localhost/postgres?host=/run/goodies-db',PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:jwtSecret,PGRST_SERVER_HOST:'0.0.0.0',PGRST_SERVER_PORT:3000});
 const api=await localTransport(auth,rest,storage);await ready(api,'/auth/v1/health');await ready(api,'/rest/v1/');if(storage)await ready(api,'/storage/v1/status');
 const base='http://127.0.0.1:'+api.port;
 if(useCms){
  const runtime=await require('./goodies-local-cms.cjs')({denoBin:fs.realpathSync(value('--deno-bin')),state,env,base,serviceKey});cmsPort=runtime.port;cmsProcess=runtime.child;
 }
 const {createClient}=require('@supabase/supabase-js'),client=key=>createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const admin=client(serviceKey),anonymous=client(anonKey),actors={};
 for(const role of ['customer','otherCustomer','vendor','otherVendor','vendorStaff','otherVendorStaff','courier','otherCourier','superAdmin','restrictedStaff']){
  const email=role.toLowerCase()+'-'+suffix+'@example.invalid',password=crypto.randomBytes(24).toString('base64url')+'!aA1';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,role:'authenticated'});assert.equal(created.error,null,created.error?.message);
  assert.equal(created.data.user.role,'authenticated');
  const sdk=client(anonKey),signed=await sdk.auth.signInWithPassword({email,password});assert.equal(signed.error,null,signed.error?.message);
  const user=await sdk.auth.getUser();assert.equal(user.error,null);assert.equal(user.data.user.id,created.data.user.id);actors[role]={id:created.data.user.id,sdk};
 }
 report.actorRoles=Object.keys(actors);
 await scenario('Ten distinct role accounts sign in through real local Auth and retrieve their own account',async()=>assert.equal(new Set(Object.values(actors).map(actor=>actor.id)).size,10));
 // Scenario module uses actual signed-in SDK clients. Seed operations are confined to the fresh local socket.
 const storageProof=storage?require('./goodies-local-storage.cjs')({actors,anonymous,pg,scenario,report}):null;
 const afterRestore=await require('./goodies-local-api-scenarios.cjs')({actors,anonymous,service:admin,pg,scenario,report,storageProof});
 if(useCms)await require('./goodies-local-cms-scenarios.cjs')({actors,anonymous,pg,scenario,report});
 if(sandbox)await sandbox.run({actors,pg,scenario,state,env,base,api,anonKey,serviceKey,denoBin:fs.realpathSync(value('--deno-bin'))});
 await require('./goodies-local-recovery.cjs')({pg,state,nativeBin,env,docker,auth,rest,storage,api,ready,scenario,report,afterRestore,setActiveDirectory:value=>{activeDataDirectory=value;}});
 console.log('All local API scenarios passed; no hosted Supabase project or physical device was used.'+(sandbox?' Actual Stripe sandbox requests were verified.':' No payment provider was used.'));
}
async function cleanup(){
 if(sandbox)try{await sandbox.dispose();}catch(error){process.exitCode=1;report.sandboxCleanupError=redact(error.message);console.error('Sandbox cleanup needs attention: '+report.sandboxCleanupError);}
 if(cmsProcess)cmsProcess.kill();
 if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));}
 for(const name of containers.reverse())try{docker(['rm','-f',name]);}catch{}
 if(networkCreated)try{docker(['network','rm',network]);}catch{}
 if(started)try{execFileSync(path.join(nativeBin,'pg_ctl'),['-D',activeDataDirectory,'-m','fast','-w','stop'],{env,stdio:'ignore'});}catch{console.error('Local cluster stop failed; inspect '+state);return;}
 fs.rmSync(state,{recursive:true,force:true});
}
main().catch(error=>{
 report.error=redact(error.message).slice(0,1000);console.error(report.error);process.exitCode=1;
 if(sandbox)console.error(redact(sandbox.diagnostics()));
 for(const name of containers.filter(name=>/-auth$|-rest$|-storage$/.test(name))){
  const result=spawnSync('docker',['--host=unix:///var/run/docker.sock','logs',name],{env,encoding:'utf8'});
  for(const line of (result.stdout+result.stderr).split('\n'))try{const entry=JSON.parse(line);if(['error','fatal',50,60].includes(entry.level))console.error(redact(JSON.stringify({service:name.split('-').at(-1),message:entry.msg,error:entry.error})).slice(0,1500));}catch{}
 }
}).finally(async()=>{
 await cleanup();report.classification=process.exitCode?'FAIL':'PASS';
 if(args.includes('--report'))fs.writeFileSync(value('--report'),JSON.stringify(report,null,2)+'\n');
});
