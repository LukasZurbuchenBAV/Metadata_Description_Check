import {CONTEXT_WINDOW_SIZE, CHAT_TEMPLATE_RESERVE, METADATA_MAX_BYTES} from './config.js';

// Decode XML character references once, without interpreting markup or HTML entities.
export function decodeXmlText(text){
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  return text.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entity, name)=>{
    if(name[0] !== '#') return named[name] ?? entity;
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2),16) : Number(name.slice(1));
    const valid = code === 9 || code === 10 || code === 13 ||
      (code >= 0x20 && code <= 0xD7FF) || (code >= 0xE000 && code <= 0xFFFD) ||
      (code >= 0x10000 && code <= 0x10FFFF);
    return valid ? String.fromCodePoint(code) : entity;
  });
}

export function metadataBytes(fields){
  return Object.values(fields).reduce((sum,value)=>sum + new TextEncoder().encode(value.trim()).length,0);
}
export function checkMetadataBudget(fields){
  if(metadataBytes(fields) > METADATA_MAX_BYTES) throw new Error('INPUT_TOO_LONG');
}

export function parseAnalysis(text, source){
  return ANALYSIS_TAGS.map(tag=>{
    const fields = ['', '-beleg', '-tipp', '-score'].map(suffix=>{
      const name = tag + suffix;
      const matches = [...text.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'gi'))];
      return matches.length === 1 ? decodeXmlText(matches[0][1]).trim() : '';
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
  // Reserve chat-template markers and the entire requested answer budget.
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
