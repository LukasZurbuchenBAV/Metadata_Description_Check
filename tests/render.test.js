import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAnalysisXML, renderPlainText} from '../src/render.js';

test('model output is escaped in assessments, evidence, tips and generated prose',()=>{
  const dangerous='<img src=x onerror="alert(1)">';
  const xml=`<titel>${dangerous}</titel><titel-beleg>${dangerous}</titel-beleg><titel-tipp>${dangerous}</titel-tipp><titel-score>2</titel-score>`;
  const analysis=renderAnalysisXML(xml,{title:dangerous,description:''},'de');
  assert.equal(analysis.includes('<img'),false);
  assert.ok(analysis.includes('&lt;img'));
  assert.ok(analysis.includes('2/5'));
  assert.equal(renderPlainText(dangerous).includes('<img'),false);
});
test('unavailable criteria have no fabricated scores and unverified evidence is labelled',()=>{
  const xml='<titel>Unklar.</titel><titel-beleg>Invented quote</titel-beleg><titel-tipp>Präzisieren.</titel-tipp><titel-score>3</titel-score>';
  const html=renderAnalysisXML(xml,{title:'Test',description:''},'de');
  assert.equal((html.match(/class="score score-/g)||[]).length,1);
  assert.ok(html.includes('nicht verifiziert'));
  assert.ok(html.includes('keine Bewertung verfügbar'));
});
