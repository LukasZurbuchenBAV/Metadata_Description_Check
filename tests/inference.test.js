import test from 'node:test';
import assert from 'node:assert/strict';
import {InferenceClient} from '../src/inference.js';

class FakeWorker {
  messages = [];
  terminated = false;
  postMessage(message){ this.messages.push(message); }
  terminate(){ this.terminated = true; }
  reply(type,value,id=this.messages.at(-1).id){ this.onmessage({data:{id,type,value}}); }
}
async function loaded(options={}){
  const worker=new FakeWorker();
  const client=new InferenceClient({workerFactory:()=>worker,...options});
  const promise=client.load(); worker.reply('done'); await promise;
  return {worker,client};
}
test('worker adapter streams progress, rejects overlaps and ignores stale replies',async()=>{
  const {worker,client}=await loaded();
  const progress=[];
  const request=client.generate([],700,text=>progress.push(text));
  await assert.rejects(client.generate([],700),/BUSY/);
  worker.reply('done',{text:'stale'},0);
  worker.reply('progress','partial');
  worker.reply('done',{text:'complete',cut:false});
  assert.equal((await request).text,'complete');
  assert.deepEqual(progress,['partial']);
  client.unload();
});
test('worker errors reject pending requests and a fresh worker can generate',async t=>{
  const workers=[];
  const client=new InferenceClient({workerFactory:()=>{const worker=new FakeWorker();workers.push(worker);return worker;}});
  t.after(()=>client.unload());
  const initial=client.load(); workers[0].reply('done'); await initial;
  const request=client.generate([],700);
  workers[0].onerror({preventDefault(){}});
  await assert.rejects(request,/WORKER_ERROR/);
  assert.equal(workers[0].terminated,true);
  await assert.rejects(client.generate([],700),/MODEL_NOT_READY/);
  const reloaded=client.load(); workers[1].reply('done'); await reloaded;
  const next=client.generate([],700);
  workers[1].reply('done',{text:'Recovered answer.',cut:false});
  assert.deepEqual(await next,{text:'Recovered answer.',cut:false});
});
test('load cancellation terminates downloads and releases the request',async()=>{
  const worker=new FakeWorker();
  const client=new InferenceClient({workerFactory:()=>worker});
  const request=client.load(); client.cancel();
  await assert.rejects(request,/CANCELLED/);
  assert.equal(worker.terminated,true);
  assert.equal(client.ready,false);
});
test('graceful generation cancellation preserves the loaded model',async()=>{
  const {worker,client}=await loaded();
  const request=client.generate([],700);
  const id=worker.messages.at(-1).id;
  client.cancel();
  assert.deepEqual(worker.messages.at(-1),{id,type:'cancel'});
  worker.onmessage({data:{id,type:'error',error:'CANCELLED'}});
  await assert.rejects(request,/CANCELLED/);
  assert.equal(client.ready,true);
  client.unload();
});
test('cancellation has a fixed deadline despite progress and repeated cancel calls',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {worker,client}=await loaded({timeoutMs:1000,cancelTimeoutMs:100});
  t.after(()=>client.unload());
  const progress=[];
  const request=client.generate([],700,text=>progress.push(text));
  const rejected=assert.rejects(request,/CANCELLED/);
  client.cancel();
  t.mock.timers.tick(60);
  worker.reply('progress','late');
  client.cancel();
  t.mock.timers.tick(39);
  assert.equal(worker.terminated,false);
  t.mock.timers.tick(1);
  await rejected;
  assert.deepEqual(progress,[]);
  assert.equal(worker.terminated,true);
  await assert.rejects(client.generate([],700),/MODEL_NOT_READY/);
});
test('progress resets the inactivity deadline; completion clears it',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {worker,client}=await loaded({timeoutMs:100});
  t.after(()=>client.unload());
  const request=client.generate([],700);
  t.mock.timers.tick(80);
  worker.reply('progress','partial');
  t.mock.timers.tick(80);
  assert.equal(worker.terminated,false);
  worker.reply('done',{text:'complete',cut:false});
  assert.deepEqual(await request,{text:'complete',cut:false});
  t.mock.timers.tick(1000);
  assert.equal(worker.terminated,false);
  const next=client.generate([],700);
  const rejected=assert.rejects(next,/WORKER_TIMEOUT/);
  t.mock.timers.tick(99);
  assert.equal(worker.terminated,false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(worker.terminated,true);
  await assert.rejects(client.generate([],700),/MODEL_NOT_READY/);
});
test('a completed reply after cancel is rejected and the model can generate again',async t=>{
  const {worker,client}=await loaded();
  t.after(()=>client.unload());
  const request=client.generate([],700);
  client.cancel();
  worker.reply('done',{text:'must not escape',cut:false});
  await assert.rejects(request,/CANCELLED/);
  const next=client.generate([],700);
  worker.reply('done',{text:'new result',cut:false});
  assert.deepEqual(await next,{text:'new result',cut:false});
});
test('old worker errors cannot terminate a replacement worker',async()=>{
  const workers=[];
  const client=new InferenceClient({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;}});
  const first=client.load(); workers[0].reply('done'); await first;
  const second=client.load(); workers[0].onerror({}); workers[1].reply('done'); await second;
  assert.equal(client.ready,true);
  client.unload();
});

test('analysis decoding mode survives the client-to-worker boundary',async()=>{
  const {worker,client}=await loaded();
  const request=client.generate([],1700,undefined,'analysis');
  assert.equal(worker.messages.at(-1).mode,'analysis');
  worker.reply('done',{text:'analysis',cut:false});
  await request;
  client.unload();
});

test('a fatal runtime abort discards the worker and requires a fresh model load',async()=>{
  const {worker,client}=await loaded();
  const request=client.generate([],1700,undefined,'analysis');
  worker.onmessage({data:{id:worker.messages.at(-1).id,type:'error',error:'RUNTIME_ABORTED'}});
  await assert.rejects(request,/RUNTIME_ABORTED/);
  assert.equal(client.ready,false);
  assert.equal(worker.terminated,true);
  await assert.rejects(client.generate([],1700),/MODEL_NOT_READY/);
});
