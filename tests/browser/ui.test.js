import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
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

test('static app loads, supports keyboard tabs and recovers from inference failures', {skip:!executable,timeout:40_000}, async t=>{
  const server=createServer(async (request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      const path=resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
      if(!path.startsWith(root+sep)) throw new Error('outside root');
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
      const body=await readFile(path);
      response.writeHead(200,{'Content-Type':types[extname(path)] || 'application/octet-stream'});
      response.end(body);
    }catch{ response.writeHead(404); response.end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const profile=await mkdtemp(resolve(tmpdir(),'metafairy-browser-'));
  const chrome=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  const cdp=new CDP();
  t.after(async()=>{
    cdp.socket?.close();
    chrome.kill();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    await sleep(100);
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  });
  let port;
  for(let attempt=0;attempt<100;attempt++){
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
      postMessage(message){
        window.__requests.push(message);
        if(message.type==='cancel'){clearTimeout(this.timer);this.onmessage({data:{id:message.id,type:'error',error:'CANCELLED'}});return;}
        if(window.__mode==='stall') return;
        this.timer=setTimeout(()=>this.onmessage({data:{id:message.id,type:window.__mode==='error'?'error':'done',error:'WORKER_ERROR',value:message.type==='generate'?{text:window.__response,cut:window.__cut||false}:undefined}}),100);
      }
      terminate(){clearTimeout(this.timer);}
    };
  `});
  const url=`http://127.0.0.1:${server.address().port}/`;
  await cdp.send('Page.navigate',{url});
  await cdp.until(`document.getElementById('loadBtn') && !document.getElementById('loadBtn').disabled`);
  assert.equal(requests.some(url=>/^https?:/.test(url)&&!url.startsWith(`http://127.0.0.1:${server.address().port}/`)),false,'no external downloads on page load');
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
  await cdp.evaluate(`window.__mode='error';document.getElementById('loadBtn').click()`);
  await cdp.until(`!document.getElementById('loadBtn').disabled`);
  assert.equal(await cdp.evaluate(`document.getElementById('generateBtn').disabled`),true);
  assert.match(await cdp.evaluate(`document.getElementById('status').textContent`),/Fehler beim Laden/);
  await cdp.evaluate(`window.__mode='ok';document.getElementById('loadBtn').click()`);
  await cdp.until(`!document.getElementById('generateBtn').disabled`);
  await cdp.evaluate(`document.getElementById('lang').value='fr';document.getElementById('lang').dispatchEvent(new Event('change'))`);
  assert.equal(await cdp.evaluate(`document.documentElement.lang`),'fr');
  assert.match(await cdp.evaluate(`document.getElementById('generateBtn').textContent`),/Générer/);
  // Exercise the actual module worker and its imports without downloading a model.
  assert.equal(await cdp.evaluate(`new Promise((resolve,reject)=>{const w=new __NativeWorker(new URL('./src/inference-worker.js',location.href),{type:'module'});w.onmessage=e=>{w.terminate();resolve(e.data.error)};w.onerror=e=>{w.terminate();reject(new Error(e.message))};w.postMessage({id:1,type:'unknown'});})`),'WORKER_ERROR');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  assert.equal(await cdp.evaluate(`document.documentElement.scrollWidth <= window.innerWidth`),true,'mobile layout fits viewport');
  assert.deepEqual(exceptions,[],'no unhandled browser exceptions');
});
