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
  assert.notEqual(client.pending,null);
  worker.reply('progress','partial');
  worker.reply('done',{text:'complete',cut:false});
  assert.equal((await request).text,'complete');
  assert.deepEqual(progress,['partial']);
  client.unload();
});
test('module/import or worker errors reject pending requests and allow a fresh load',async()=>{
  const {worker,client}=await loaded();
  const request=client.generate([],700);
  worker.onerror({preventDefault(){}});
  await assert.rejects(request,/WORKER_ERROR/);
  assert.equal(client.ready,false);
  assert.equal(worker.terminated,true);
  const reloaded=client.load(); worker.reply('done'); await reloaded;
  assert.equal(client.ready,true);
  client.unload();
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
  const id=client.pending.id;
  client.cancel();
  assert.deepEqual(worker.messages.at(-1),{id,type:'cancel'});
  worker.onmessage({data:{id,type:'error',error:'CANCELLED'}});
  await assert.rejects(request,/CANCELLED/);
  assert.equal(client.ready,true);
  client.unload();
});
test('unresponsive cancellation times out even if late progress arrives',async()=>{
  const {worker,client}=await loaded({cancelTimeoutMs:10});
  const request=client.generate([],700);
  client.cancel(); worker.reply('progress','ignored');
  await assert.rejects(request,/CANCELLED/);
  assert.equal(worker.terminated,true);
  assert.equal(client.ready,false);
});
test('worker stalls terminate and reject instead of leaving controls busy',async()=>{
  const {worker,client}=await loaded({timeoutMs:10});
  await assert.rejects(client.generate([],700),/WORKER_TIMEOUT/);
  assert.equal(client.ready,false);
  assert.equal(worker.terminated,true);
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
  worker.onmessage({data:{id:client.pending.id,type:'error',error:'RUNTIME_ABORTED'}});
  await assert.rejects(request,/RUNTIME_ABORTED/);
  assert.equal(client.ready,false);
  assert.equal(worker.terminated,true);
  await assert.rejects(client.generate([],1700),/MODEL_NOT_READY/);
});
