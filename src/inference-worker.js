import {MODEL_ID, WEBLLM_URL, TEMPERATURE} from './config.js';
import {checkBudget} from './validation.js';

let engine = null, active = null;
const send = (id,type,value)=>self.postMessage({id,type,value});
self.onmessage = async ({data:message})=>{
  if(message.type === 'cancel'){
    if(active?.id === message.id){
      active.cancelled = true;
      engine?.interruptGenerate();
    }
    return;
  }
  if(active){ self.postMessage({id:message.id,type:'error',error:'BUSY'}); return; }
  const job = active = {id:message.id, cancelled:false};
  try{
    let value;
    if(message.type === 'load'){
      // Import errors are returned through the same protocol as model-load failures.
      const {MLCEngine} = await import(WEBLLM_URL);
      engine = new MLCEngine();
      engine.setInitProgressCallback(progress=>send(job.id,'progress',progress));
      await engine.reload(MODEL_ID);
    }else if(message.type === 'generate'){
      if(!engine) throw new Error('MODEL_NOT_READY');
      checkBudget(message.messages, message.maxTokens);
      let text = '', cut = false, updated = 0;
      const stream = await engine.chat.completions.create({
        messages:message.messages, temperature:TEMPERATURE, max_tokens:message.maxTokens, stream:true,
        // WebLLM 0.2.80's XGrammar path can abort the WASM runtime (upstream #807).
        // Keep normal text decoding; enforce XML through prompts and validation.
        extra_body:{enable_thinking:false}
      });
      for await(const chunk of stream){
        if(job.cancelled) break;
        text += chunk.choices[0]?.delta?.content || '';
        if(chunk.choices[0]?.finish_reason === 'length') cut = true;
        // Limit cross-thread messages and DOM work during streaming.
        if(performance.now()-updated >= 100){ send(job.id,'progress',text); updated = performance.now(); }
      }
      value = {text:text.replace(/<think>[\s\S]*?<\/think>/g,''),cut};
    }else throw new Error('WORKER_ERROR');
    if(job.cancelled) throw new Error('CANCELLED');
    send(job.id,'done',value);
  }catch(error){
    const detail = String(error.message || error);
    const aborted = /\bAborted\(|memory access out of bounds|unreachable/i.test(detail);
    self.postMessage({id:job.id,type:'error',error:job.cancelled ? 'CANCELLED' : aborted ? 'RUNTIME_ABORTED' : detail, ...(aborted ? {detail} : {})});
  }finally{ active = null; }
};
