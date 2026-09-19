# A bigger Afterhours

**Later update:** Driftline has been rebuilt as a free-roaming 3D city. See [City Edition and its validation](DRIFTLINE_CITY.md). The report below records the earlier four-hour iteration.

The September 19 four-hour iteration grows the arcade from five games to **fifteen**, with ten new games and a polish pass across the original collection. Open the running site at **http://localhost:8080**, or use Vite at **http://localhost:5173**.

## Ten new games

| Game | Find your next round |
| --- | --- |
| **Neon Break** | Eight glowing brick-breaking sectors, three difficulties, five powerups, combos, saved runs and controller support. |
| **Lumen** | Twelve quiet circuit puzzles, daily boards, pinning, undo and hints. |
| **Petal** | Eight match-three gardens and Zen play, cascading flowers and special-tile combinations. |
| **Driftline** | Three scenic roads, drifting and boost, personal ghosts, car colors, and an untimed scenic mode. |
| **Pocket Putt** | Nine miniature golf gardens with banks, water, sand, portals, mulligans and a daily round. |
| **Fourfold** | Four-in-a-row against three computer strengths, on one screen, or in a private online room. |
| **Wispwood** | Eight forest groves, double jumps, dash, lanterns and forgiving checkpoints. |
| **Parcel** | Twelve thoughtful delivery puzzles, a daily route, undo, walking assistance and route hints. |
| **Keepsake** | Five illustrated jigsaws in three sizes, with solo saves and simultaneous cooperation for up to four people. |
| **Mosaic** | Ceramic tile merging, classic and spacious boards, daily starts, three rewinds and saved progress. |

Every new game has original cover artwork. Nine offer original, optional background music alongside independent effects. Keyboard and phone controls are provided where appropriate; Neon Break, Driftline and Wispwood also support standard gamepads.

## Familiar games, better evenings

Chess and Checkers now offer board themes, three computer strengths, either side, clearer orientation, drag controls and saved local matches with their takeback history. Solitaire gains daily/replayable deals, felt colors and exact saved solo deals. Rift gains pause and persistent sensitivity, field-of-view, crosshair and motion settings. Starfall gains paused checkpoint recovery and clearer station controls.

The website adds favorites, recent games, Continue playing cards, five daily challenges, search, a surprise pick, related-game suggestions and focus mode. Guests keep a local scorebook. Account results interrupted by a connection failure remain in an account-specific outbox and retry later.

Portrait and landscape phone layouts were played and inspected. The final build passed **196 frontend tests, 10 backend tests, and 85 distinct Chrome browser scenarios** across the full regression and focused follow-ups. A separate year-long check solved 365 daily Parcel routes and Lumen circuits. [Validation details and screenshots](VALIDATION.md) record the checks and their limits.

The executable is in `backend/target/arcade-0.0.1-SNAPSHOT.jar`. All source and artwork remain in the workspace; nothing was publicly deployed.
