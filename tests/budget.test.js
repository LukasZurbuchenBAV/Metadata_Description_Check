import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBudget, checkMetadataBudget, metadataBytes} from '../src/validation.js';
import {CONTEXT_WINDOW_SIZE, CHAT_TEMPLATE_RESERVE, ANALYSIS_MAX_TOKENS, GENERATION_MAX_TOKENS, METADATA_MAX_BYTES} from '../src/config.js';
import {ANALYZE_SYSTEM, ANALYZE_RETRY_SYSTEM, GENERATE_SYSTEM, analysisPrompt, generationPrompt, localizedSystem} from '../src/prompts.js';

// docs/runtime.md promises a UTF-8 byte bound, with template and answer reserves,
// and rejection rather than silent truncation. These strings have known byte sizes.
for(const maxTokens of [ANALYSIS_MAX_TOKENS,GENERATION_MAX_TOKENS]){
  test(`input budget accepts the exact limit and rejects one extra byte (${maxTokens} output tokens)`,()=>{
    const available=CONTEXT_WINDOW_SIZE-CHAT_TEMPLATE_RESERVE-maxTokens;
    const messages=[{role:'system',content:'ä'},{role:'user',content:'😀'+'x'.repeat(available-6)}];
    const original=structuredClone(messages);
    assert.equal(checkBudget(messages,maxTokens),available);
    assert.deepEqual(messages,original);
    messages[1].content+='x';
    const oversized=structuredClone(messages);
    assert.throws(()=>checkBudget(messages,maxTokens),/INPUT_TOO_LONG/);
    assert.deepEqual(messages,oversized,'rejected input must not be truncated');
  });
}

test('metadata allowance counts UTF-8 across fields and never truncates oversized input',()=>{
  const fields={title:' ä ',description:'😀'+'x'.repeat(METADATA_MAX_BYTES-6)};
  assert.equal(metadataBytes(fields),METADATA_MAX_BYTES);
  assert.doesNotThrow(()=>checkMetadataBudget(fields));
  fields.description+='x';
  const original=structuredClone(fields);
  assert.throws(()=>checkMetadataBudget(fields),/INPUT_TOO_LONG/);
  assert.deepEqual(fields,original);
});

test('the full advertised metadata allowance fits both modes and analysis retries in every language',()=>{
  for(const lang of ['de','fr','it']){
    // UTF-8 boundary, including multi-byte characters, and a missing title's label.
    const description='é'.repeat(METADATA_MAX_BYTES/2);
    for(const system of [ANALYZE_SYSTEM,ANALYZE_RETRY_SYSTEM]){
      assert.doesNotThrow(()=>checkBudget([
        {content:localizedSystem(system,lang)},
        {content:analysisPrompt({title:'',description})}
      ],ANALYSIS_MAX_TOKENS));
    }
    const fields={title:'T',purpose:'P',content:'C',source:'S',completeness:'V',interpretation:'I',spatial:'R'.repeat(METADATA_MAX_BYTES-6)};
    assert.equal(metadataBytes(fields),METADATA_MAX_BYTES);
    assert.doesNotThrow(()=>checkBudget([
      {content:localizedSystem(GENERATE_SYSTEM,lang)},
      {content:generationPrompt(fields,lang)}
    ],GENERATION_MAX_TOKENS));
  }
});
