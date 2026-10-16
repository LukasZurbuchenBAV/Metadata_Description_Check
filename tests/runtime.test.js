import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {InferenceClient, generateResponse} from '../src/inference.js';

const source = ['config', 'gpu', 'i18n', 'validation', 'prompts', 'render', 'app'].map(name=>readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'')).join('\n');
function app(settings={}){
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id)) elements.set(id,{style:{},dataset:{},value:'',disabled:false,hidden:false,textContent:'',innerHTML:'',addEventListener(name,fn){this[name]=fn;},setAttribute(){},append(){}});
    return elements.get(id);
  };
  const context=vm.createContext({InferenceClient,generateResponse,performance,TextEncoder,setTimeout,clearTimeout,navigator:{},NodeFilter:{SHOW_TEXT:4},document:{getElementById:get,documentElement:{},createTreeWalker(){return {nextNode:()=>null};},querySelectorAll:()=>[],createElement:()=>({addEventListener(){},append(){}})}});
  const configured=Object.entries(settings).reduce((code,[key,value])=>code.replace(new RegExp('const '+key+' = [^;]+;'),()=> 'const '+key+' = '+JSON.stringify(value)+';'),source);
  vm.runInContext(configured,context);
  return {get,eval:code=>vm.runInContext(code,context)};
}
test('serializes requests and disables reload and language selection', async()=>{
  const a=app();
  a.eval(`modelReady=true;engine={ready:true,generate:()=>new Promise(r=>globalThis.finish=r)};globalThis.first=run('test', GENERATE_SYSTEM,renderPlainText,{isBad:generationIsBad,maxTokens:700});`);
  for(const id of ['analyzeBtn','generateBtn','loadBtn','lang']) assert.equal(a.get(id).disabled,true,id);
  a.eval(`globalThis.second=run('test',GENERATE_SYSTEM,renderPlainText,{isBad:generationIsBad,maxTokens:700});`);
  await a.eval('second');
  a.eval(`finish({text:'Der Datensatz enthält Messwerte.',cut:false});`);
  await a.eval('first');
  assert.equal(a.get('analyzeBtn').disabled,false);
});
test('rejects blank generation without invoking inference',()=>{
  const a=app();a.get('generateBtn').click();
  assert.match(a.get('result').textContent,/mindestens/);
});
test('input counters count accented text, translate and reject oversize submissions without inference',()=>{
  const a=app();
  assert.match(a.get('analysisBudget').textContent,/0 \/ 4500/);
  a.get('analyzeTitle').value='ä';
  a.get('existing').value='😀';
  a.get('existing').input();
  assert.match(a.get('analysisBudget').textContent,/6 \/ 4500/);
  a.eval(`setLang('fr')`);
  assert.match(a.get('analysisBudget').textContent,/octets/);
  a.get('existing').value='x'.repeat(4500);
  a.get('existing').input();
  assert.match(a.get('analysisBudget').textContent,/Limite dépassée/);
  a.eval(`modelReady=true;globalThis.calls=0;engine={ready:true,generate(){calls++;throw new Error('must not generate')}};`);
  a.get('analyzeBtn').click();
  assert.equal(a.eval('calls'),0);
  assert.match(a.get('result').textContent,/4500/);
  a.get('title').value='x'.repeat(4500);
  a.get('content').value='y';
  a.get('content').input();
  assert.match(a.get('generationBudget').textContent,/4501 \/ 4500/);
  a.get('generateBtn').click();
  assert.equal(a.eval('calls'),0);
  assert.match(a.get('result').textContent,/4500/);
});
test('rejects empty output, lists and labels without deleting prose',()=>{
  const a=app();
  for(const text of ['', '   ', '…', '- Messwerte', '1. Messwerte', 'Contenu: des mesures', 'Référence spatiale: Berne', 'Der Datensatz enthält', '<p>Messwerte.</p>']) {
    a.eval(`globalThis.text=${JSON.stringify(text)}`);
    assert.equal(a.eval('generationIsBad(text)'),true,text);
  }
  assert.equal(a.eval(`cleanGenerated('**Der Datensatz enthält Messwerte.**')`),'Der Datensatz enthält Messwerte.');
});
test('preflight reserves space for output and rejects oversize input',()=>{
  const a=app();
  assert.doesNotThrow(()=>a.eval(`checkBudget([{content:ANALYZE_SYSTEM},{content:'Titel: Wasser\\nBeschreibung: Messwerte im Kanton Bern.'}],1700)`));
  assert.throws(()=>a.eval(`checkBudget([{content:'ä'.repeat(CONTEXT_WINDOW_SIZE)}],1700)`),/INPUT_TOO_LONG/);
});
test('manual language choice is preserved when submitting French input',()=>{
  const a=app();
  a.get('existing').value='Les données sont les mesures de la qualité de l’eau dans le canton de Berne.';
  a.get('analyzeBtn').click();
  assert.equal(a.eval('lang'),'de');
});
test('cancellation suppresses output and releases busy state',async()=>{
  const a=app();
  a.eval(`modelReady=true;engine={ready:true,cancel(){},generate:()=>new Promise(r=>globalThis.finish=r)};globalThis.request=run('test',GENERATE_SYSTEM,renderPlainText,{isBad:generationIsBad,maxTokens:700});`);
  a.get('cancelBtn').click();
  a.eval(`finish({text:'Late result',cut:false});`);
  await a.eval('request');
  assert.equal(a.get('result').textContent,'Abgebrochen.');
  assert.equal(a.eval('busy'),false);
});

