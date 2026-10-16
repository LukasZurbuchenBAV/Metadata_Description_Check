import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const code = html.slice(html.indexOf('function parseAnalysis'), html.indexOf('function cleanGenerated'));
const normalization = html.slice(html.indexOf('const norm ='), html.indexOf('const AXL'));
const context = vm.createContext({});
vm.runInContext(`const ANALYSIS_TAGS=['titel','zweck','inhalt','erhebung','vollstaendigkeit','interpretation','raeumlicherbezug']; ${normalization}\n${code}`, context);
const evaluate = code => vm.runInContext(code, context);
const source = {title:'Nitratwerte', description:'Keine Aussage über die Trinkwasserqualität möglich. Die Daten werden jährlich aktualisiert.'};
context.source = source;
function row(tag, evidence, score='2') {
  return `<${tag}>Lücken und Abdeckung fehlen.</${tag}><${tag}-beleg>${evidence}</${tag}-beleg><${tag}-tipp>Abdeckung ergänzen.</${tag}-tipp><${tag}-score>${score}</${tag}-score>`;
}

test('preserves low model scores for verified evidence', ()=>{
  context.text=row('vollstaendigkeit','jährlich aktualisiert');
  assert.equal(evaluate('parseAnalysis(text, source)[4].score'),2);
  assert.equal(evaluate('parseAnalysis(text, source)[4].verified'),true);
});
test('requires contiguous quotes rather than word overlap', ()=>{
  assert.equal(evaluate(`supported('Pestizidwerte Nitratwerte jährlich gemessen', 'Nitratwerte und Pestizidwerte werden jährlich gemessen.')`),false);
});
test('accepts real negations in all languages', ()=>{
  for (const text of ['Keine Aussage möglich.', 'Pas de comparaison possible.', 'Nessuna conclusione possibile.']) {
    context.quote=text;
    assert.equal(evaluate('supported(quote, quote)'),true);
  }
});
test('normalizes Unicode and whitespace, preserving case and punctuation', ()=>{
  context.spaced = 'Qualite\u0301  des\neaux';
  assert.equal(evaluate(`supported('Qualité des eaux', spaced)`),true);
  assert.equal(evaluate(`supported('qualité des eaux', 'Qualité des eaux')`),false);
});
test('does not use description text as title evidence', ()=>{
  context.text=row('titel','jährlich aktualisiert');
  assert.equal(evaluate('parseAnalysis(text, source)[0].verified'),false);
});
test('missing, duplicate and invalid fields remain unavailable', ()=>{
  for (const text of ['<titel>Test</titel>', row('titel','Nitratwerte','10'), row('titel','Nitratwerte')+'<titel>Duplicate</titel>']) {
    context.text=text;
    assert.equal(evaluate('parseAnalysis(text, source)[0].valid'),false);
  }
});
test('all seven criteria and all four fields are required', ()=>{
  context.text=['titel','zweck','inhalt','erhebung','vollstaendigkeit'].map(k=>row(k,'keine')).join('');
  assert.equal(evaluate('parseAnalysis(text, source).filter(r=>r.valid).length'),5);
});
