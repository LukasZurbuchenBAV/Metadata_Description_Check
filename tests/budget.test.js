import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBudget} from '../src/validation.js';
import {CONTEXT_WINDOW_SIZE, CHAT_TEMPLATE_RESERVE, ANALYSIS_MAX_TOKENS, GENERATION_MAX_TOKENS} from '../src/config.js';

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
