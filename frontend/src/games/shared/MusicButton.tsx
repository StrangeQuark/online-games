import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import { createAmbientMusic, type MusicMood } from "./ambientMusic";
export default function MusicButton({ mood }: { mood: MusicMood }) {
  const player = useRef<ReturnType<typeof createAmbientMusic> | null>(null),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    const engine = createAmbientMusic(mood);
    player.current = engine;
    setPlaying(false);
    return () => {
      engine.dispose();
      player.current = null;
    };
  }, [mood]);
  return (
    <button
      className={`arcade-button icon arcade-music-button${playing ? " playing" : ""}`}
      aria-label={playing ? "Pause music" : "Play music"}
      aria-pressed={playing}
      title={playing ? "Pause music" : "Play original background music"}
      onClick={() => setPlaying(player.current?.setEnabled(!playing) ?? false)}
    >
      <Music2 size={16} />
    </button>
  );
}
