# Validation — September 19, 2026

**Later update:** Driftline has been rebuilt as a free-roaming 3D city. See [City Edition and its validation](DRIFTLINE_CITY.md). The report below records the earlier four-hour iteration.

The four-hour iteration expands Afterhours from five games to fifteen. Checks use Node 24.15, Java 21, PostgreSQL 16, and installed Google Chrome. The application targets Node 22.12+ and Java 17+.

| Check | Result |
| --- | --- |
| Frontend rules and state tests | **196 passing tests in 21 files.** Includes all original rules/simulations, every new game, saved matches, guest records and score recovery. |
| Backend tests | **10 passing API and real WebSocket integration tests.** Every catalog game can save a result and appear in personal bests. |
| TypeScript and production Vite build | Pass. All fifteen games load as separate game bundles. |
| Final landscape/presentation follow-up | Pass. Includes true landscape touch input and a production CSS-order fix for Neon Break. |
| Formatting | `npm run format:check` passes. |
| Clean executable package | `mvn clean package` passes from an isolated copy, including the ten backend tests and current frontend assets. |
| Full browser regression | **84 of 84 passing** against the fifteen-game executable package, in 16.6 minutes. |

The main application bundle is approximately 248 kB minified / 79 kB compressed. Rift's lazy Three.js bundle is approximately 641 kB / 172 kB and produces Vite's default 500 kB advisory. It loads when Rift opens. The new games do not add a rendering framework or external runtime service.

After the full run, a final presentation pass adds browser-tab titles, keyboard Skip to content, a compact full-width shelf note, wider daily links and landscape touch layouts. The focused follow-up passes: eight existing site/mobile scenarios, the new landscape scenario, and all three Neon Break gameplay/mobile/resume scenarios. The full run plus follow-ups cover **85 distinct browser scenarios**. Landscape checks use real touch input at 844×390 and verify that every playfield and primary control remains on screen.

## What was played and checked

- **Chess and Checkers:** legal moves, captures, forced/chained jumps, promotions, checkmate, computer play from either side, board flipping, drag/keyboard/touch input, hints, takeback and private two-browser games. Rendered-pixel checks keep pieces visible during hover/selection/focus. Saved local matches reconstruct the legal move trail, exact board orientation and takeback history. Chess rules include perft 20/400/8,902 and special/draw rules.
- **Solitaire:** an actual seeded deal is solved with 132 interface actions and five Auto-finish moves. Draw-one/three, daily/replay deals, safe multi-card Auto-home, undo, foundation-farming prevention, real phone touch dragging and independent shared-deal races are covered. Solo resume restores cards, elapsed time and undo history.
- **Rift:** complete real-input rounds save once and exclude finished-room arrivals. All four arenas, ramps/stairs/jump routes, upper-floor weapons, mouse capture/Escape/fullscreen, touch controls, six weapons, sprint, jetpack, cloak, armor, shared pickups and host-selected map changes are played through browser controls. Simulation tests exercise navigation, weapons/projectiles, bots, collision and bounded timed perks. Pause, sensitivity, field of view, crosshair and reduced motion persist as intended.
- **Starfall:** the tutorial, funded campaign harvest, economy charts and cooperative building/upgrading/recycling run through browser input. Unit strategies legally complete all nine campaigns, training, mining, speed mining and six fleets; survival continues past wave six. Full-duration objectives retain their simulation duration. [Campaign strategy results](starfall-campaign-validation.json) describe the underlying scenarios. Solo checkpoints restore paused, preserving construction, economy and stations.
- **Neon Break:** real paddle input, launches, collision, powerups, pause, completed-run scoring, phone steering strip, gamepad and exact saved-run resume. Legal paddle simulation clears all eight sectors at each difficulty; engine checks enforce bounded balls, powerups, scoring and life/sector transitions.
- **Lumen:** actual browser rotations solve a network and save its result; keyboard turns, undo, pinning, hints, chapter unlocks, daily puzzle and exact saved orientation are checked. Engine tests solve every chapter.
- **Petal:** real swaps complete a garden, trigger cascades and save its result. Keyboard selection, illegal swaps, touch swipes, hints, saved boards and unlocks are checked. Legal strategies complete all eight garden goals; special-tile combinations and conservation are tested.
- **Driftline:** a complete coastal time trial saves its score and personal ghost. Keyboard, real touch input, gamepad, pause, settings, car paint and ghost persistence are covered. Scenic play remains active beyond the time-trial deadline. Simulation drivers complete all three roads. A 320-pixel audit exposed an internally scrolling welcome screen; its content now establishes the height so the start controls are visible.
- **Pocket Putt:** all nine authored holes are completed through real pointer drags, then the scorecard is saved to an account. Phone controls, mulligans and exact saved-round resume are covered. Fixed-step physics are checked at 30, 60 and 144 Hz, including cup capture, water, sand, banks and portals.
- **Fourfold:** a full local win and two-browser match/rematch, three computer strengths, side choice, keyboard columns, hints, takeback, saved local drops and resume from the home shelf. Snapshot validation replays the move history before accepting a board.
- **Wispwood:** all eight groves are completed with real keyboard movement, jumps and dashes, then saved to an account. Phone multi-touch movement/jump, pause/resume and standard gamepad input are checked. Every authored route is also traversed legally in simulation.
- **Parcel:** all twelve deliveries are solved with real keyboard movement and saved to an account. Actual phone touch input, tap-to-walk, undo, hints, palette, resume and daily delivery are covered. Every authored par is verified by a legal optimal-push solver; daily generation is reproducible and solvable. A separate [365-date check](daily-year-validation.json), from September 19, 2026 through September 18, 2027, legally solves every daily Parcel route at its advertised par and every daily Lumen circuit. It contains 277 distinct Parcel layouts; daily starts can revisit a layout.
- **Keepsake:** all five pictures are assembled through real dragging across 12/24/48-piece sizes. Phone drag, tap/keyboard placement, picture guide, edge filtering and exact resume are checked. Four simultaneous browser peers contribute and finish one puzzle; only contributors receive credit and a late arrival is excluded.
- **Mosaic:** long legal merging games preserve tile mass, unique positions and valid saves. Tests cover four directions, no double merge, impossible moves, exact deterministic rewind, blocked boards and daily reproducibility. Browser scenarios play a daily board with real keyboard controls, keep its score, swipe a roomier board on a phone and restore exact tiles from the home shelf.

