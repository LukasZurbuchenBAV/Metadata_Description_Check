import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ANALYSIS_TAGS, checkBudget, supported} from '../src/validation.js';
import {ANALYZE_SYSTEM, GENERATE_SYSTEM, analysisPrompt, generationPrompt, localizedSystem} from '../src/prompts.js';
import {ANALYSIS_MAX_TOKENS, GENERATION_MAX_TOKENS} from '../src/config.js';

const cases=JSON.parse(readFileSync(new URL('../eval/cases.json',import.meta.url)));
test('evaluation covers complete and sparse metadata in all three languages',()=>{
  assert.equal(cases.length,6);
  assert.equal(new Set(cases.map(c=>c.id)).size,6);
  for(const lang of ['de','fr','it']) assert.equal(cases.filter(c=>c.lang===lang).length,2);
});
for(const item of cases){
  test(`${item.id}: reference quotes are literal and both prompts fit the input budget`,()=>{
    assert.deepEqual(Object.keys(item.expectedEvidence),ANALYSIS_TAGS);
    for(const [tag,quote] of Object.entries(item.expectedEvidence)){
      if(quote !== null) assert.equal(supported(quote,tag==='titel'?item.title:item.description),true,tag);
    }
    for(const [system,prompt,maxTokens] of [
      [ANALYZE_SYSTEM,analysisPrompt(item),ANALYSIS_MAX_TOKENS],
      [GENERATE_SYSTEM,generationPrompt(item.generation,item.lang),GENERATION_MAX_TOKENS]
    ]) assert.doesNotThrow(()=>checkBudget([{content:localizedSystem(system,item.lang)},{content:prompt}],maxTokens));
  });
}
