import test from 'node:test';
import assert from 'node:assert/strict';
import {checkWebGpuSupport} from '../src/gpu.js';

const gpuWith=features=>({requestAdapter:async()=>({features:new Set(features)})});
test('GPU requirements support different models, multiple features and no optional features',async()=>{
  assert.equal(await checkWebGpuSupport(gpuWith(['timestamp-query']),['timestamp-query']),null);
  assert.equal(await checkWebGpuSupport(gpuWith(['shader-f16']),['shader-f16','timestamp-query']),'noFeatures');
  assert.equal(await checkWebGpuSupport(gpuWith([]),[]),null);
});
test('GPU capability failures remain distinguishable',async()=>{
  assert.equal(await checkWebGpuSupport(null),'noGpu');
  assert.equal(await checkWebGpuSupport({requestAdapter:async()=>null}),'noAdapter');
  assert.equal(await checkWebGpuSupport({requestAdapter:async()=>{throw new Error('unavailable');}}),'noCheck');
});
