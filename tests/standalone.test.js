import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('standalone HTML is reproducibly generated from the maintained modules',()=>{
  execFileSync('python3',['scripts/build.py','--check'],{cwd:new URL('..',import.meta.url)});
});
test('standalone HTML needs no sibling stylesheets, scripts or module imports',()=>{
  assert.equal(/<script\b[^>]*\bsrc=/i.test(html),false);
  assert.equal(/<link\b[^>]*rel=["']stylesheet/i.test(html),false);
  const javascript=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(()=>new vm.Script(javascript));
  assert.equal(javascript.includes('import.meta'),false);
  assert.equal(/^\s*(?:import|export)\s/m.test(javascript),false);
});
test('embedded worker is a classic script with only an on-demand remote module import',()=>{
  const encoded=html.match(/^const STANDALONE_WORKER_SOURCE = (.*);$/m)[1];
  const worker=JSON.parse(encoded);
  assert.doesNotThrow(()=>new vm.Script(worker));
  assert.equal(/^\s*(?:import|export)\s/m.test(worker),false);
  assert.ok(worker.includes('await import(WEBLLM_URL)'));
  assert.equal(worker.includes('response_format:'),false);
});
