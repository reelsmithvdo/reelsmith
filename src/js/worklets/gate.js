// Noise gate (AudioWorklet): mutes the signal while it stays below the threshold, with smooth attack/release.
class RsGate extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'threshold', defaultValue: -50, minValue: -100, maxValue: 0 }]; }
  constructor() { super(); this.env = 0; this.g = 0; } // starts closed: quiet noise at the start is not let through
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length) return true;
    const thr = Math.pow(10, params.threshold[0] / 20);
    const att = Math.exp(-1 / (0.002 * sampleRate)), rel = Math.exp(-1 / (0.12 * sampleRate)), envRel = Math.exp(-1 / (0.05 * sampleRate));
    const n = input[0].length;
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let ch = 0; ch < input.length; ch++) m = Math.max(m, Math.abs(input[ch][i]));
      this.env = m > this.env ? m : this.env * envRel + m * (1 - envRel);
      const target = this.env >= thr ? 1 : 0;
      this.g = target > this.g ? target + (this.g - target) * att : target + (this.g - target) * rel;
      for (let ch = 0; ch < output.length; ch++) output[ch][i] = (input[ch] || input[0])[i] * this.g;
    }
    return true;
  }
}
registerProcessor('rs-gate', RsGate);

// Pitch shifter (voice effects): two crossfaded read taps sweep through a short delay line,
// changing pitch without changing speed. ratio > 1 = higher (chipmunk), < 1 = deeper.
class RsPitch extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'ratio', defaultValue: 1, minValue: 0.25, maxValue: 4 }]; }
  constructor() {
    super();
    this.N = 16384; this.win = Math.round(sampleRate * 0.05);
    this.buf = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.ph = 0;
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length) return true;
    const r = params.ratio[0], N = this.N, win = this.win, step = (1 - r) / win;
    const n = output[0].length;
    for (let i = 0; i < n; i++) {
      for (let ch = 0; ch < 2; ch++) this.buf[ch][this.w] = (input[ch] || input[0])[i];
      this.ph += step;
      if (this.ph >= 1) this.ph -= 1; else if (this.ph < 0) this.ph += 1;
      for (let ch = 0; ch < output.length; ch++) {
        let v = 0;
        for (let k = 0; k < 2; k++) {
          const p = (this.ph + k * 0.5) % 1;
          const d = p * win + 2;
          let pos = this.w - d; if (pos < 0) pos += N;
          const i0 = Math.floor(pos), f = pos - i0, b = this.buf[ch & 1];
          const s = b[i0] * (1 - f) + b[(i0 + 1) % N] * f;
          v += s * (1 - Math.abs(2 * p - 1));
        }
        output[ch][i] = v;
      }
      this.w = (this.w + 1) % N;
    }
    return true;
  }
}
registerProcessor('rs-pitch', RsPitch);
