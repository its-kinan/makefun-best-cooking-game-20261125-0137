// The Copper Ladle — audio: every sound is synthesized in WebAudio.
// No audio files ship with the game; the first user gesture creates the
// context (browsers demand that) and everything after is oscillators and
// filtered noise. Mute with M.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    const c = ensure();
    if (!c || muted) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSizzle();
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(520, 0.07, 'sine', 0.12, 760);
    },
    chop() {
      noise(0.06, 0.25, 900);
      tone(180, 0.06, 'triangle', 0.18, 120);
    },
    place() {
      tone(340, 0.06, 'sine', 0.1, 260);
    },
    cooked() {
      tone(660, 0.09, 'sine', 0.12);
      setTimeout(() => tone(880, 0.12, 'sine', 0.12), 90);
    },
    serve() {
      tone(784, 0.1, 'triangle', 0.14);
      setTimeout(() => tone(1047, 0.16, 'triangle', 0.14), 100);
    },
    fail() {
      tone(160, 0.22, 'sawtooth', 0.1, 90);
    },
    tick() {
      tone(980, 0.04, 'square', 0.05);
    },
    startSizzle() {
      const c = ensure();
      if (!c || muted || sizzle) return;
      const len = c.sampleRate;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 4000;
      const gain = c.createGain();
      gain.gain.value = 0.03;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      sizzle = { src, gain };
    },
    stopSizzle() {
      if (!sizzle) return;
      try {
        sizzle.src.stop();
      } catch {
        // Already stopped.
      }
      sizzle = null;
    },
  };
}
