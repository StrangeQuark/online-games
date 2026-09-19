# Original scores

Both custom games synthesize their own music in the browser from `frontend/src/games/custom/audio.ts`. The compositions use original notes, arrangements, oscillators, and seeded percussion. No samples, audio service, streamed tracks, or third-party game music are used.

| Game | Track | Arrangement |
| --- | --- | --- |
| Starfall | Lagrange Lights | 64 bars, 245.76 seconds at 62.5 BPM. E minor–C–G–D–A minor–C–D–B minor harmony, warm sine pads, bell arpeggios, ascending chorus, soft kick and shimmer, breakdown, and finale. |
| Rift | Ion Foundry | 64 bars, 153.6 seconds at 100 BPM. D-minor-centered syncopated triangle bass, synthesized kick/snare/hi-hat, metallic square lead, octave-lifted chorus, breakdown, and rhythmic fills. |

The in-game sound control starts audio after a user gesture, supports muting/resuming, and closes audio contexts and timers when the game unmounts. Weapon, damage, building, and wave cues are also synthesized from source. The music is generated live; there are no prerecorded music files to download.

Rift also has six original synthesized weapon voices: a short carbine crack, a layered scattergun burst, a low rocket roar, pitched plasma pulses, a sustained metallic rail discharge, and a hollow grenade-launcher thump. They share the existing opt-in sound control and release their audio nodes after playback.

## Small arcade arrangements (September 19)

The newer solo games offer a separate **Play music** button. Music and effects can be enabled independently. Four original eight-bar arrangements are synthesized by `frontend/src/games/shared/ambientMusic.ts`:

| Mood | Games | Arrangement |
| --- | --- | --- |
| Forest | Wispwood | 72 BPM, D minor / B-flat / F / C; soft sine bells, sustained harmony and sparse melody. |
| Courtyard | Lumen, Petal, Pocket Putt, Parcel, Keepsake, Mosaic | 86 BPM, C / A minor / F / G; a small plucked triangle melody over warm bass and pads. |
| Neon | Neon Break | 108 BPM, A minor / F / C / G; repeating arpeggios, short bass notes and synthesized kick. |
| Coast | Driftline | 112 BPM, C / G / A minor / F; a syncopated lead, bell accents, bass and a soft driving pulse. |

A quiet stereo-free delay gives the notes space without loading audio files. Playback begins only from the music button, suspends in hidden tabs, and releases oscillators, timers and its AudioContext on navigation. Reduced-motion preferences affect visuals independently of audio. No music preference autoplays on a later visit.