## Site, accounts and presentation

The catalog, filters, favorites, recent games, Continue playing shelf, five daily links, keyboard search, related games, focus mode and guest scorebook are exercised in the browser. Every game opens without browser errors. Phone layouts are reviewed at 390 px; a separate 320 px audit checks clipped controls and page width. Parcel's chapter picker switches to four columns at that width. Screenshots are captured after animations settle so tile/piece appearance is inspected in its stable state.

Enrollment, confirmation errors, incorrect/case-insensitive login, logout, persistent sessions, HttpOnly/SameSite cookies, account isolation, history paging and service errors are covered. Completed scores have stable IDs. The persisted score outbox survives navigation/reload, retries failures and stays with its original account. The API rejects an expected-user mismatch. Guest history and personal bests remain local to the device, with a session fallback when storage is unavailable.

Original music starts only from its button, can be muted independently of effects, suspends in hidden tabs and closes its AudioContext on navigation. The original Rift/Starfall arrangements and all nine newer ambient-music integrations are checked. Generated cover sources/prompts and optimized assets are documented in [ART.md](ART.md); compositions are described in [MUSIC.md](MUSIC.md).

The longer browser scenarios advance the browser clock while executing real simulation/render frames. They do not inject wins, score results, minerals, kills or completed boards. Rift's full two-minute round takes roughly 4.3 minutes of test wall time on this machine's CPU-only SwiftShader renderer. Hardware WebGL frame rates and other browser engines have not been benchmarked in this iteration.

## Reproduction and limits

Run frontend tests, build and browser checks from `frontend/`; run Maven from `backend/`. See [README](../README.md) for commands. The final browser run targets an executable Spring Boot JAR, avoiding Vite reloads during long games. PostgreSQL is a separate native development cluster on `127.0.0.1:5433`; the existing Docker volume is untouched. Test cleanup removes only explicitly created test accounts.

The fourteen-game package run finished with 80 of 82 scenarios passing. Fourfold's immediate DOM comparison ran before its lazy component rendered; the assertion now waits for the expected rendered-disc count. Keepsake exposed a brief stale tray when starting a smaller puzzle after a larger one. The tray is now tied to its puzzle ID and falls back to the new puzzle's pieces immediately. Both corrections pass in the final run. Mosaic's initial banking check also exposed pointer capture intercepting its confirmation buttons; the board now excludes overlay controls, and real account banking passes. Earlier selector fixes distinguish Rift from Driftline and account for the intentionally hidden arena chooser during active play.

Original Space Game maps, wave scripts and unrecoverable timings remain documented reconstructions. The [reference inventory](SPACE_GAME_REFERENCE.md) distinguishes observed systems from calibration choices. These checks establish the implemented rules and representative strategies, not Flash-binary parity, all possible strategies, browser parity beyond Chrome or production-scale concurrency. Private multiplayer uses a browser host; client-submitted scores serve casual play. See [DESIGN.md](DESIGN.md).

## Reviewed screenshots

The updated [desktop entrance](screenshots/arcade-desktop.png), [whole game shelf](screenshots/arcade-shelf-desktop.png), [phone entrance](screenshots/arcade-mobile.png), [daily shelf](screenshots/daily-mobile.png), and [Continue playing cards](screenshots/continue-mobile.png) show the fifteen-game collection.

In-game views: [Neon Break](screenshots/neonbreak.png), [Lumen](screenshots/lumen.png), [Petal](screenshots/petal.png), [Driftline](screenshots/driftline.png), [Pocket Putt](screenshots/pocketputt.png), [Fourfold](screenshots/fourfold.png), [Wispwood](screenshots/wispwood.png), [Parcel](screenshots/parcel.png), [completed Keepsake](screenshots/keepsake-complete.png), [Mosaic](screenshots/mosaic.png), and [Mosaic on a phone](screenshots/mosaic-mobile.png). The earlier original-game screenshots remain in the same directory.

The tested executable is `backend/target/arcade-0.0.1-SNAPSHOT.jar` (SHA-256 `6e32ac16efc23dbbbc547f985674ea0d93d3c040d777913a565fae1b84794b25`). The final packaged site runs locally at `http://localhost:8080`; Vite remains available at `http://localhost:5173` against the same API.

A final smoke check against the delivered `:8080` process loads all fifteen covers, verifies Skip to content and route titles, and exchanges an actual Chess move between two separate browser contexts. It reports no browser errors. The temporary preview servers were stopped; the packaged site, Vite and the native PostgreSQL development cluster remain running.
