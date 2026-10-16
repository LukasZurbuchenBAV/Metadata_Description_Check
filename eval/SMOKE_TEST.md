# Historical analysis-format smoke test — 2026-10-16

This records the initial grammar-based fix, not the current decoding path. A later
user report exposed a native WASM abort, consistent with upstream WebLLM #807.
The application now avoids XGrammar and retains explicit prompts and strict
post-generation validation. The successful run below did not establish grammar
compatibility across devices or repeated sessions.

A real WebGPU run checked the reported `Alpenquerender Verkehr` input from
`tests/fixtures/analysis-placeholder.json` after the analysis-format fix.

- Qwen3-4B-q4f16_1-MLC, WebLLM 0.2.80, temporary headless Chrome profile on Apple WebGPU.
- Actual model download and inference; no simulated model response.
- App's 1700-token output limit, constrained XML grammar and maximum two attempts.
- Final response contained all seven named criteria and all 28 required fields,
  with valid scores and no output truncation. No literal `<NAME>` elements.
- Six evidence passages matched the input. The spatial passage was paraphrased
  and remained unverified by the existing exact-quote check. It was not silently
  accepted or used to alter the model's score.

This checks decoder compatibility and the reported empty-result failure. It is
not a full multilingual evaluation or evidence that the model's assessments and
scores are calibrated. In this run the model still assigned every criterion 5/5;
those were model outputs, not application-imposed scores.

## Compatibility fix: repeated normal-decoding test — 2026-10-16

After removing XGrammar, three consecutive analyses used the same loaded Qwen3-4B
model in one temporary Chrome/WebGPU session. The reported input was reused,
with the app's normal text decoding, strict validation and at most one corrective
retry per analysis. No native abort occurred.

| Analysis | Complete criteria | Verified quotes | Truncated |
| --- | --- | --- | --- |
| 1 | 7/7 | 6/7 | No |
| 2 | 7/7 | 7/7 | No |
| 3 | 7/7 | 7/7 | No |

The first final response retained one unverified quote; the application continues
to flag such passages rather than weakening the quote check. These three runs
check repeated-use compatibility on the tested Apple WebGPU environment, not a
guarantee for every browser/GPU or evidence of scoring accuracy.
