import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ANALYSIS_GRAMMAR} from '../src/analysis-format.js';
import {checkBudget} from '../src/validation.js';

const code=readFileSync(new URL('../src/inference-worker.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
async function generate(mode){
  const requests=[],replies=[];
  const self={postMessage:message=>replies.push(message)};
  const context=vm.createContext({self,performance,ANALYSIS_GRAMMAR,checkBudget,fakeEngine:{chat:{completions:{create:async request=>{
    requests.push(request);
    return (async function*(){yield {choices:[{delta:{content:'response'},finish_reason:'stop'}]};})();
  }}}}});
  vm.runInContext(code,context);
  vm.runInContext('engine=fakeEngine;',context);
  await self.onmessage({data:{id:1,type:'generate',mode,messages:[{role:'user',content:'test'}],maxTokens:1700}});
  assert.equal(replies.at(-1).type,'done');
  return requests[0];
}
test('analysis requests enable constrained decoding with the literal XML grammar',async()=>{
  const request=await generate('analysis');
  assert.equal(request.response_format.type,'grammar');
  assert.equal(request.response_format.grammar,ANALYSIS_GRAMMAR);
  assert.equal(request.extra_body.enable_thinking,false);
});
test('description generation remains unconstrained prose',async()=>{
  const request=await generate('text');
  assert.equal(request.response_format,undefined);
});
