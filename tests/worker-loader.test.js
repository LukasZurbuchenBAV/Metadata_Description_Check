import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlobWorker} from '../src/worker-loader.js';

test('standalone worker avoids module-worker file CORS and releases its Blob URL',()=>{
  const OriginalWorker=globalThis.Worker;
  const originalRevoke=URL.revokeObjectURL;
  const revoked=[];
  let url,options;
  class FakeWorker{
    listeners={};
    terminated=false;
    constructor(workerURL,workerOptions){url=workerURL;options=workerOptions;}
    addEventListener(name,listener){this.listeners[name]=listener;}
    terminate(){this.terminated=true;}
  }
  try{
    globalThis.Worker=FakeWorker;
    URL.revokeObjectURL=value=>{revoked.push(value);originalRevoke(value);};
    const worker=createBlobWorker('self.onmessage=()=>postMessage("ready")');
    assert.match(url,/^blob:/);
    assert.equal(options,undefined,'classic worker is required for direct-file launching');
    assert.equal(revoked.length,0,'source remains available until worker starts');
    worker.listeners.message();
    assert.equal(revoked[0],url);
    worker.terminate();
    assert.equal(worker.terminated,true);
  }finally{
    globalThis.Worker=OriginalWorker;
    URL.revokeObjectURL=originalRevoke;
  }
});
