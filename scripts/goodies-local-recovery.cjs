/* Full clean-stop physical recovery of the self-created synthetic cluster only.
 * This cannot back up or restore the hosted Wantiss project. No external URL is accepted.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
module.exports=async function({pg,state,nativeBin,env,docker,auth,rest,storage,api,ready,scenario,report,setActiveDirectory,afterRestore}){
 assert.match(path.basename(state),/^wantiss-goodies-postgres-[a-zA-Z0-9]+$/);
 assert.equal(fs.statSync(state).uid,process.getuid());assert.equal(fs.statSync(state).mode&0o777,0o700);
 const original=path.join(state,'data'),recovered=path.join(state,'recovered-data'),socket=path.join(state,'socket');
 assert.equal(fs.realpathSync(pg('show data_directory')),fs.realpathSync(original));assert.equal(pg('show listen_addresses'),'');
 const literal=value=>"'"+String(value).replaceAll("'","''")+"'",identifier=value=>'"'+String(value).replaceAll('"','""')+'"';
 function snapshot(){
  const tables=JSON.parse(pg("select jsonb_agg(jsonb_build_array(schemaname,tablename) order by schemaname,tablename) from pg_tables where schemaname not in ('pg_catalog','information_schema') and schemaname not like 'pg_toast%'"));
  const parts=tables.map(([schema,table])=>`(select jsonb_build_object('table',${literal(schema+'.'+table)},'rows',count(*),'fingerprint',md5(coalesce(string_agg(to_jsonb(record)::text,E'\\n' order by to_jsonb(record)::text),''))) from ${identifier(schema)}.${identifier(table)} record)`);
  const rows=JSON.parse(pg("select coalesce(jsonb_agg(item order by item->>'table'),'[]'::jsonb) from (values "+parts.map(part=>'('+part+')').join(',')+") as snapshot(item)"));
  const schema=pg("select md5(string_agg(pg_get_functiondef(p.oid),E'\\n' order by p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth','storage') and p.prokind in ('f','p')");
  const roles=pg("select md5(jsonb_agg(to_jsonb(r) order by rolname)::text) from (select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig from pg_roles) r");
  const policies=pg("select md5(coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname)::text,'')) from pg_policies p where schemaname in ('public','private','auth','storage')");
  return {rows,schema,roles,policies};
 }
 await scenario('A complete local synthetic database copy restores every table fingerprint, role and policy',async()=>{
  for(const service of [auth,rest,storage].filter(Boolean))docker(['stop','-t','5',service.name]);
  const before=snapshot();pg('checkpoint');
  execFileSync(path.join(nativeBin,'pg_ctl'),['-D',original,'-m','fast','-w','stop'],{env,stdio:'ignore'});
  assert.equal(fs.existsSync(path.join(original,'postmaster.pid')),false);
  fs.cpSync(original,recovered,{recursive:true,preserveTimestamps:true,errorOnExist:true,force:false});
  fs.chmodSync(recovered,fs.statSync(original).mode&0o777);
  assert.equal(fs.statSync(recovered).mode&0o777,0o700);
  setActiveDirectory(recovered);
  const restoredLog=path.join(state,'restored.log');
  try{execFileSync(path.join(nativeBin,'pg_ctl'),['-D',recovered,'-l',restoredLog,'-o',`-k ${socket} -c listen_addresses='' -c unix_socket_permissions=0777`,'-w','start'],{env,stdio:'ignore'});}
  catch(error){throw Error('Restored local cluster could not start: '+(fs.existsSync(restoredLog)?fs.readFileSync(restoredLog,'utf8').split('\n').slice(-12).join('\n'):String(error.message)));}
  assert.equal(fs.realpathSync(pg('show data_directory')),fs.realpathSync(recovered));assert.equal(pg('show listen_addresses'),'');
  assert.deepEqual(snapshot(),before);
  report.localRecovery={classification:'PASS',scope:'All tables in this synthetic local cluster; not a production backup or production restore.',productionBackupCreated:false,restoredTableCount:before.rows.length,tableFingerprints:before.rows,functionFingerprint:before.schema,roleFingerprint:before.roles,policyFingerprint:before.policies};
  for(const service of [auth,rest,storage].filter(Boolean)){
   docker(['start',service.name]);const info=JSON.parse(docker(['inspect',service.name]))[0];
   service.ip=Object.values(info.NetworkSettings.Networks)[0].IPAddress;
  }
  await ready(api,'/auth/v1/health');await ready(api,'/rest/v1/');if(storage)await ready(api,'/storage/v1/status');
 });
 if(afterRestore)await afterRestore();
};
