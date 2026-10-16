import {createInferenceWorker} from './worker-loader.js';

// Only this adapter knows the worker protocol. It owns timeouts and stale replies.
export class InferenceClient {
  constructor({workerFactory, timeoutMs=300_000, cancelTimeoutMs=10_000}={}){
    this.workerFactory = workerFactory || createInferenceWorker;
    this.timeoutMs = timeoutMs;
    this.cancelTimeoutMs = cancelTimeoutMs;
    this.worker = null;
    this.pending = null;
    this.nextId = 0;
    this.ready = false;
  }

  async load(onProgress){
    this.unload();
    const worker = this.worker = this.workerFactory();
    worker.onmessage = event=>{ if(this.worker === worker) this.receive(event.data); };
    worker.onerror = event=>{
      event.preventDefault?.();
      if(this.worker === worker) this.dispose('WORKER_ERROR');
    };
    worker.onmessageerror = ()=>{ if(this.worker === worker) this.dispose('WORKER_ERROR'); };
    await this.request('load', {}, onProgress);
    this.ready = true;
  }

  generate(messages, maxTokens, onProgress, mode='text'){
    if(!this.ready) return Promise.reject(new Error('MODEL_NOT_READY'));
    return this.request('generate', {messages, maxTokens, mode}, onProgress);
  }

  request(type, payload, onProgress){
    if(this.pending) return Promise.reject(new Error('BUSY'));
    return new Promise((resolve,reject)=>{
      this.pending = {id:++this.nextId, type, onProgress, resolve, reject, cancelled:false};
      this.armTimeout();
      try{ this.worker.postMessage({id:this.pending.id, type, ...payload}); }
      catch{ this.dispose('WORKER_ERROR'); }
    });
  }

  armTimeout(){
    clearTimeout(this.timer);
    this.timer = setTimeout(()=>this.dispose(this.pending?.cancelled ? 'CANCELLED' : 'WORKER_TIMEOUT'), this.pending?.cancelled ? this.cancelTimeoutMs : this.timeoutMs);
  }

  receive(message){
    const pending = this.pending;
    if(!pending || message.id !== pending.id) return;
    if(message.type === 'progress'){
      // Streaming traffic must not indefinitely extend the cancellation deadline.
      if(!pending.cancelled){ this.armTimeout(); pending.onProgress?.(message.value); }
      return;
    }
    clearTimeout(this.timer);
    this.pending = null;
    if(message.type === 'error'){
      if(message.error !== 'CANCELLED') this.dispose();
      pending.reject(new Error(message.error));
    }else if(message.type === 'done'){
      if(pending.cancelled) pending.reject(new Error('CANCELLED'));
      else pending.resolve(message.value);
    }else{
      this.dispose();
      pending.reject(new Error('WORKER_ERROR'));
    }
  }

  cancel(){
    if(!this.pending || this.pending.cancelled) return;
    if(this.pending.type === 'load'){ this.dispose('CANCELLED'); return; }
    this.pending.cancelled = true;
    try{ this.worker.postMessage({type:'cancel', id:this.pending.id}); }
    catch{ this.dispose('CANCELLED'); return; }
    this.armTimeout();
  }

  dispose(reason='MODEL_NOT_READY'){
    clearTimeout(this.timer);
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    const pending = this.pending;
    this.pending = null;
    pending?.reject(new Error(reason));
  }

  unload(){ this.dispose(); }
}

export function generateResponse(engine, messages, maxTokens, onProgress, mode){
  return engine.generate(messages, maxTokens, onProgress, mode);
}
