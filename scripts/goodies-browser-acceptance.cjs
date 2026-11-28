/* Actual exported customer UI + real local Auth/PostgREST. No hosted request is allowed. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
module.exports=async({exportRoot,actors,base,anonKey,pg,scenario,report,redact})=>{
 const root=fs.realpathSync(exportRoot),state=fs.mkdtempSync(path.join(os.tmpdir(),'goodies-ui-'));fs.chmodSync(state,0o700);
 assert.ok(fs.existsSync(path.join(root,'index.html')),'Customer export must exist');
 assert.equal(new URL(base).hostname,'127.0.0.1','UI checks require the self-created local backend');
 const productionOrigin='https://ycbirmgppwavorwudlrv.supabase.co';
 const evidence=report.browser={classification:'NOT VERIFIED',scope:'Real exported web customer UI against synthetic local APIs; not installed/native acceptance',blockedExternalRequests:0,localBackendRequests:0,uncaughtErrors:[],failedBackendRequests:[],browserErrors:[],screens:[]};
 let server,denyProxy,browser,connection,sessionId,origin;const pending=new Map();let sequence=0;
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 function cdp(method,params={},sid=sessionId){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser operation timed out: '+method));},20000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});connection.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));});}
 const evaluate=async(expression)=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result?.value;};
 const text=()=>evaluate('document.body.innerText');
 const wait=async(predicate,message)=>{for(let i=0;i<100;i++){assert.equal(evidence.uncaughtErrors.length,0,'Uncaught browser error: '+evidence.uncaughtErrors.join(';'));if(await predicate())return;await delay(200);}throw Error(message+'; visible text: '+String(await text()).slice(-3000));};
 async function press(label){
  const point=await evaluate(`(()=>{const matches=[...document.querySelectorAll('button,[role=button],[tabindex="0"]')].filter(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}||e.innerText?.trim()===${JSON.stringify(label)}||[...e.querySelectorAll('*')].some(c=>!c.children.length&&c.textContent?.trim()===${JSON.stringify(label)})).sort((a,b)=>(a.innerText?.length||0)-(b.innerText?.length||0));const e=matches.find(e=>e.getBoundingClientRect().width>0);if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  assert.ok(point,'Visible interactive control not found: '+label);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 }
 async function fill(selector,value){const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.focus();return true;})()`);assert.ok(point,'Input not found: '+selector);await cdp('Input.insertText',{text:value});}
 try{
  server=http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(file===root)file=path.join(root,'index.html');if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  // Also block uncaptured popups/workers at the browser's network boundary.
  denyProxy=http.createServer((_req,res)=>{evidence.blockedExternalRequests++;res.writeHead(403).end();});
  denyProxy.on('connect',(_req,socket)=>{evidence.blockedExternalRequests++;socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');});
  await new Promise(r=>denyProxy.listen(0,'127.0.0.1',r));
  const binary=process.env.GOODIES_BROWSER_BIN||['google-chrome','chromium','chromium-browser'].map(name=>spawnSync('which',[name],{encoding:'utf8'})).find(r=>r.status===0)?.stdout.trim();assert.ok(binary,'Chrome/Chromium is required');
  const browserEnv={...process.env};for(const k of Object.keys(browserEnv))if(/TOKEN|SECRET|PASSWORD|DATABASE_URL|SERVICE_ROLE/.test(k))delete browserEnv[k];
  browser=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--proxy-server=http://127.0.0.1:'+denyProxy.address().port,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+path.join(state,'profile'),'about:blank'],{env:browserEnv,stdio:['ignore','ignore','pipe'],detached:true});
  let stderr='';browser.stderr.on('data',c=>stderr=(stderr+c).slice(-4096));
  let ws;const portFile=path.join(state,'profile','DevToolsActivePort');
  for(let i=0;i<300&&!ws;i++){
   assert.equal(browser.exitCode,null,'Browser exited before exposing its controller');
   if(fs.existsSync(portFile)){const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split('\n');if(/^\d+$/.test(port)&&/^\/devtools\/browser\/[a-z0-9-]+$/i.test(endpoint||''))ws='ws://127.0.0.1:'+port+endpoint;}
   ws??=stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[a-z0-9-]+)/i)?.[1];if(!ws)await delay(100);
  }assert.ok(ws,'Browser local controller unavailable ('+browser.exitCode+'/'+browser.signalCode+'): '+stderr.slice(-1200));
  connection=new WebSocket(ws);await new Promise((resolve,reject)=>{connection.addEventListener('open',resolve,{once:true});connection.addEventListener('error',()=>reject(Error('Browser connection failed')),{once:true});});
  connection.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}return;}
   if(m.method==='Runtime.exceptionThrown')evidence.uncaughtErrors.push((m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,500));
   if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')evidence.browserErrors.push(redact(m.params.args.map(a=>a.value??a.description??'').join(' ')).slice(0,700));
   if(m.method==='Fetch.requestPaused')void(async()=>{
    const p=m.params,u=new URL(p.request.url);
    if(u.origin===origin){await cdp('Fetch.continueRequest',{requestId:p.requestId},m.sessionId);return;}
    if(u.origin!==productionOrigin){evidence.blockedExternalRequests++;await cdp('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'},m.sessionId);return;}
    // Fulfil from real local services. Never continue this request to production.
    evidence.localBackendRequests++;const headers={...p.request.headers,apikey:anonKey};delete headers.Host;delete headers.host;
    for(const key of Object.keys(headers))if(key.toLowerCase()==='authorization'&&headers[key].startsWith('Bearer sb_publishable_'))headers[key]='Bearer '+anonKey;
    let response;
    if(p.request.method==='OPTIONS')response=new Response(null,{status:204});
    else response=await fetch(base+u.pathname+u.search,{method:p.request.method,headers,...(['GET','HEAD'].includes(p.request.method)?{}:{body:p.request.postData}),redirect:'error',signal:AbortSignal.timeout(15000)});
    if(response.status>=400)evidence.failedBackendRequests.push({method:p.request.method,path:u.pathname,status:response.status});
    const bytes=Buffer.from(await response.arrayBuffer()),responseHeaders=[...response.headers].filter(([k])=>!['content-encoding','content-length','access-control-allow-origin','access-control-allow-headers'].includes(k)).map(([name,value])=>({name,value}));
    responseHeaders.push({name:'access-control-allow-origin',value:origin},{name:'access-control-allow-headers',value:'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept-profile,content-profile'});
    await cdp('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:response.status,responseHeaders,body:bytes.toString('base64')},m.sessionId);
   })().catch(error=>{evidence.browserErrors.push(redact('Local request transport: '+error.message).slice(0,500));void cdp('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'},m.sessionId).catch(()=>{});});
  });
  const target=await cdp('Target.createTarget',{url:'about:blank'},null);sessionId=(await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['wss://*','ws://ycbirmgppwavorwudlrv.supabase.co/*']});await cdp('Fetch.enable',{patterns:[{urlPattern:'*'}]});await cdp('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true});
  await cdp('Page.navigate',{url:origin});
  await scenario('Real exported customer login authenticates through the isolated local backend',async()=>{await wait(()=>evaluate('Boolean(document.querySelector("input[type=password]"))'),'Sign-in page did not mount');await fill('input[placeholder="Email"]',actors.customer.email);await fill('input[type=password]',actors.customer.password);await press('Sign in');await wait(async()=>!(await evaluate('Boolean(document.querySelector("input[type=password]"))')),'Customer login did not complete');assert.ok(evidence.localBackendRequests>0);});
  await scenario('Actual home carousel opens Goodies without leaving the real app shell',async()=>{await wait(async()=>(await text()).includes('Goodies'),'Home carousel missing Goodies');await press('Goodies');await wait(async()=>(await text()).includes('Groceries')&&(await text()).includes('Drugstore')&&!(await text()).includes('Woulib'),'Goodies did not open');evidence.screens.push({name:'Goodies home',classification:'PASS'});});
  evidence.classification='PASS';
 }catch(error){evidence.classification='FAIL';console.error(redact(JSON.stringify({failedBackendRequests:evidence.failedBackendRequests,browserErrors:evidence.browserErrors.slice(-12)})));throw error;}finally{
  if(connection?.readyState===WebSocket.OPEN)await Promise.race([cdp('Browser.close',{},null).catch(()=>{}),delay(1500)]);for(const p of pending.values())p.reject(Error('Browser acceptance ended'));pending.clear();connection?.close();
  if(browser?.pid){try{process.kill(-browser.pid,'SIGTERM');}catch{}await delay(200);try{process.kill(-browser.pid,'SIGKILL');}catch{}}
  for(const listener of [server,denyProxy])if(listener){listener.closeAllConnections();await new Promise(r=>listener.close(r));}fs.rmSync(state,{recursive:true,force:true,maxRetries:10,retryDelay:100});
 }
};
