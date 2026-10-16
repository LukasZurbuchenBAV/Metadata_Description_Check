import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBudget} from '../src/validation.js';

const code=readFileSync(new URL('../src/inference-worker.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
async function generate(mode){
  const requests=[],replies=[];
  const self={postMessage:message=>replies.push(message)};
  const context=vm.createContext({self,performance,checkBudget,fakeEngine:{chat:{completions:{create:async request=>{
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
  const context=vm.createContext({self,performance,checkBudget,fakeEngine:{chat:{completions:{create:async()=>{
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
