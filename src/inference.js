import {MODEL_ID} from './config.js';

export async function loadEngine(onProgress){
  const {MLCEngine} = await import('https://esm.run/@mlc-ai/web-llm@0.2.80');
  const engine = new MLCEngine();
  engine.setInitProgressCallback(onProgress);
  try{
    await engine.reload(MODEL_ID);
    return engine;
  }catch(error){
    await engine.unload().catch(()=>{});
    throw error;
  }
}

export async function generateResponse(engine, messages, maxTokens, onProgress, isCancelled){
  let text = '', cut = false, n = 0;
  const stream = await engine.chat.completions.create({
    messages, temperature:0.2, max_tokens:maxTokens, stream:true,
    extra_body:{enable_thinking:false}
  });
  for await(const chunk of stream){
    if(isCancelled()) break;
    text += chunk.choices[0]?.delta?.content || '';
    if(chunk.choices[0]?.finish_reason === 'length') cut = true;
    if(++n % 6 === 0) onProgress(text);
  }
  return {text:text.replace(/<think>[\s\S]*?<\/think>/g,''), cut};
}
