import { Palette, Volume2, VolumeX } from "lucide-react";
import { usePreference } from "../shared/preferences";
import { useEffect, useRef } from "react";

export type Difficulty = "relaxed" | "club" | "challenger";
export const difficultyDepth = { relaxed: 1, club: 2, challenger: 3 };
const themes = ["garden", "walnut", "midnight"] as const;
export function useBoardStyle() {
  return usePreference("board-theme", "garden", themes);
}

export function BoardSettings({
  theme,
  setTheme,
  sound,
  setSound,
  difficulty,
  setDifficulty,
  side,
}: {
  theme: (typeof themes)[number];
  setTheme: (theme: (typeof themes)[number]) => void;
  sound: string;
  setSound: (sound: "on" | "off") => void;
  side?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  };
  difficulty?: Difficulty;
  setDifficulty?: (difficulty: Difficulty) => void;
}) {
  return (
    <div className="board-settings">
      <div className="board-theme-options" aria-label="Board appearance">
        <Palette size={14} aria-hidden="true" />
        {themes.map((t) => (
          <button
            key={t}
            className={`theme-swatch theme-${t}`}
            aria-label={`${t[0].toUpperCase() + t.slice(1)} board`}
            title={`${t[0].toUpperCase() + t.slice(1)} board`}
            aria-pressed={theme === t}
            onClick={() => setTheme(t)}
          />
        ))}
      </div>
      {difficulty && setDifficulty && (
        <label className="difficulty-picker">
          Opponent
          <select
            aria-label="Opponent difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="relaxed">Relaxed</option>
            <option value="club">Club player</option>
            <option value="challenger">Challenger</option>
          </select>
        </label>
      )}
      {side && (
        <label className="difficulty-picker">
          Play as
          <select
            aria-label="Play as"
            value={side.value}
            onChange={(e) => side.onChange(e.target.value)}
          >
            {side.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className="board-sound"
        aria-label={sound === "on" ? "Mute game sounds" : "Enable game sounds"}
        aria-pressed={sound === "on"}
        onClick={() => setSound(sound === "on" ? "off" : "on")}
      >
        {sound === "on" ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </button>
    </div>
  );
}

export function useBoardSound(
  move: unknown,
  capture: boolean,
  finished: boolean,
) {
  const [sound, setSound] = usePreference("board-sound", "off", [
    "on",
    "off",
  ] as const);
  const context = useRef<AudioContext | null>(null);
  const previous = useRef(move);
  useEffect(() => {
    if (previous.current === move) return;
    previous.current = move;
    if (sound !== "on" || !move) return;
    try {
      const ctx = (context.current ??= new AudioContext());
      if (ctx.state === "suspended") void ctx.resume();
      const frequencies = finished
        ? [392, 494, 587, 784]
        : capture
          ? [230, 340]
          : [420];
      frequencies.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.08;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency * 0.65,
          start + 0.11,
        );
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.07, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.19);
      });
    } catch {
      /* Audio is optional. */
    }
  }, [move, sound, capture, finished]);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  return [sound, setSound] as const;
}
