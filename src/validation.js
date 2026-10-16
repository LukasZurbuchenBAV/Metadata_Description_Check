import {CONTEXT_WINDOW_SIZE, CHAT_TEMPLATE_RESERVE} from './config.js';

export function parseAnalysis(text, source){
  return ANALYSIS_TAGS.map(tag=>{
    const fields = ['', '-beleg', '-tipp', '-score'].map(suffix=>{
      const name = tag + suffix;
      const matches = [...text.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'gi'))];
      return matches.length === 1 ? matches[0][1].trim() : '';
    });
    const [body, evidence, tip, scoreText] = fields;
    const score = /^[1-5]$/.test(scoreText) ? Number(scoreText) : null;
    const missingEvidence = /^(keine|aucun|aucune|nessuno|nessuna|none|–|-)$/i.test(evidence);
    const valid = fields.every(Boolean) && score !== null;
    const verified = !missingEvidence && supported(evidence, tag === 'titel' ? source.title : source.description);
    return {tag, body, evidence, tip, score, valid, verified, missingEvidence};
  });
}
export function cleanGenerated(text){
  // Preserve content inside emphasis. Never delete whole lines of model output.
  return text.trim().replace(/^["«„“]([\s\S]*)["»“”]$/, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}
export function generationIsBad(text){
  const t = cleanGenerated(text);
  return !t || !/[\p{L}]/u.test(t) || !/[.!?]$/.test(t) || /<\/?[a-z][^>]*>/i.test(t) || /^(?:#{1,6}\s|[-*•]\s|\d+[.)]\s)/m.test(t)
    || /(?:Zweck|But|Objectif|Scopo|Inhalt|Contenu|Contenuto|Source|Fonte|Erhebung\s*\/?\s*Quelle|Vollständigkeit|Complétude|Completezza|Interpretation|Interprétation|Interpretazione|Räumlicher Bezug|Référence spatiale|Riferimento spaziale)\s*:/i.test(t)
    || /(?:enthält|contient|contiene)\s*(?:…|\.\.\.)/.test(t);
}
export function checkBudget(messages, maxTokens){
  // Qwen3 uses a byte-level tokenizer: UTF-8 bytes conservatively bound text tokens.
  // Reserve 256 tokens for chat-template markers and 1700/700 for the answer.
  const bytes = messages.reduce((n,message)=>n + new TextEncoder().encode(message.content).length,0);
  if(bytes + CHAT_TEMPLATE_RESERVE + maxTokens > CONTEXT_WINDOW_SIZE) throw new Error('INPUT_TOO_LONG');
  return bytes;
}

const norm = x => x.normalize('NFC').replace(/\s+/g,' ').trim();
export function supported(quote, source){
  return !!quote && !!norm(quote) && norm(source).includes(norm(quote));
}


export const ANALYSIS_TAGS = ['titel','zweck','inhalt','erhebung','vollstaendigkeit','interpretation','raeumlicherbezug'];
export function analysisIsBad(text, source){return parseAnalysis(text, source).some(row=>!row.valid || (!row.missingEvidence && !row.verified));}
