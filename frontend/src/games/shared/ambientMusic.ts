/** Original, opt-in miniature arrangements. No samples or downloaded audio. */
export type MusicMood = "forest" | "courtyard" | "neon" | "coast";
const arrangements = {
  forest: {
    bpm: 72,
    roots: [50, 46, 53, 48],
    minor: [true, false, false, false],
    pattern: [0, -1, 2, -1, 1, 3, -1, 2, 0, 2, -1, 1, 3, -1, 2, -1],
  },
  courtyard: {
    bpm: 86,
    roots: [48, 45, 53, 55],
    minor: [false, true, false, false],
    pattern: [0, 2, -1, 1, 3, -1, 2, 1, 0, -1, 2, 3, 1, 2, -1, 0],
  },
  neon: {
    bpm: 108,
    roots: [45, 41, 48, 43],
    minor: [true, false, false, false],
    pattern: [0, 2, 3, 1, 2, 4, 3, 2, 0, 1, 3, 2, 4, 2, 1, 3],
  },
  coast: {
    bpm: 112,
    roots: [48, 43, 45, 41],
    minor: [false, false, true, false],
    pattern: [0, -1, 2, 1, 3, -1, 2, 4, 2, 0, -1, 1, 3, 2, 4, -1],
  },
} as const;
export function createAmbientMusic(mood: MusicMood) {
  let ctx: AudioContext | null = null,
    bus: GainNode | null = null,
    master: GainNode | null = null,
    timer: ReturnType<typeof setInterval> | null = null,
    enabled = false,
    disposed = false,
    next = 0,
    step = 0;
  const arrangement = arrangements[mood],
    beat = 60 / arrangement.bpm;
  function setup() {
    if (ctx) return;
    ctx = new AudioContext();
    bus = ctx.createGain();
    master = ctx.createGain();
    master.gain.value = 0;
    const delay = ctx.createDelay(1),
      feedback = ctx.createGain(),
      wet = ctx.createGain();
    delay.delayTime.value = beat * 0.75;
    feedback.gain.value = 0.18;
    wet.gain.value = 0.17;
    bus.connect(master);
    bus.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
    master.connect(ctx.destination);
  }
  function note(
    midi: number,
    at: number,
    length: number,
    volume: number,
    wave: OscillatorType = "sine",
  ) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      at + (length > 1 ? 0.09 : 0.012),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + length + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  function kick(at: number) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.frequency.setValueAtTime(135, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.14);
    gain.gain.setValueAtTime(0.075, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + 0.22);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  function schedule() {
    if (
      !enabled ||
      !ctx ||
      ctx.state !== "running" ||
      document.hidden ||
      disposed
    )
      return;
    while (next < ctx.currentTime + 0.18) {
      const bar = Math.floor(step / 8),
        chord = Math.floor(bar / 2) % 4,
        root = arrangement.roots[chord],
        third = arrangement.minor[chord] ? 3 : 4,
        tones = [0, third, 7, 12, 14],
        motif = arrangement.pattern[step % 16];
      if (step % 8 === 0) {
        note(root, next, beat * 3.7, 0.055, "sine");
        for (const interval of [0, third, 7])
          note(root + 12 + interval, next, beat * 3.6, 0.012, "sine");
      }
      if (motif >= 0) {
        const octave = mood === "forest" ? 24 : 12;
        note(
          root + octave + tones[motif],
          next,
          beat * (mood === "forest" ? 1.6 : 0.72),
          mood === "neon" ? 0.033 : 0.048,
          mood === "forest" ? "sine" : "triangle",
        );
      }
      if ((mood === "neon" || mood === "coast") && step % 2 === 0) {
        kick(next);
        if (step % 8 !== 0)
          note(root - 12, next, beat * 0.42, 0.075, "triangle");
      }
      if (mood === "coast" && step % 4 === 3)
        note(root + 24 + 7, next, beat * 0.18, 0.021, "triangle");
      step++;
      next += beat / 2;
    }
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (ctx && master && ctx.state !== "closed") {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
    }
  }
  function start() {
    if (!ctx || disposed || !enabled || document.hidden) return;
    const active = ctx;
    void active
      .resume()
      .then(() => {
        if (disposed || !enabled || document.hidden || ctx !== active) return;
        stop();
        next = active.currentTime + 0.035;
        master!.gain.setTargetAtTime(0.55, active.currentTime, 0.06);
        schedule();
        timer = setInterval(schedule, 65);
      })
      .catch(() => {});
  }
  function setEnabled(value: boolean) {
    enabled = value;
    try {
      if (enabled) {
        setup();
        start();
      } else stop();
    } catch {
      enabled = false;
    }
    return enabled;
  }
  const visibility = () => {
    if (document.hidden) {
      stop();
      if (ctx?.state === "running") void ctx.suspend().catch(() => {});
    } else if (enabled) start();
  };
  document.addEventListener("visibilitychange", visibility);
  return {
    setEnabled,
    dispose() {
      disposed = true;
      enabled = false;
      stop();
      document.removeEventListener("visibilitychange", visibility);
      void ctx?.close().catch(() => {});
      ctx = null;
      bus = null;
      master = null;
    },
  };
}
