/** Short original effects, activated only by a player's sound button. */
export function createArcadeAudio() {
  let ctx: AudioContext | null = null,
    enabled = false,
    last = 0;
  const setEnabled = (value: boolean) => {
    enabled = value;
    try {
      if (enabled) {
        ctx ??= new AudioContext();
        void ctx.resume();
      }
    } catch {
      enabled = false;
    }
    return enabled;
  };
  const play = (kind: "hit" | "power" | "lose" | "win" | "move" | "clear") => {
    if (!enabled || !ctx || ctx.state !== "running") return;
    if (kind === "hit" && ctx.currentTime - last < 0.035) return;
    last = ctx.currentTime;
    const pitches =
      kind === "win"
        ? [392, 494, 587, 784]
        : kind === "power"
          ? [523, 659, 784]
          : kind === "lose"
            ? [220, 165, 110]
            : kind === "clear"
              ? [440, 660, 880]
              : kind === "move"
                ? [330]
                : [620 + Math.random() * 160];
    pitches.forEach((frequency, i) => {
      const o = ctx!.createOscillator(),
        g = ctx!.createGain(),
        at = ctx!.currentTime + i * 0.075;
      o.type = kind === "hit" ? "triangle" : "sine";
      o.frequency.setValueAtTime(frequency, at);
      o.frequency.exponentialRampToValueAtTime(frequency * 0.8, at + 0.16);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(
        kind === "hit" ? 0.035 : 0.065,
        at + 0.008,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.23);
      o.connect(g);
      g.connect(ctx!.destination);
      o.start(at);
      o.stop(at + 0.25);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    });
  };
  return {
    setEnabled,
    play,
    dispose: () => {
      enabled = false;
      void ctx?.close();
      ctx = null;
    },
  };
}
