import {message, AXL} from './i18n.js';
import {parseAnalysis, cleanGenerated} from './validation.js';
export function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
export function renderAnalysisXML(text, source, lang){
  const m = key => message(key, lang);
  const rows = parseAnalysis(text, source);
  if(rows.every(row=>!row.body && !row.evidence && !row.tip && row.score === null)){
    return `<p class="notice">${m('analysisFormatErr')}</p>`;
  }
  // Kleine Modelle verwenden denselben Satz oft für mehrere Kriterien. Ein solches
  // Zitat belegt keines davon zuverlässig und wird darum nirgends angezeigt.
  const key = x => x.normalize('NFC').toLowerCase().replace(/\s+/g,' ').replace(/[.!?\s]+$/,'').trim();
  const quoteCount = new Map();
  for(const row of rows) if(row.verified){ const k = key(row.evidence); quoteCount.set(k,(quoteCount.get(k)||0)+1); }
  const seenBodies = new Set();
  return rows.map((row,i)=>{
    const badge = row.valid ? `<span class="score score-${row.score}">${row.score}/5</span>` : '';
    const repeatedQuote = row.verified && quoteCount.get(key(row.evidence)) > 1;
    const warning = !row.valid ? m('unavailable') : (!row.missingEvidence && !row.verified ? m('unverified') : '');
    const found = row.verified && !repeatedQuote ? `<p class="placeholder">${m('src')} «${escapeHtml(row.evidence)}»</p>` : '';
    // Einschätzung weglassen, wenn sie nur das Zitat oder eine frühere Einschätzung wiederholt.
    const bodyKey = key(row.body);
    const redundantBody = !bodyKey || bodyKey === key(row.evidence) || seenBodies.has(bodyKey);
    seenBodies.add(bodyKey);
    const body = redundantBody ? '' : `<p>${escapeHtml(row.body)}</p>`;
    const tip = row.tip && !/^[–-]$/.test(row.tip) ? `<p><strong>${m('tip')}</strong> ${escapeHtml(row.tip)}</p>` : '';
    return `<div class="cat"><h3>${AXL[lang][i]} ${badge}</h3>${warning ? `<p class="placeholder">${warning}</p>` : ''}${body}${found}${tip}</div>`;
  }).join('');
}
export function renderPlainText(text){
  return `<div class="cat" id="generated-text">${cleanGenerated(text).split(/\n{2,}/).map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div>`;
}
export function attachCopy(resultEl, text, lang){
  const m = key => message(key, lang);
  const button = document.createElement('button');
  button.className = 'secondary';
  button.type = 'button';
  button.textContent = m('copy');
  button.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(cleanGenerated(text));
      button.textContent = m('copied');
    }catch{
      button.textContent = m('copyErr');
    }
  });
  resultEl.append(button);
}
