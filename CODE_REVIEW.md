# Feature branch code review

What this change does: The branch splits the browser application into maintained modules while preserving a standalone `index.html`. It moves inference into a cancellable worker, strengthens input and response validation, preserves model scores, and adds automated tests, evaluation tooling, and CI.

## Scope

- Reviewed `fix/reliable-analysis-modular-app` at `792de2c` against the local `origin/main` merge base, `3e0482e24e4ebbbb509fe20a3bd111b0c04422ea` (37 changed files). Remote refs were not refreshed.
- Inspected application entry points, all `src/` modules, the HTML template and generated artifact, CSS, build script, package configuration, CI workflow, tests, evaluation fixtures/runner, and documentation. Compared changed behavior with the original inline application and traced relevant callers and safeguards.
- Prioritized request serialization, cancellation and recovery, worker lifetime and deadlines, context/input budgets, source-specific quotation verification, XML decoding, safe rendering, retries, language selection, clipboard behavior, and HTTP/file launch compatibility.
- Assumed the documented deployment: one interactive user per browser page, local GPU inference, and external software/model downloads. Applied the supplied pragmatic `AGENTS.md` instructions; no additional repository or ancestor `AGENTS.md` file was found.
- Source, tests, and configuration were left unchanged. This report is the only repository addition.

## Findings

**No actionable findings remain on the reviewed evidence.** No confirmed defect, evidenced material risk, or material maintenance issue met the reporting threshold. There are therefore no numbered findings or required fixes.

Severity distribution: **0 critical, 0 high, 0 medium, 0 low**.

The request guards protect actual application callers from overlapping work. Cancellation drains the interrupted stream and has a fixed deadline; fatal failures discard the worker. Evidence checks use the submitted source snapshot and correct source field, and rendering escapes decoded text. Invalid or truncated output remains visibly qualified, with copying restricted to valid, complete generated text.

### Small removal opportunity

The obsolete inference `mode` parameter can be removed from `src/app.js:146`, `src/inference.js:29–31,92–94`, and `eval/run.js:31`, together with assertions that only check its transport. `src/inference-worker.js` never reads `message.mode`; both tasks now use normal text decoding. This is a verified small simplification with no demonstrated defect or material impact, so it is outside the finding count. No broader rewrite or new dependency is justified.

## Validation

Environment: macOS, Node.js **v26.8.2**, Python **3.9.6**, installed Google Chrome.

| Command/check | Outcome |
| --- | --- |
| `npm test` | **66 passed**, no failures or skips; includes reproducible standalone build verification. |
| `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:browser` | **2 passed**, covering HTTP repository-subpath and isolated `file://` launches, keyboard tabs, simulated inference/recovery, budgets, escaping, clipboard handling, and an actual embedded worker start. |
| `python3 scripts/build.py --check` | Passed; checked-in HTML matches maintained sources. |
| `git ls-files '*.js' \| xargs -n 1 node --check` | Passed for tracked JavaScript. |
| `git diff --check origin/main...HEAD` | Passed. |
| `node --test tests/analysis.test.js tests/analysis-format.test.js tests/render.test.js tests/budget.test.js tests/evaluation.test.js` | Independent focused review: **26 passed**; overlaps the full suite. |
| `node --test tests/inference.test.js tests/worker.test.js tests/worker-loader.test.js tests/gpu.test.js tests/runtime.test.js` | Independent focused review: **37 passed**; overlaps the full suite. |

The initial sandboxed browser run failed because localhost listening was denied and Chrome's debugging endpoint could not start. The same suite passed after approved execution outside the sandbox; those initial failures do not establish application defects.

Read the exact pinned [WebLLM 0.2.80 package source](https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.80/lib/index.js) to cross-check context configuration, completion options, conversation reset, and cancellation/stream-lock behavior. Retrieval used `curl -fsSL --max-time 30 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.80/lib/index.js' -o /tmp/metafairy-review-webllm-0.2.80.js`; the initial sandboxed DNS failure was followed by a successful approved retry. No model was downloaded.

## Important uncertainties and unverified areas

- No fresh model download, physical GPU inference, or full multilingual model evaluation was performed. Browser tests simulate inference and GPU capability responses; their real worker check does not load WebLLM. Existing smoke-test records were inspected as historical evidence only.
- Model factuality, assessment quality, quotation relevance, and first-attempt reliability remain unverified in this review. `eval/SMOKE_TEST.md` already records invented facts and four invalid first-attempt analyses out of six. Format/evidence validation and user warnings address presentation and disclosure; they cannot establish factual accuracy.
- Minimum-supported Node.js 22, GitHub-hosted CI, live GitHub Pages deployment, Edge, other GPUs, cache eviction, and interrupted model downloads were not exercised. Local checks used Node.js 26 and Chrome.
- Remote library/model integrity and availability were not audited. The downloaded JavaScript was inspected for integration behavior only; model weights, WASM artifacts, and transitive downloads were not reviewed.

Verdict: Ship within the reviewed scope. Passing checks do not prove the absence of defects; the model and hardware limits above remain.