test('analysis retries with corrective instructions and preserves analysis mode',async()=>{
  const a=app();
  const sample=JSON.parse(readFileSync(new URL('./fixtures/analysis-placeholder.json',import.meta.url)));
  a.eval(`globalThis.sample=${JSON.stringify(sample)};globalThis.requests=[];modelReady=true;
    const valid=ANALYSIS_TAGS.map(tag=>'<'+tag+'>Einschätzung.</'+tag+'><'+tag+'-beleg>none</'+tag+'-beleg><'+tag+'-tipp>Prüfen.</'+tag+'-tipp><'+tag+'-score>2</'+tag+'-score>').join('');
    engine={ready:true,generate:async(messages,maxTokens,onProgress,mode)=>{requests.push({messages,mode});return {text:requests.length===1?sample.raw:valid,cut:false};}};
    globalThis.request=run(analysisPrompt(sample.source),ANALYZE_SYSTEM,text=>renderAnalysisXML(text,sample.source,'de'),{isBad:text=>analysisIsBad(text,sample.source),maxTokens:1700,mode:'analysis',retrySystem:ANALYZE_RETRY_SYSTEM});`);
  await a.eval('request');
  assert.equal(a.eval('requests.length'),2);
  assert.equal(a.eval(`requests.every(request=>request.mode==='analysis')`),true);
  assert.notEqual(a.eval('requests[0].messages[0].content'),a.eval('requests[1].messages[0].content'));
  assert.equal(a.eval('requests[0].messages[1].content'),a.eval('requests[1].messages[1].content'));
  assert.match(a.get('result').innerHTML,/Einschätzung/);
});

test('fatal inference failures retain inputs and announce failure instead of success',async()=>{
  const a=app();
  a.get('analyzeTitle').value='Alpenquerender Verkehr';
  a.get('existing').value='Die Daten werden jährlich aktualisiert.';
  a.eval(`modelReady=true;engine={ready:true,generate:async()=>{engine.ready=false;throw new Error('RUNTIME_ABORTED')}};
    globalThis.request=run('test',ANALYZE_SYSTEM,text=>text,{isBad:()=>false,maxTokens:1700,mode:'analysis'});`);
  await a.eval('request');
  assert.match(a.get('result').textContent,/Laufzeit ist abgestürzt/);
  assert.doesNotMatch(a.get('result').textContent,/ASSERTIONS|Aborted\(/);
  assert.match(a.get('resultStatus').textContent,/fehlgeschlagen/);
  assert.equal(a.get('analyzeTitle').value,'Alpenquerender Verkehr');
  assert.equal(a.get('existing').value,'Die Daten werden jährlich aktualisiert.');
  assert.equal(a.get('analyzeBtn').disabled,true);
  assert.equal(a.eval('busy'),false);
});

for(const retries of [0,2]) test(`configured retry count ${retries} limits invalid-answer attempts`,async()=>{
  const a=app({MAX_RETRIES:retries});
  a.eval(`modelReady=true;globalThis.calls=0;engine={ready:true,generate:async()=>{calls++;return {text:'invalid',cut:false};}};
    globalThis.request=run('test',GENERATE_SYSTEM,text=>text,{isBad:()=>true,maxTokens:700});`);
  await a.eval('request');
  assert.equal(a.eval('calls'),1+retries);
});
test('truncation stops retries even when additional retries are configured',async()=>{
  const a=app({MAX_RETRIES:2});
  a.eval(`modelReady=true;globalThis.calls=0;engine={ready:true,generate:async()=>{calls++;return {text:'partial',cut:true};}};
    globalThis.request=run('test',GENERATE_SYSTEM,text=>text,{isBad:()=>true,maxTokens:700});`);
  await a.eval('request');
  assert.equal(a.eval('calls'),1);
});
test('model hints and capability errors use configured memory and feature names',()=>{
  const a=app({MODEL_GPU_MEMORY_GB:8,REQUIRED_GPU_FEATURES:['timestamp-query']});
  assert.match(a.eval(`m('hint')`),/8 GB/);
  assert.match(a.eval(`m('hint')`),/timestamp-query/);
  assert.doesNotMatch(a.eval(`m('hint')`),/shader-f16|3\.4/);
  assert.match(a.eval(`m('noFeatures')`),/timestamp-query/);
});
