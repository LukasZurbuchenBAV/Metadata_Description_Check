import {message, AXL} from './i18n.js';
import {parseAnalysis, cleanGenerated} from './validation.js';
export function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
export function renderAnalysisXML(text, source, lang){
  const m = key => message(key, lang);
  return parseAnalysis(text, source).map((row,i)=>{
    const badge = row.valid ? `<span class="score score-${row.score}">${row.score}/5</span>` : '';
    const warning = !row.valid ? m('unavailable') : (!row.missingEvidence && !row.verified ? m('unverified') : '');
    const found = row.verified ? `<p class="placeholder">${m('src')} «${escapeHtml(row.evidence)}»</p>` : '';
    const tip = row.tip && !/^[–-]$/.test(row.tip) ? `<p><strong>${m('tip')}</strong> ${escapeHtml(row.tip)}</p>` : '';
    return `<div class="cat"><h3>${AXL[lang][i]} ${badge}</h3>${warning ? `<p class="placeholder">${warning}</p>` : ''}<p>${escapeHtml(row.body)}</p>${found}${tip}</div>`;
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
