// Browser speech-to-text worker (Whisper via transformers.js). Loaded only when the user generates
// captions; the library and the model download once and are kept in the browser cache.
// Messages in:  {type:'run', id, model, audio:Float32Array(16 kHz mono), language, translate}
// Messages out: {type:'progress', phase:'download'|'load'|'transcribe', pct}, {type:'done', segments}, {type:'error', message}
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js';
const SR = 16000;
let T = null;
const pipes = {};

const post = (m) => self.postMessage(m);

async function getPipe(model, device) {
  const key = model + '|' + device;
  if (pipes[key]) return pipes[key];
  if (!T) T = await import(LIB);
  T.env.allowLocalModels = false;
  T.env.useBrowserCache = true;
  // Track total download progress across all model files.
  const files = {};
  const progress_callback = (p) => {
    if (p.status === 'progress' && p.total) {
      files[p.file] = { loaded: p.loaded, total: p.total };
      let a = 0, b = 0;
      for (const k in files) { a += files[k].loaded; b += files[k].total; }
      post({ type: 'progress', phase: 'download', pct: b ? a / b : 0, loaded: a, total: b });
    } else if (p.status === 'ready') post({ type: 'progress', phase: 'load', pct: 1 });
  };
  pipes[key] = await T.pipeline('automatic-speech-recognition', 'onnx-community/' + model, {
    device, dtype: device === 'webgpu' ? { encoder_model: 'fp16', decoder_model_merged: 'q8' } : 'q8', progress_callback,
  });
  return pipes[key];
}

// Cut long audio into windows of at most 30 s, splitting at the quietest moment near the end of each.
function windows(audio) {
  const out = [];
  const max = 29 * SR, min = 20 * SR, hop = SR / 50;
  let a = 0;
  while (a < audio.length) {
    let b = Math.min(audio.length, a + max);
    if (b < audio.length) {
      let best = b, bestE = Infinity;
      for (let s = a + min; s + hop <= b; s += hop) {
        let e = 0;
        for (let i = s; i < s + hop; i++) e += audio[i] * audio[i];
        if (e < bestE) { bestE = e; best = s + hop / 2; }
      }
      b = Math.round(best);
    }
    out.push([a, b]);
    a = b;
  }
  return out;
}

async function run(msg) {
  const device = msg.device || 'wasm';
  const pipe = await getPipe(msg.model, device);
  const win = windows(msg.audio);
  const segments = [];
  for (let i = 0; i < win.length; i++) {
    let [a, b] = win[i];
    post({ type: 'progress', phase: 'transcribe', pct: i / win.length });
    // Skip leading silence: Whisper stamps the first words at the start of the window otherwise.
    const blk = SR / 100;
    let peak = 0;
    for (let j = a; j < b; j += 32) peak = Math.max(peak, Math.abs(msg.audio[j]));
    if (peak < 0.003) continue; // silence
    const thr = Math.max(0.004, peak * 0.06);
    let s0 = a;
    while (s0 + blk < b) {
      let e = 0;
      for (let j = s0; j < s0 + blk; j++) e = Math.max(e, Math.abs(msg.audio[j]));
      if (e > thr) break;
      s0 += blk;
    }
    a = Math.max(a, s0 - Math.round(SR * 0.15));
    const chunk = msg.audio.subarray(a, b);
    const opts = { return_timestamps: true, task: msg.translate ? 'translate' : 'transcribe' };
    if (msg.language && msg.language !== 'auto') opts.language = msg.language;
    const r = await pipe(chunk, opts);
    const t0 = a / SR, dur = (b - a) / SR;
    const chunks = r.chunks && r.chunks.length ? r.chunks : [{ timestamp: [0, dur], text: r.text }];
    for (const c of chunks) {
      const s = c.timestamp && c.timestamp[0] != null ? c.timestamp[0] : 0;
      const e = c.timestamp && c.timestamp[1] != null ? c.timestamp[1] : dur;
      segments.push({ from: t0 + Math.min(s, dur), to: t0 + Math.min(Math.max(e, s), dur), text: c.text });
    }
  }
  post({ type: 'progress', phase: 'transcribe', pct: 1 });
  return segments;
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type !== 'run') return;
  try {
    post({ type: 'done', id: msg.id, segments: await run(msg) });
  } catch (err) {
    post({ type: 'error', id: msg.id, message: (err && err.message) || String(err) });
  }
};
