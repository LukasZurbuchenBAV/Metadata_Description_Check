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

## Standalone file launch — 2026-10-16

The generated `index.html` was copied alone into a temporary directory with spaces
in its name and opened via `file://` in a fresh Chrome profile. The app needed
no server or Node.js/npm runtime, and used no sibling JavaScript files or stylesheet.

- The embedded classic Blob worker had a secure context, native WebGPU,
  working Cache Storage and IndexedDB access.
- The actual Qwen3-4B model downloaded and reached the ready state.
- A real analysis completed with seven result cards and seven scores.
- Input title: `Grundwasser`.
- Input description: `Der Datensatz enthält Nitratwerte im Kanton Bern. Das Wasseramt misst jährlich zum Gewässerschutz. Die Daten sind bis 2025 vollständig. Keine Aussage über die Trinkwasserqualität möglich.`

The development test harness controlled Chrome externally; it did not serve the
app or inject a simulated inference response. Separate automated UI tests cover
both an isolated file launch and an HTTP repository subpath. This records Chrome
verification; browser-specific WebGPU/model compatibility still applies elsewhere.

## Larger input allowance and cancellation recovery — 2026-10-16

A fresh headless Chrome profile used native Apple WebGPU and the actual downloaded
Qwen3-4B/WebLLM 0.2.80 runtime over localhost, with an explicit 8192-token context.
The updated runtime drains an interrupted stream so WebLLM releases its generation
lock. XML character references are decoded once before evidence verification.

- All six multilingual fixtures ran once in each mode (12 inferences), without
  native aborts, timeouts or output truncation. No corrective retries were used by
  the evaluation runner.
- All six generated descriptions passed format validation. Two of six analyses
  passed the full field/evidence validation on their first attempt; the other
  four remain invalid and must be flagged/retried by the application.
- Cancellation during streaming returned `CANCELLED`, retained the loaded model,
  and a subsequent generation on the same client completed successfully.
- A separate analysis with exactly 4500 UTF-8 bytes of metadata completed without
  truncation. This verifies the full advertised allowance in the actual runtime.
- Automated checks: 66 unit tests, both HTTP/file browser tests, reproducible HTML
  generation and whitespace checks passed. Browser regression tests also exercise
  encoded XML evidence, safe rendering and oversized-input rejection.

These are runtime and structural checks, not factual-quality guarantees. In the
cancellation-recovery generation, the model invented a source institution and a
coverage year despite sparse input. Format validation does not detect those
claims. The existing warning and manual review remain necessary; the larger
context and entity-decoding fix do not establish model calibration or factuality.
