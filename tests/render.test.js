import {readFileSync} from 'node:fs';
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

test('unrecognized placeholder responses show a format failure instead of seven empty cards',()=>{
  const sample=JSON.parse(readFileSync(new URL('./fixtures/analysis-placeholder.json',import.meta.url)));
  const html=renderAnalysisXML(sample.raw,sample.source,'de');
  assert.ok(html.includes('keinem Kriterium zugeordnet'));
  assert.equal(html.includes('class="cat"'),false);
  assert.equal(html.includes('/5'),false);
});

test('encoded XML text renders as readable evidence while encoded markup stays inert',()=>{
  const title='Wasser & Boden < 5';
  const xml='<titel>Wasser &amp; Boden &lt; 5</titel><titel-beleg>Wasser &amp; Boden &lt; 5</titel-beleg><titel-tipp>&lt;img src=x onerror=alert(1)&gt;</titel-tipp><titel-score>4</titel-score>';
  const html=renderAnalysisXML(xml,{title,description:''},'de');
  assert.ok(html.includes('Fundstelle: «Wasser &amp; Boden &lt; 5»'));
  assert.equal(html.includes('&amp;lt;'),false);
  assert.equal(html.includes('&amp;amp;'),false);
  assert.equal(html.includes('<img'),false);
  assert.ok(html.includes('&lt;img'));
});
