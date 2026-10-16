export const MODEL_ID = 'Qwen3-4B-q4f16_1-MLC';
export const MODEL_NAME = 'Qwen3-4B';
export const MODEL_SIZE_LABEL = 'ca. 2.5 GB';
export const WEBLLM_VERSION = '0.2.80';
// May be replaced with an absolute URL to a reviewed, self-hosted ES module bundle.
export const WEBLLM_URL = `https://esm.run/@mlc-ai/web-llm@${WEBLLM_VERSION}`;
export const CONTEXT_WINDOW_SIZE = 8192;
// Total UTF-8 bytes of metadata, excluding prompt instructions and field labels.
export const METADATA_MAX_BYTES = 4500;
export const CHAT_TEMPLATE_RESERVE = 256;
export const ANALYSIS_MAX_TOKENS = 1700;
export const GENERATION_MAX_TOKENS = 700;

// Sampling and validation retries (retries after the first attempt; integer >= 0).
export const TEMPERATURE = 0.2;
export const MAX_RETRIES = 1;

// Worker inactivity deadline and grace period after cancelling, in milliseconds.
export const WORKER_TIMEOUT_MS = 300_000;
export const CANCEL_TIMEOUT_MS = 10_000;

// Model requirements: memory is an estimate for display, not an allocation limit.
export const MODEL_GPU_MEMORY_GB = 4.1;
export const REQUIRED_GPU_FEATURES = Object.freeze(['shader-f16']);
