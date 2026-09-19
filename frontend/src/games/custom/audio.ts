import type { WeaponId } from "./rift/engine";

/** Small original generative scores. Audio only starts after a deliberate click. */
export type Soundtrack = "rift" | "starfall";

export function createAudio(kind: Soundtrack) {
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let beat = 0;
  let muted = true;
  let noise: AudioBuffer | null = null;
  // Each score has 64 bars: introduction, two verses, chorus, breakdown, finale.
  // Harmony changes every two bars; melody, voicing and percussion vary by phrase.
  const starChords = [
    [40, 47, 52, 55],
    [36, 43, 48, 52],
    [43, 50, 55, 59],
    [38, 45, 50, 54],
    [45, 52, 57, 60],
    [36, 43, 48, 52],
    [38, 45, 50, 54],
    [35, 42, 47, 50],
  ];
  const riftRoots = [38, 38, 41, 36, 38, 43, 36, 33];
  const melodyShape = [0, 2, 3, 1, 2, 0, 3, 2];

  function note(
    midi: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay = 0,
    attack = 0.025,
  ) {
    if (!context || !output || muted) return;
    const time = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  function drum(type: "kick" | "snare" | "hat", volume: number) {
    if (!context || !output || !noise || muted) return;
    const time = context.currentTime;
    const envelope = context.createGain();
    envelope.connect(output);
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + (type === "hat" ? 0.065 : 0.2),
    );
    if (type === "kick") {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(130, time);
      oscillator.frequency.exponentialRampToValueAtTime(37, time + 0.16);
      oscillator.connect(envelope);
      oscillator.start(time);
      oscillator.stop(time + 0.22);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
    } else {
      const source = context.createBufferSource();
      source.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = type === "hat" ? 7800 : 1400;
      source.connect(filter);
      filter.connect(envelope);
      source.start(time);
      source.stop(time + 0.22);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
    }
  }

  function tick() {
    const position = beat++ % 1024,
      step = position % 16,
      bar = Math.floor(position / 16),
      phrase = Math.floor(bar / 8);
    const chorus = (bar >= 24 && bar < 40) || bar >= 48;
    const breakdown = bar >= 40 && bar < 48;
    if (kind === "starfall") {
      // "Lagrange Lights": four minutes of warm pads, bell arpeggios and an
      // ascending chorus, resolving through E minor, C, G, D, A minor and B minor.
      const chord = starChords[Math.floor(bar / 2) % starChords.length];
      if (step === 0) {
        note(chord[0] - 12, 3.5, 0.12, "sine", 0, 0.25);
        for (const pitch of chord.slice(1))
          note(pitch, 3.8, 0.027, "sine", 0.03, 0.65);
        if (chorus) note(chord[0] + 24, 3.4, 0.025, "triangle", 0.1, 0.7);
      }
      if (step % (bar < 8 || breakdown ? 4 : 2) === 0) {
        const shape =
          melodyShape[(Math.floor(step / 2) + (bar % 2 ? 3 : 0)) % 8];
        const pitch = chord[shape] + 24 + (phrase === 7 && step > 8 ? 12 : 0);
        note(pitch, 1.6, chorus ? 0.067 : 0.046, "sine");
        note(pitch + 12, 1.1, 0.012, "sine", 0.22);
      }
      if (chorus && step % 4 === 2)
        note(
          chord[(Math.floor(step / 4) + 2) % 4] + 12,
          0.8,
          0.035,
          "triangle",
          0,
          0.1,
        );
      if (bar >= 8 && !breakdown) {
        if (step === 0 || step === 10) drum("kick", 0.045);
        if (step === 4 || step === 12) drum("hat", 0.013);
      }
    } else {
      // "Ion Foundry": syncopated industrial bass, kick/snare backbeat,
      // metallic melody, sparse middle section and an octave-lifted final chorus.
      const root = riftRoots[Math.floor(bar / 2) % riftRoots.length];
      const bassPattern = [
        0, -1, 0, 12, -1, 7, 0, -1, 0, 0, -1, 10, -1, 7, 3, -1,
      ];
      if (step === 0) {
        note(root - 12, 2.1, 0.065, "sine", 0, 0.2);
        if (bar >= 8) note(root + 19, 2.2, 0.018, "triangle", 0.1, 0.3);
      }
      if (bassPattern[step] >= 0 && (!breakdown || step % 4 === 0))
        note(
          root + bassPattern[step],
          0.2,
          step % 4 === 0 ? 0.14 : 0.085,
          "triangle",
        );
      if (bar >= 4 && !breakdown) {
        if ([0, 6, 8].includes(step) || (chorus && step === 14))
          drum("kick", 0.22);
        if (step === 4 || step === 12) drum("snare", 0.085);
        if (step % (chorus ? 1 : 2) === 0)
          drum("hat", step % 4 === 0 ? 0.035 : 0.018);
      }
      if (chorus && step % 2 === 1)
        note(
          root + [24, 31, 27, 34, 31, 36, 34, 27][Math.floor(step / 2)],
          0.25,
          0.03,
          "square",
        );
      if (bar % 8 === 7 && step >= 12) {
        note(root + 36 + (step - 12) * 2, 0.35, 0.026, "sine");
        if (!breakdown) drum("snare", 0.045);
      }
      if (breakdown && step === 8) note(root + 31, 1.8, 0.05, "sine");
    }
  }

  return {
    async toggle() {
      if (!context) {
        context = new AudioContext();
        output = context.createGain();
        output.gain.value = 0.38;
        output.connect(context.destination);
        noise = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * 0.25),
          context.sampleRate,
        );
        const data = noise.getChannelData(0);
        // Seeded noise makes the generated percussion reproducible.
        let seed = 173;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          data[i] = seed / 2147483648 - 1;
        }
      }
      await context.resume();
      muted = !muted;
      if (!muted && !timer) {
        tick();
        timer = setInterval(tick, kind === "starfall" ? 240 : 150);
      }
      if (muted && timer) {
        clearInterval(timer);
        timer = null;
      }
      if (output)
        output.gain.setTargetAtTime(
          muted ? 0 : 0.38,
          context.currentTime,
          0.06,
        );
      return !muted;
    },
    effect(type: "shot" | "hit" | "build" | "wave", weapon?: WeaponId) {
      if (type === "shot" && kind === "rift" && weapon) {
        // Original synthesized voices: short mechanical transients and tuned energy tails.
        if (weapon === "plasma") {
          note(87, 0.09, 0.12, "sine", 0, 0.003);
          note(63, 0.14, 0.055, "triangle", 0.025, 0.003);
        } else if (weapon === "rail") {
          drum("hat", 0.13);
          note(94, 0.3, 0.075, "sawtooth", 0, 0.003);
          note(46, 0.23, 0.17, "triangle", 0.012, 0.003);
        } else if (weapon === "rocket") {
          drum("snare", 0.16);
          drum("kick", 0.25);
          note(29, 0.35, 0.14, "sawtooth", 0.02, 0.005);
        } else if (weapon === "grenade") {
          drum("kick", 0.28);
          note(40, 0.18, 0.12, "square", 0, 0.003);
          note(73, 0.045, 0.04, "triangle", 0.08, 0.003);
        } else if (weapon === "shotgun") {
          drum("snare", 0.24);
          drum("kick", 0.23);
          note(41, 0.16, 0.1, "sawtooth", 0, 0.003);
        } else {
          drum("hat", 0.1);
          note(65, 0.055, 0.12, "sawtooth", 0, 0.003);
          note(38, 0.11, 0.15, "triangle", 0.02, 0.003);
        }
        return;
      }
      if (type === "shot") {
        note(65, 0.055, 0.12, "sawtooth");
        note(38, 0.11, 0.15, "triangle", 0.02);
      }
      if (type === "hit") note(34, 0.22, 0.22, "triangle");
      if (type === "build") {
        note(72, 0.2, 0.1, "sine");
        note(79, 0.32, 0.1, "sine", 0.1);
      }
      if (type === "wave") {
        note(45, 0.6, 0.12, "triangle");
        note(46, 0.6, 0.08, "sine");
      }
    },
    dispose() {
      if (timer) clearInterval(timer);
      timer = null;
      if (context && context.state !== "closed") void context.close();
      context = null;
      output = null;
      noise = null;
    },
  };
}
