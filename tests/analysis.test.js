import {parseAnalysis, supported, analysisIsBad, decodeXmlText} from '../src/validation.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = {title:'Nitratwerte', description:'Keine Aussage über die Trinkwasserqualität möglich. Die Daten werden jährlich aktualisiert.'};
function row(tag, evidence, score='2') {
  return `<${tag}>Lücken und Abdeckung fehlen.</${tag}><${tag}-beleg>${evidence}</${tag}-beleg><${tag}-tipp>Abdeckung ergänzen.</${tag}-tipp><${tag}-score>${score}</${tag}-score>`;
}

test('preserves low model scores for verified evidence', ()=>{
  const text=row('vollstaendigkeit','jährlich aktualisiert');
  assert.equal(parseAnalysis(text, source)[4].score,2);
  assert.equal(parseAnalysis(text, source)[4].verified,true);
});
test('requires contiguous quotes rather than word overlap', ()=>{
  assert.equal(supported('Pestizidwerte Nitratwerte jährlich gemessen', 'Nitratwerte und Pestizidwerte werden jährlich gemessen.'),false);
});
test('accepts real negations in all languages', ()=>{
  for (const text of ['Keine Aussage möglich.', 'Pas de comparaison possible.', 'Nessuna conclusione possibile.']) {
    assert.equal(supported(text, text),true);
  }
});
test('normalizes Unicode and whitespace, preserving case and punctuation', ()=>{
  const spaced = 'Qualite\u0301  des\neaux';
  assert.equal(supported('Qualité des eaux', spaced),true);
  assert.equal(supported('qualité des eaux', 'Qualité des eaux'),false);
});
test('does not use description text as title evidence', ()=>{
  const text=row('titel','jährlich aktualisiert');
  assert.equal(parseAnalysis(text, source)[0].verified,false);
});
test('missing, duplicate and invalid fields remain unavailable', ()=>{
  for (const text of ['<titel>Test</titel>', row('titel','Nitratwerte','10'), row('titel','Nitratwerte')+'<titel>Duplicate</titel>']) {
    assert.equal(parseAnalysis(text, source)[0].valid,false);
  }
});

test('XML entities are decoded once before matching evidence, including Unicode references',()=>{
  const title='Wasser & Boden < 5 "mg" © 😀';
  const encoded='Wasser &amp; Boden &lt; 5 &quot;mg&quot; &#169; &#x1F600;';
  const parsed=parseAnalysis(row('titel',encoded),{title,description:''})[0];
  assert.equal(parsed.evidence,title);
  assert.equal(parsed.verified,true);
  assert.equal(decodeXmlText('&amp;lt; &apos; &gt;'),'&lt; \' >');
  assert.equal(decodeXmlText('&#0; &#xD800; &#x110000; &unknown;'),'&#0; &#xD800; &#x110000; &unknown;');
});
// Literal criterion names come from the documented seven-criterion output contract.
const tags=['titel','zweck','inhalt','erhebung','vollstaendigkeit','interpretation','raeumlicherbezug'];
const complete=tags.map(tag=>row(tag,tag==='titel'?'Nitratwerte':'jährlich aktualisiert')).join('');
test('a complete analysis is accepted; every criterion and field is independently required',()=>{
  assert.equal(analysisIsBad(complete,source),false);
  for(const tag of tags){
    for(const suffix of ['', '-beleg', '-tipp', '-score']){
      const name=tag+suffix;
      const field=new RegExp(`<${name}>[^<]*</${name}>`);
      const without=complete.replace(field,'');
      assert.notEqual(without,complete,`fixture contains ${name}`);
      assert.equal(analysisIsBad(without,source),true,`missing ${name}`);
      assert.equal(analysisIsBad(complete+complete.match(field)[0],source),true,`duplicate ${name}`);
    }
  }
});
