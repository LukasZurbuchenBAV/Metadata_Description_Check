import {ANALYSIS_TAGS} from './validation.js';

// Constrain decoding, rather than hoping a small model substitutes template names.
// Keep evidence/content validation separate: valid syntax does not imply truth.
export const ANALYSIS_GRAMMAR = [
  'root ::= ws ' + ANALYSIS_TAGS.join(' ws ') + ' ws',
  'ws ::= [ \\t\\r\\n]*',
  'text ::= [^<]+',
  'score ::= [1-5]',
  ...ANALYSIS_TAGS.map(tag=>`${tag} ::= "<${tag}-beleg>" text "</${tag}-beleg>" ws "<${tag}>" text "</${tag}>" ws "<${tag}-tipp>" text "</${tag}-tipp>" ws "<${tag}-score>" score "</${tag}-score>"`)
].join('\n');
