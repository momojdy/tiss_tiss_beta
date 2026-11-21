/* Runs the real web entry in Chrome. All external page requests are blocked. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
assert.ok(args.includes('--root')!==args.includes('--url'),'Provide one local export directory or loopback app URL.');
const state=fs.mkdtempSync(path.join(os.tmpdir(),'goodies-browser-'));fs.chmodSync(state,0o700);
const report={classification:'NOT VERIFIED',scope:'Actual anonymous web entry only; not signed-in or installed-device acceptance.',externalPageRequestsAllowed:false,externalRequestsBlocked:0,uncaughtErrors:[]};
let server,browser,connection,url;
const pending=new Map();let sequence=0;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function cdp(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser protocol timeout: '+method));},15000);pending.set(id,{resolve:result=>{clearTimeout(timer);resolve(result);},reject:error=>{clearTimeout(timer);reject(error);}});connection.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function main(){
 if(args.includes('--root')){
  const root=fs.realpathSync(value('--root'));assert.ok(fs.existsSync(path.join(root,'index.html')),'The existing Expo export is required.');
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
  server=http.createServer((request,response)=>{
   let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));}catch{response.writeHead(400).end();return;}
   if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
   if(file===root||fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   if(!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
   response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 }else{
  url=value('--url');const local=new URL(url);assert.equal(local.protocol,'http:');assert.ok(['127.0.0.1','localhost'].includes(local.hostname),'Only a loopback app can be checked.');
 }
 const origin=new URL(url).origin;
 const binary=process.env.GOODIES_BROWSER_BIN||['google-chrome','chromium','chromium-browser'].map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(result=>result.status===0)?.stdout.trim();
 assert.ok(binary&&fs.existsSync(binary),'Install or select an existing Chrome/Chromium binary.');
 const browserEnv={...process.env};for(const key of ['EXPO_TOKEN','EAS_ACCESS_TOKEN','GITHUB_TOKEN','GH_TOKEN','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_TEST_SECRET_KEY','STRIPE_WEBHOOK_SECRET'])delete browserEnv[key];
 browser=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+path.join(state,'profile'),'about:blank'],{env:browserEnv,stdio:'ignore'});
 browser.on('error',error=>{report.browserError=error.code||'Launch failed';});
 const portFile=path.join(state,'profile','DevToolsActivePort');
 for(let attempt=0;attempt<150&&!fs.existsSync(portFile);attempt++){assert.ok(browser.exitCode===null&&!report.browserError,'The selected browser could not start.');await delay(100);}
 assert.ok(fs.existsSync(portFile),'The browser did not expose its local test endpoint.');
 const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split('\n');
 connection=new WebSocket('ws://127.0.0.1:'+port+endpoint);
 await new Promise((resolve,reject)=>{connection.addEventListener('open',resolve,{once:true});connection.addEventListener('error',()=>reject(Error('Could not connect to the local browser.')),{once:true});});
 connection.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.id){const request=pending.get(message.id);if(request){pending.delete(message.id);message.error?request.reject(Error(message.error.message)):request.resolve(message.result);}return;}
  if(message.method==='Runtime.exceptionThrown')report.uncaughtErrors.push((message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text||'Uncaught browser error').slice(0,500));
  if(message.method==='Fetch.requestPaused'){
   const request=message.params;let local=false;try{local=new URL(request.request.url).origin===origin;}catch{}
   if(!local)report.externalRequestsBlocked++;
   void cdp(local?'Fetch.continueRequest':'Fetch.failRequest',{requestId:request.requestId,...(!local?{errorReason:'BlockedByClient'}:{})},message.sessionId).catch(()=>{});
  }
 });
 const {targetId}=await cdp('Target.createTarget',{url:'about:blank'}),{sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
 await cdp('Runtime.enable',{},sessionId);await cdp('Page.enable',{},sessionId);await cdp('Network.enable',{},sessionId);
 await cdp('Network.setBlockedURLs',{urls:['wss://*']},sessionId);
 await cdp('Fetch.enable',{patterns:[{urlPattern:'*'}]},sessionId);
 await cdp('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true},sessionId);
 await cdp('Page.navigate',{url},sessionId);
 let mounted=false;
 for(let attempt=0;attempt<180;attempt++){
  assert.equal(report.uncaughtErrors.length,0,report.uncaughtErrors.join('\n'));
  const result=await cdp('Runtime.evaluate',{expression:"Boolean(document.querySelector('#root')?.innerText?.includes('Sign in') && document.querySelector('input[type=password]'))",returnByValue:true},sessionId);
  if(result.result?.value===true){mounted=true;break;}await delay(250);
 }
 assert.ok(mounted,'The anonymous sign-in entry never mounted.');
 await delay(1000);assert.equal(report.uncaughtErrors.length,0,report.uncaughtErrors.join('\n'));
 report.signInMounted=true;report.classification='PASS';
 console.log('PASS: real anonymous web entry mounts without uncaught errors; external page requests blocked.');
}
async function cleanup(){
 if(connection?.readyState===WebSocket.OPEN)await Promise.race([cdp('Browser.close').catch(()=>{}),delay(1500)]);
 for(const request of pending.values())request.reject(Error('Browser check ended.'));pending.clear();
 if(connection)connection.close();
 if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),delay(3000)]);if(browser.exitCode===null)browser.kill('SIGKILL');}
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 fs.rmSync(state,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}
main().catch(error=>{report.classification='FAIL';report.error=String(error.message).slice(0,1200);console.error(report.error);process.exitCode=1;}).finally(async()=>{try{await cleanup();}catch(error){report.classification='FAIL';report.cleanupError=String(error.message).slice(0,500);process.exitCode=1;}if(args.includes('--report'))fs.writeFileSync(value('--report'),JSON.stringify(report,null,2)+'\n');});
