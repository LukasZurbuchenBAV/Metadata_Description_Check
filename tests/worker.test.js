import {TEMPERATURE} from '../src/config.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBudget} from '../src/validation.js';

const code=readFileSync(new URL('../src/inference-worker.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
async function generate(mode, temperature=TEMPERATURE){
  const requests=[],replies=[];
  const self={postMessage:message=>replies.push(message)};
  const context=vm.createContext({self,performance,checkBudget,TEMPERATURE:temperature,fakeEngine:{chat:{completions:{create:async request=>{
    requests.push(request);
    return (async function*(){yield {choices:[{delta:{content:'response'},finish_reason:'stop'}]};})();
  }}}}});
  vm.runInContext(code,context);
  vm.runInContext('engine=fakeEngine;',context);
  await self.onmessage({data:{id:1,type:'generate',mode,messages:[{role:'user',content:'test'}],maxTokens:1700}});
  assert.equal(replies.at(-1).type,'done');
  return requests[0];
}
test('analysis avoids the unsafe XGrammar response_format path',async()=>{
  const request=await generate('analysis');
  assert.equal(request.response_format,undefined);
  assert.equal(request.extra_body.enable_thinking,false);
});
test('description generation remains unconstrained prose',async()=>{
  const request=await generate('text');
  assert.equal(request.response_format,undefined);
});

test('a native WASM abort is reported as fatal, not as a completed response',async()=>{
  const replies=[];
  const self={postMessage:message=>replies.push(message)};
  const context=vm.createContext({self,performance,checkBudget,TEMPERATURE,fakeEngine:{chat:{completions:{create:async()=>{
    throw new WebAssembly.RuntimeError('Aborted(). Build with -sASSERTIONS for more info.');
  }}}}});
  vm.runInContext(code,context);
  vm.runInContext('engine=fakeEngine;',context);
  await self.onmessage({data:{id:1,type:'generate',mode:'analysis',messages:[{role:'user',content:'test'}],maxTokens:1700}});
  assert.equal(replies.length,1);
  assert.equal(replies[0].type,'error');
  assert.equal(replies[0].error,'RUNTIME_ABORTED');
  assert.match(replies[0].detail,/Aborted/);
});

test('sampling uses the configured temperature rather than a fixed value',async()=>{
  const request=await generate('analysis',0.7);
  assert.equal(request.temperature,0.7);
});

// Only the downloaded GPU engine is substituted; run the real worker handler and
// async stream consumer, including overlapping messages while a stream is open.
function streamingWorker(chunks){
  const replies=[];
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const self={postMessage:message=>replies.push(message)};
  const fakeEngine={
    interruptGenerate(){release();},
    chat:{completions:{create:async()=>chunks(gate)}}
  };
  const context=vm.createContext({self,performance:{now:()=>200},checkBudget,TEMPERATURE,fakeEngine});
  vm.runInContext(code,context);
  vm.runInContext('engine=fakeEngine;',context);
  return {replies,release,send:data=>self.onmessage({data})};
}
const generation=id=>({id,type:'generate',mode:'text',messages:[{role:'user',content:'Messwerte'}],maxTokens:700});

test('stream chunks form the final answer, hide thinking and propagate truncation',async()=>{
  const worker=streamingWorker(async function*(){
    yield {choices:[{delta:{content:'<thi'}}]};
    yield {choices:[{delta:{content:'nk>private reasoning</think>Der Daten'}}]};
    yield {choices:[{delta:{content:'satz enthält Messwerte.'}}]};
    yield {choices:[{delta:{},finish_reason:'length'}]};
  });
  await worker.send(generation(42));
  const terminal=worker.replies.filter(message=>message.type!=='progress');
  assert.equal(terminal.length,1);
  assert.equal(terminal[0].id,42);
  assert.equal(terminal[0].type,'done');
  assert.equal(terminal[0].value.text,'Der Datensatz enthält Messwerte.');
  assert.equal(terminal[0].value.cut,true);
});

test('cancel interrupts an open stream, rejects overlap and releases the worker for reuse',async()=>{
  let entered;
  const started=new Promise(resolve=>{entered=resolve;});
  const worker=streamingWorker(async function*(gate){
    entered();
    await gate;
    yield {choices:[{delta:{content:'Late answer.'},finish_reason:'stop'}]};
  });
  const first=worker.send(generation(1));
  await started;
  await worker.send(generation(2));
  await worker.send({id:1,type:'cancel'});
  await first;
  assert.equal(worker.replies.find(message=>message.id===2).error,'BUSY');
  const cancelled=worker.replies.filter(message=>message.id===1);
  assert.equal(cancelled.length,1);
  assert.equal(cancelled[0].type,'error');
  assert.equal(cancelled[0].error,'CANCELLED');
  await worker.send(generation(3));
  const result=worker.replies.at(-1);
  assert.equal(result.id,3);
  assert.equal(result.type,'done');
  assert.equal(result.value.text,'Late answer.');
  assert.equal(result.value.cut,false);
});

test('a stream failure after partial output reports an error without a successful answer',async()=>{
  const worker=streamingWorker(async function*(){
    yield {choices:[{delta:{content:'Partial answer'}}]};
    throw new Error('device lost');
  });
  await worker.send(generation(7));
  assert.equal(worker.replies.some(message=>message.type==='progress'),true);
  assert.equal(worker.replies.some(message=>message.type==='done'),false);
  assert.equal(worker.replies.at(-1).id,7);
  assert.equal(worker.replies.at(-1).error,'device lost');
});

test('a stale cancellation leaves the current stream intact',async()=>{
  let entered;
  const started=new Promise(resolve=>{entered=resolve;});
  const worker=streamingWorker(async function*(gate){
    entered();
    await gate;
    yield {choices:[{delta:{content:'Current answer.'},finish_reason:'stop'}]};
  });
  const request=worker.send(generation(8));
  await started;
  await worker.send({id:7,type:'cancel'});
  worker.release();
  await request;
  assert.equal(worker.replies.at(-1).type,'done');
  assert.equal(worker.replies.at(-1).value.text,'Current answer.');
});
