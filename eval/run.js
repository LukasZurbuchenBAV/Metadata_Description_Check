// Optional browser-only evaluation. No requests are sent to an inference service.
import {InferenceClient} from '../src/inference.js';
import {MODEL_ID, WEBLLM_VERSION, ANALYSIS_MAX_TOKENS, GENERATION_MAX_TOKENS} from '../src/config.js';
import {ANALYZE_SYSTEM, GENERATE_SYSTEM, analysisPrompt, generationPrompt, localizedSystem} from '../src/prompts.js';
import {parseAnalysis, generationIsBad, checkBudget} from '../src/validation.js';

export async function runEvaluation({repeats=3, ids, onProgress=console.info, signal}={}){
  if(!Number.isInteger(repeats) || repeats < 1) throw new Error('repeats must be a positive integer');
  signal?.throwIfAborted();
  const response=await fetch(new URL('./cases.json',import.meta.url), {signal});
  if(!response.ok) throw new Error('Cannot load evaluation fixtures');
  const cases=(await response.json()).filter(item=>!ids || ids.includes(item.id));
  signal?.throwIfAborted();
  if(!cases.length) throw new Error('No evaluation cases selected');
  const engine=new InferenceClient();
  const abort=()=>engine.unload();
  signal?.addEventListener('abort',abort,{once:true});
  const results=[];
  try{
    await engine.load(progress=>onProgress({phase:'load',progress}));
    for(const item of cases){
      for(let repeat=0;repeat<repeats;repeat++){
        for(const mode of ['analysis','generation']){
          signal?.throwIfAborted();
          const maxTokens=mode==='analysis' ? ANALYSIS_MAX_TOKENS : GENERATION_MAX_TOKENS;
          const system=mode==='analysis' ? ANALYZE_SYSTEM : GENERATE_SYSTEM;
          const prompt=mode==='analysis' ? analysisPrompt(item) : generationPrompt(item.generation,item.lang);
          const messages=[{role:'system',content:localizedSystem(system,item.lang)},{role:'user',content:prompt}];
          checkBudget(messages,maxTokens);
          const started=performance.now();
          const output=await engine.generate(messages,maxTokens,undefined,mode === 'analysis' ? 'analysis' : 'text');
          const result={id:item.id,lang:item.lang,repeat,mode,...output,seconds:(performance.now()-started)/1000};
          if(mode==='analysis'){
            result.criteria=parseAnalysis(output.text,item).map(row=>({
              ...row,
              expectedPresent:item.expectedEvidence[row.tag] !== null,
              falseMissing:row.missingEvidence && item.expectedEvidence[row.tag] !== null,
              unsupportedPresence:!row.missingEvidence && item.expectedEvidence[row.tag] === null
            }));
            result.valid=!output.cut && result.criteria.every(row=>row.valid && (row.verified || row.missingEvidence));
          }else result.valid=!output.cut && !generationIsBad(output.text);
          results.push(result);
          onProgress(result);
        }
      }
    }
    return {model:MODEL_ID,webllm:WEBLLM_VERSION,timestamp:new Date().toISOString(),repeats,results};
  }finally{
    signal?.removeEventListener('abort',abort);
    engine.unload();
  }
}
