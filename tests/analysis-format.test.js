import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ANALYZE_SYSTEM, ANALYZE_RETRY_SYSTEM, analysisPrompt, localizedSystem} from '../src/prompts.js';
import {ANALYSIS_TAGS, analysisIsBad, checkBudget} from '../src/validation.js';
import {ANALYSIS_MAX_TOKENS} from '../src/config.js';

const sample=JSON.parse(readFileSync(new URL('./fixtures/analysis-placeholder.json',import.meta.url)));
test('reported literal-placeholder response is rejected, never assigned to criteria by position',()=>{
  assert.equal(analysisIsBad(sample.raw,sample.source),true);
});
test('analysis prompts specify every literal field name without a substitution placeholder',()=>{
  for(const system of [ANALYZE_SYSTEM,ANALYZE_RETRY_SYSTEM]){
    assert.equal(system.includes('NAME'),false);
    for(const tag of ANALYSIS_TAGS){
      for(const suffix of ['', '-beleg', '-tipp', '-score']) assert.ok(system.includes(tag+suffix),tag+suffix);
    }
  }
});
test('reported example fits both initial and corrective instructions in every language',()=>{
  for(const lang of ['de','fr','it']){
    for(const system of [ANALYZE_SYSTEM,ANALYZE_RETRY_SYSTEM]){
      assert.doesNotThrow(()=>checkBudget([{content:localizedSystem(system,lang)},{content:analysisPrompt(sample.source)}],ANALYSIS_MAX_TOKENS));
    }
    // Changing only instructions on retry must never consume additional input budget.
    assert.ok(new TextEncoder().encode(localizedSystem(ANALYZE_RETRY_SYSTEM,lang)).length <= new TextEncoder().encode(localizedSystem(ANALYZE_SYSTEM,lang)).length);
  }
});
