// The standalone HTML substitutes its embedded worker for the module URL below.
export function createInferenceWorker(){
  return new Worker(new URL('./inference-worker.js', import.meta.url), {type:'module'});
}

export function createBlobWorker(source){
  const url = URL.createObjectURL(new Blob([source], {type:'text/javascript'}));
  try{
    const worker = new Worker(url);
    const release = ()=>URL.revokeObjectURL(url);
    worker.addEventListener('message', release, {once:true});
    worker.addEventListener('error', release, {once:true});
    const terminate = worker.terminate.bind(worker);
    worker.terminate = ()=>{ release(); terminate(); };
    return worker;
  }catch(error){
    URL.revokeObjectURL(url);
    throw error;
  }
}
