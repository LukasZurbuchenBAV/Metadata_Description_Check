import {ANALYSIS_MAX_TOKENS, GENERATION_MAX_TOKENS} from './config.js';
import {message, LI, UI, PH, TITLES} from './i18n.js';
import {ANALYZE_SYSTEM, ANALYZE_RETRY_SYSTEM, GENERATE_SYSTEM, analysisPrompt, generationPrompt, localizedSystem} from './prompts.js';
import {analysisIsBad, generationIsBad, checkBudget} from './validation.js';
import {renderAnalysisXML, renderPlainText, attachCopy, escapeHtml} from './render.js';
import {InferenceClient, generateResponse} from './inference.js';
const loadBtn = document.getElementById('loadBtn');
const status = document.getElementById('status');
const progresswrap = document.getElementById('progresswrap');
const progressbar = document.getElementById('progressbar');
const analyzeBtn = document.getElementById('analyzeBtn');
const generateBtn = document.getElementById('generateBtn');
const resultEl = document.getElementById('result');

let engine = null, lang = 'de', modelReady = false, loading = false, gpuProblem = null, busy = false, cancelled = false, checking = true;

const m = key => message(key, lang);
const origText = new WeakMap();
function applyLang(){
  const L = LI[lang];
  document.documentElement.lang = lang;
  document.title = TITLES[L];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while((n = walker.nextNode())){
    if(n.parentElement.closest('script,style,option,#loadBtn,#status,#result,#resultStatus')) continue;
    if(!origText.has(n)) origText.set(n, n.nodeValue);
    const orig = origText.get(n), core = orig.trim();
    if(UI[core]) n.nodeValue = orig.replace(core, L === 0 ? core : UI[core][L-1]);
  }
  document.querySelectorAll('textarea[id],input[id]').forEach(el=>{
    if(!PH[el.id]) return;
    if(el.dataset.ph0 === undefined) el.dataset.ph0 = el.placeholder;
    el.placeholder = L === 0 ? el.dataset.ph0 : PH[el.id][L-1];
  });
  loadBtn.textContent = m('loadBtn');
  document.getElementById('cancelBtn').textContent = m('cancel');
  if(!loading && modelReady) status.textContent = m('ready');
  else if(!loading) status.textContent = gpuProblem ? m(gpuProblem) : m('hint');
}
const langSel = document.getElementById('lang');
function setLang(l){ lang = l; langSel.value = l; applyLang(); }
langSel.addEventListener('change', e=> setLang(e.target.value));
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab){
  tabs.forEach(item=>{
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    const panel = document.getElementById('tab-' + item.dataset.tab);
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click', ()=>activateTab(tab));
  tab.addEventListener('keydown', event=>{
    const next = {ArrowRight:(index+1)%tabs.length, ArrowLeft:(index+tabs.length-1)%tabs.length, Home:0, End:tabs.length-1}[event.key];
    if(next === undefined) return;
    event.preventDefault(); activateTab(tabs[next]); tabs[next].focus();
  });
});

async function checkWebGpuSupport(){
  if(!navigator.gpu) return 'noGpu';
  try{
    const adapter = await navigator.gpu.requestAdapter();
    if(!adapter) return 'noAdapter';
    if(!adapter.features.has('shader-f16')) return 'noF16';
  }catch(err){ return 'noCheck'; }
  return null;
}
applyLang();
(async ()=>{
  gpuProblem = await checkWebGpuSupport();
  checking = false;
  updateControls();
  applyLang();
})();

function errorText(error){
  const key = {INPUT_TOO_LONG:'budget', WORKER_ERROR:'workerErr', WORKER_TIMEOUT:'timeout', MODEL_NOT_READY:'first', CANCELLED:'cancelled'}[error.message];
  return key ? m(key) : error.message;
}
function updateControls(){
  loadBtn.disabled = checking || busy || loading || !!gpuProblem;
  analyzeBtn.disabled = generateBtn.disabled = busy || loading || !modelReady;
  langSel.disabled = busy || loading;
  document.getElementById('cancelBtn').hidden = !(busy || loading);
  resultEl.setAttribute('aria-busy', String(busy));
}
document.getElementById('cancelBtn').addEventListener('click', ()=>{
  cancelled = true;
  engine?.cancel();
});
loadBtn.addEventListener('click', async ()=>{
  if(checking || busy || loading || gpuProblem) return;
  loading = true; modelReady = false; cancelled = false;
  updateControls();
  progresswrap.style.display = 'block';
  progressbar.style.width = '0%';
  status.textContent = m('loading');
  try{
    engine?.unload();
    engine = new InferenceClient();
    await engine.load(p=>{
      const percent = Math.max(0, Math.min(100, Math.round((p.progress||0)*100)));
      progressbar.style.width = percent+'%';
      progresswrap.setAttribute('aria-valuenow', String(percent));
      status.textContent = p.text || m('loading');
    });
    modelReady = true;
    status.textContent = m('ready');
  }catch(err){
    engine?.unload();
    engine = null;
    status.textContent = cancelled ? m('cancelled') : m('loadErr') + errorText(err);
  }finally{
    loading = false;
    progresswrap.style.display = 'none';
    updateControls();
  }
});

async function run(userPrompt, systemPrompt, renderFn, opts){
  const requestLang = lang;
  const m = key=>message(key, requestLang);
  if(busy || loading) return;
  if(!modelReady || !engine){ resultEl.textContent = m('first'); return; }
  busy = true; cancelled = false;
  updateControls();
  const started = performance.now();
  systemPrompt = localizedSystem(systemPrompt, requestLang);
  const ask = async (prompt, instructions=systemPrompt) => {
    const messages = [{role:'system', content:instructions}, {role:'user', content:prompt}];
    checkBudget(messages, opts.maxTokens);
    return generateResponse(engine, messages, opts.maxTokens, acc=>{
      resultEl.innerHTML = `<p class="placeholder">${m('working')}</p><pre class="stream">${escapeHtml(acc)}</pre>`;
    }, opts.mode);
  };
  try{
    document.getElementById('resultStatus').textContent = m('working');
    resultEl.textContent = m('working');
    let response = await ask(userPrompt);
    if(!cancelled && !response.cut && opts.isBad(response.text)){
      // Use corrective instructions, keeping the original input and evidence checks.
      resultEl.textContent = m('retry');
      response = await ask(userPrompt, opts.retrySystem ? localizedSystem(opts.retrySystem, requestLang) : systemPrompt);
    }
    if(cancelled){ resultEl.textContent = m('cancelled'); return; }
    const invalid = opts.isBad(response.text);
    resultEl.innerHTML = `<p class="notice">${m('disc')}</p>` +
      (response.cut ? `<p class="notice">${m('trunc')}</p>` : '') +
      (invalid ? `<p class="notice">${m('partial')}</p>` : '') + renderFn(response.text) +
      `<p class="placeholder">${m('dur')}: ${((performance.now()-started)/1000).toFixed(0)} s</p>`;
    if(invalid){
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = m('raw');
      const pre = document.createElement('pre'); pre.className = 'stream'; pre.textContent = response.text;
      details.append(summary, pre); resultEl.append(details);
    }
    if(opts.generated && !invalid && !response.cut) attachCopy(resultEl, response.text, requestLang);
  }catch(err){ resultEl.textContent = cancelled ? m('cancelled') : m('err') + errorText(err); }
  finally{
    busy = false;
    if(!engine?.ready){ modelReady = false; status.textContent = m('reload'); }
    updateControls();
    document.getElementById('resultStatus').textContent = cancelled ? m('cancelled') : m('finished');
  }
}

analyzeBtn.addEventListener('click', ()=>{
  const title = document.getElementById('analyzeTitle').value.trim();
  const existing = document.getElementById('existing').value.trim();
  if(busy || loading) return;
  if(!existing){ resultEl.textContent = m('empty'); return; }
  const prompt = analysisPrompt({title, description:existing});
  const source = {title, description:existing};
  const requestLang = lang;

  run(prompt, ANALYZE_SYSTEM, text=>renderAnalysisXML(text, source, requestLang),
      {isBad:text=>analysisIsBad(text, source), maxTokens:ANALYSIS_MAX_TOKENS, mode:'analysis', retrySystem:ANALYZE_RETRY_SYSTEM});
});

generateBtn.addEventListener('click', ()=>{
  const v = id => document.getElementById(id).value.trim();
  const title = v('title'), purpose = v('purpose'), content = v('content'), source = v('source'),
        completeness = v('completeness'), interpretation = v('interpretation'), spatial = v('spatial');
  if(busy || loading) return;
  if(![purpose,content,source,completeness,interpretation,spatial].some(Boolean)){ resultEl.textContent = m('empty'); return; }
  const prompt = generationPrompt({title,purpose,content,source,completeness,interpretation,spatial}, lang);
  run(prompt, GENERATE_SYSTEM, renderPlainText, {isBad:generationIsBad, generated:true, maxTokens:GENERATION_MAX_TOKENS});
});
