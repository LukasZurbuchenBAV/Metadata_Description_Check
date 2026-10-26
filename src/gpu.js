import {REQUIRED_GPU_FEATURES} from './config.js';

export async function checkWebGpuSupport(gpu=navigator.gpu, requiredFeatures=REQUIRED_GPU_FEATURES){
  if(!gpu) return 'noGpu';
  try{
    const adapter = await gpu.requestAdapter();
    if(!adapter) return 'noAdapter';
    if(requiredFeatures.some(feature=>!adapter.features.has(feature))) return 'noFeatures';
  }catch{ return 'noCheck'; }
  return null;
}
