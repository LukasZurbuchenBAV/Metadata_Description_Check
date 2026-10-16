import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {InferenceClient, generateResponse} from '../src/inference.js';

const source = ['config', 'i18n', 'validation', 'prompts', 'render', 'app'].map(name=>readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'')).join('\n');
function app(){
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id)) elements.set(id,{style:{},dataset:{},value:'',disabled:false,hidden:false,textContent:'',innerHTML:'',addEventListener(name,fn){this[name]=fn;},setAttribute(){},append(){}});
    return elements.get(id);
  };
  const context=vm.createContext({InferenceClient,generateResponse,performance,TextEncoder,setTimeout,clearTimeout,navigator:{},NodeFilter:{SHOW_TEXT:4},document:{getElementById:get,documentElement:{},createTreeWalker(){return {nextNode:()=>null};},querySelectorAll:()=>[],createElement:()=>({addEventListener(){},append(){}})}});
  vm.runInContext(source,context);
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
  assert.throws(()=>a.eval(`checkBudget([{content:'ä'.repeat(3000)}],1700)`),/INPUT_TOO_LONG/);
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

test('analysis retries with corrective instructions and preserves constrained decoding mode',async()=>{
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
