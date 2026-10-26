import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {resolve, extname, sep} from 'node:path';

const executable = process.env.CHROME_PATH;
const root = resolve(import.meta.dirname, '../..');
const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));

class CDP {
  pending = new Map();
  listeners = new Map();
  next = 0;
  async connect(url){
    this.socket = new WebSocket(url);
    await new Promise((resolve,reject)=>{ this.socket.onopen=resolve; this.socket.onerror=reject; });
    this.socket.onmessage = ({data})=>{
      const message=JSON.parse(data);
      if(message.id){
        const pending=this.pending.get(message.id);
        if(!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if(message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
      }else this.listeners.get(message.method)?.(message.params);
    };
  }
  send(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.next;
      const timer=setTimeout(()=>{ this.pending.delete(id); reject(new Error(`Timed out: ${method}`)); },10_000);
      this.pending.set(id,{resolve,reject,timer});
      this.socket.send(JSON.stringify({id,method,params}));
    });
  }
  async evaluate(expression){
    const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async until(expression){
    for(let attempt=0;attempt<100;attempt++){
      if(await this.evaluate(expression)) return;
      await sleep(30);
    }
    throw new Error(`Condition not reached: ${expression}`);
  }
}

for(const transport of ['http','file']) test(`${transport}: standalone app loads, supports keyboard tabs and recovers from inference failures`, {skip:!executable,timeout:60_000}, async t=>{
  const server=createServer(async (request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/preview(?=\/)/,'');
      const path=resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
      if(!path.startsWith(root+sep)) throw new Error('outside root');
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
      const body=await readFile(path);
      response.writeHead(200,{'Content-Type':types[extname(path)] || 'application/octet-stream'});
      response.end(body);
    }catch{ response.writeHead(404); response.end(); }
  });
  if(transport === 'http') await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const profile=await mkdtemp(resolve(tmpdir(),'metafairy-browser-'));
  const standalone=await mkdtemp(resolve(tmpdir(),'MetaFairy standalone '));
  await writeFile(resolve(standalone,'index.html'),await readFile(resolve(root,'index.html')));
  const chrome=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',...(process.env.CI ? ['--no-sandbox'] : []),`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  const cdp=new CDP();
  t.after(async()=>{
    cdp.socket?.close();
    chrome.kill();
    if(transport === 'http'){
      server.closeAllConnections();
      await new Promise(resolve=>server.close(resolve));
    }
    await sleep(100);
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
    await rm(standalone,{recursive:true,force:true});
  });
  let port;
  // Ein kalter Chrome-Start auf CI-Runnern dauert gelegentlich über 5 s; bis zu 20 s warten.
  for(let attempt=0;attempt<400;attempt++){
    try{port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await sleep(50);}
  }
  assert.ok(port,'Chrome debugging endpoint started');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  await cdp.connect(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  const exceptions=[],requests=[];
  cdp.listeners.set('Runtime.exceptionThrown',event=>exceptions.push(event.exceptionDetails));
  cdp.listeners.set('Network.requestWillBeSent',event=>requests.push(event.request.url));
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__NativeWorker=Worker;
    window.__requests=[]; window.__mode='ok'; window.__response='Der Datensatz enthält Messwerte.';
    Object.defineProperty(navigator,'gpu',{value:{requestAdapter:async()=>({features:new Set(['shader-f16'])})}});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.__copyFails) throw new Error('denied');window.__copied=text;}}});
    window.Worker=class {
      constructor(url){window.__workerURL=url;}
      addEventListener(){}
      postMessage(message){
        window.__requests.push(message);
        if(message.type==='cancel'){clearTimeout(this.timer);this.onmessage({data:{id:message.id,type:'error',error:'CANCELLED'}});return;}
        if(window.__mode==='stall') return;
        this.timer=setTimeout(()=>this.onmessage({data:{id:message.id,type:window.__mode==='error'?'error':'done',error:window.__error||'WORKER_ERROR',value:message.type==='generate'?{text:window.__response,cut:window.__cut||false}:undefined}}),100);
      }
      terminate(){clearTimeout(this.timer);}
    };
  `});
  const url=transport === 'http' ? `http://127.0.0.1:${server.address().port}/preview/` : pathToFileURL(resolve(standalone,'index.html')).href;
  const origin=transport === 'http' ? new URL(url).origin : 'file:';
  await cdp.send('Page.navigate',{url});
  await cdp.until(`document.getElementById('loadBtn') && !document.getElementById('loadBtn').disabled`);
  assert.equal(requests.some(url=>/^https?:/.test(url)&&!url.startsWith(origin)),false,'no external downloads on page load');
  await cdp.evaluate(`document.getElementById('analyzeTab').focus()`);
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
  assert.equal(await cdp.evaluate(`document.activeElement.id`),'generateTab');
  assert.equal(await cdp.evaluate(`document.getElementById('tab-generate').hidden`),false);
  assert.equal(await cdp.evaluate(`document.getElementById('generateTab').getAttribute('aria-selected')`),'true');
  await cdp.evaluate(`document.getElementById('loadBtn').click()`);
  await cdp.until(`!document.getElementById('generateBtn').disabled`);
  await cdp.evaluate(`document.getElementById('generateBtn').click()`);
  assert.match(await cdp.evaluate(`document.getElementById('result').textContent`),/mindestens/);
  assert.equal(await cdp.evaluate(`__requests.filter(r=>r.type==='generate').length`),0);
  await cdp.evaluate(`document.getElementById('content').value='ä'.repeat(2250)+'x';document.getElementById('content').dispatchEvent(new Event('input'));document.getElementById('generateBtn').click()`);
  assert.match(await cdp.evaluate(`document.getElementById('generationBudget').textContent`),/4501 \/ 4500/);
  assert.match(await cdp.evaluate(`document.getElementById('result').textContent`),/4500/);
  assert.equal(await cdp.evaluate(`__requests.filter(r=>r.type==='generate').length`),0,'oversize metadata never reaches inference');
  await cdp.evaluate(`document.getElementById('content').value='Messwerte';document.getElementById('generateBtn').click()`);
  for(const id of ['loadBtn','analyzeBtn','generateBtn','lang']) assert.equal(await cdp.evaluate(`document.getElementById('${id}').disabled`),true,id);
  await cdp.until(`document.querySelector('#result button') !== null`);
  await cdp.evaluate(`window.__copyFails=true;document.querySelector('#result button').click()`);
  await cdp.until(`document.querySelector('#result button').textContent.includes('fehlgeschlagen')`);
  await cdp.evaluate(`window.__copyFails=false;document.querySelector('#result button').click()`);
  await cdp.until(`window.__copied === 'Der Datensatz enthält Messwerte.'`);
  await cdp.evaluate(`window.__cut=true;document.getElementById('generateBtn').click()`);
  await cdp.until(`!document.getElementById('generateBtn').disabled`);
  assert.equal(await cdp.evaluate(`document.querySelector('#result button') === null`),true,'no copy action for truncated text');
  await cdp.evaluate(`window.__cut=false;window.__mode='stall';document.getElementById('generateBtn').click();document.getElementById('cancelBtn').click()`);
  await cdp.until(`!document.getElementById('generateBtn').disabled`);
  assert.equal(await cdp.evaluate(`document.getElementById('result').textContent`),'Abgebrochen.');
  await cdp.evaluate(`
    window.__mode='ok';
    window.__response=['titel','zweck','inhalt','erhebung','vollstaendigkeit','interpretation','raeumlicherbezug'].map(tag=>
      '<'+tag+'>Teilweise &lt;test&gt;.</'+tag+'><'+tag+'-beleg>'+(tag==='titel'?'Test &amp; Werte &lt; 5':tag==='vollstaendigkeit'?'jährlich aktualisiert':'none')+'</'+tag+'-beleg><'+tag+'-tipp>Abdeckung ergänzen.</'+tag+'-tipp><'+tag+'-score>2</'+tag+'-score>'
    ).join('');
    document.getElementById('analyzeTab').click();
    document.getElementById('analyzeTitle').value='Test & Werte < 5';
    document.getElementById('existing').value='Die Daten werden jährlich aktualisiert.';
    document.getElementById('analyzeBtn').click();
    document.getElementById('existing').value='Ein anderer Text.';
  `);
  await cdp.until(`!document.getElementById('analyzeBtn').disabled`);
  assert.equal(await cdp.evaluate(`document.querySelectorAll('#result .cat')[4].querySelector('.score').textContent`),'2/5');
  assert.match(await cdp.evaluate(`document.querySelectorAll('#result .cat')[4].textContent`),/jährlich aktualisiert/,'evidence uses the submitted source snapshot');
  assert.match(await cdp.evaluate(`document.querySelector('#result .cat').textContent`),/Fundstelle: «Test & Werte < 5»/);
  assert.match(await cdp.evaluate(`document.querySelector('#result .cat').textContent`),/Teilweise <test>\./);
  assert.equal(await cdp.evaluate(`document.querySelector('#result .cat test')`),null,'decoded XML stays text');
  await cdp.evaluate(`
    window.__response='<NAME-beleg>Test</NAME-beleg><NAME>Bewertung.</NAME><NAME-tipp>Prüfen.</NAME-tipp><NAME-score>5</NAME-score>';
    window.__beforeRetry=__requests.filter(request=>request.type==='generate').length;
    document.getElementById('analyzeBtn').click();
  `);
  await cdp.until(`!document.getElementById('analyzeBtn').disabled`);
  assert.equal(await cdp.evaluate(`__requests.filter(request=>request.type==='generate').length - __beforeRetry`),2);
  assert.equal(await cdp.evaluate(`document.querySelectorAll('#result .cat').length`),0);
  assert.match(await cdp.evaluate(`document.getElementById('result').textContent`),/keinem Kriterium zugeordnet/);
  assert.equal(await cdp.evaluate(`document.querySelector('#result details').open`),true,'unparseable analysis immediately exposes raw output');
  await cdp.evaluate(`window.__mode='error';window.__error='RUNTIME_ABORTED';document.getElementById('analyzeBtn').click()`);
  await cdp.until(`!document.getElementById('loadBtn').disabled`);
  assert.match(await cdp.evaluate(`document.getElementById('result').textContent`),/Laufzeit ist abgestürzt/);
  assert.match(await cdp.evaluate(`document.getElementById('resultStatus').textContent`),/fehlgeschlagen/);
  assert.equal(await cdp.evaluate(`document.getElementById('analyzeBtn').disabled`),true);
  assert.equal(await cdp.evaluate(`document.getElementById('existing').value`),'Ein anderer Text.');
  await cdp.evaluate(`window.__mode='ok';window.__error='';document.getElementById('loadBtn').click()`);
  await cdp.until(`!document.getElementById('generateBtn').disabled`);
  await cdp.evaluate(`window.__mode='error';document.getElementById('loadBtn').click()`);
  await cdp.until(`!document.getElementById('loadBtn').disabled`);
  assert.equal(await cdp.evaluate(`document.getElementById('generateBtn').disabled`),true);
  assert.match(await cdp.evaluate(`document.getElementById('status').textContent`),/Fehler beim Laden/);
  await cdp.evaluate(`window.__mode='ok';document.getElementById('loadBtn').click()`);
  await cdp.until(`!document.getElementById('generateBtn').disabled`);
  await cdp.evaluate(`document.getElementById('lang').value='fr';document.getElementById('lang').dispatchEvent(new Event('change'))`);
  assert.equal(await cdp.evaluate(`document.documentElement.lang`),'fr');
  assert.match(await cdp.evaluate(`document.getElementById('generateBtn').textContent`),/Générer/);
  assert.match(await cdp.evaluate(`document.getElementById('generationBudget').textContent`),/octets UTF-8/);
  // Exercise the actual embedded worker without local module requests or a model download.
  assert.equal(await cdp.evaluate(`new Promise((resolve,reject)=>{const w=new __NativeWorker(window.__workerURL);w.onmessage=e=>{w.terminate();resolve(e.data.error)};w.onerror=e=>{w.terminate();reject(new Error(e.message))};w.postMessage({id:1,type:'unknown'});})`),'WORKER_ERROR');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  assert.equal(await cdp.evaluate(`document.documentElement.scrollWidth <= window.innerWidth`),true,'mobile layout fits viewport');
  assert.deepEqual(exceptions,[],'no unhandled browser exceptions');
});
