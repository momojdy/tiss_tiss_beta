/* Runs the repository's real public CMS handler with local-only permissions.
 * The wrapper changes only its listener address. No response or database operation is mocked.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
module.exports=async function({denoBin,state,env,base,serviceKey}){
 assert.equal(new URL(base).hostname,'127.0.0.1');
 const root=path.resolve(__dirname,'..'),wrapper=path.join(state,'cms-listener.ts'),source=path.join(root,'supabase/functions/wantiss-public-content/index.ts');
 fs.writeFileSync(wrapper,`const serve=Deno.serve;\n(Deno as any).serve=(handler:any)=>serve({hostname:'127.0.0.1',port:0,onListen:address=>console.log('GOODIES_LOCAL_EDGE_PORT:'+address.port)},handler);\nawait import(${JSON.stringify(pathToFileURL(source).href)});\n`,{mode:0o600});
 const log=fs.openSync(path.join(state,'cms-runtime.log'),'w',0o600);
 const child=spawn(denoBin,['run','--cached-only','--allow-read','--allow-env','--allow-net=127.0.0.1','--config',path.join(root,'supabase/functions/deno.json'),wrapper],{cwd:root,env:{...env,SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:serviceKey},stdio:['ignore','pipe',log]});
 fs.closeSync(log);
 return await new Promise((resolve,reject)=>{
  let output='',settled=false;
  const timeout=setTimeout(()=>{if(!settled){settled=true;child.kill();reject(Error('Local CMS runtime did not start; inspect its private runtime log.'));}},30000);
  child.stdout.on('data',data=>{output+=data;const match=output.match(/GOODIES_LOCAL_EDGE_PORT:(\d+)/);if(match&&!settled){settled=true;clearTimeout(timeout);resolve({child,port:Number(match[1])});}});
  child.on('error',()=>{if(!settled){settled=true;clearTimeout(timeout);reject(Error('Could not start the local CMS runtime.'));}});
  child.on('exit',code=>{if(!settled){settled=true;clearTimeout(timeout);reject(Error('Local CMS runtime exited during startup ('+code+').'));}});
 });
};
