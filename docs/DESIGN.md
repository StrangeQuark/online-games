# Afterhours: fifteen games, one small application

One React/Vite client, one Spring Boot server, and PostgreSQL with two tables: accounts and completed results. No ORM, client state framework, authentication service, queue, or cache service. Hash routes let the same static build run through Vite or inside the executable Spring Boot JAR. Each game loads only when opened.

Rules and simulation stay beside their game components. Classics and tabletop puzzles use React, CSS and SVG. Starfall, Neon Break, Driftline, Pocket Putt and Wispwood use Canvas 2D. Rift uses Three.js for WebGL rendering, with a small original movement/combat simulation and a shared map definition for visible geometry and collision. Three.js is the only added game rendering dependency.

| Game | Play | Implemented scope |
| --- | --- | --- |
| Chess | Computer, local two-player, private online match | Full legal movement, castling, en passant, four promotions, checkmate/stalemate, repetition/fifty-move/material draws; bounded tactical AI, captured pieces, takeback, keyboard navigation. |
| Checkers | Computer, local two-player, private online match | American checkers, mandatory/chained captures, crowning, bounded AI, animated captures, whole-turn takeback. |
| Solitaire | Solo or two-player shared-deal race | Draw-one or draw-three Klondike, stock recycling, click/drag/touch moves, hints, undo, safe Auto-home and full Auto-finish, scoring without foundation farming. Opponents operate separate boards from one seeded deal. |
| Starfall | Solo or up to four cooperating commanders | Training, nine campaign objectives, Mining (30,000 minerals, four difficulties), endless Survival (three difficulties), six selectable fleet challenges, Speed miner, Sandbox. Nine station types and seven enemy types; independent energy networks, construction/upgrade costs and time, branching Pulser/THEL weapons, finite minerals, homing splash missiles paid in minerals, interception, repair drones, recycling, pause/speeds, camera/minimap, settings, and economy history charts. |
| Rift | Solo with bots or up to four humans plus bots | Four distinct 3D arenas with ramps, stairs, tunnels and multiple elevations; jump, fueled jet flight, sprint stamina, timed overdrive/cloak pickups; carbine, scattergun, rockets, plasma bolts, rail rifle and bouncing grenades; clips/reserves/reload, armor/health/ammo respawns, navigating bots, pointer-lock/touch controls, 120-second/12-frag matches. |
| Neon Break | Solo | Eight sectors, three difficulties, armored/explosive bricks, five powerups, combos, lives, keyboard/pointer/touch/gamepad controls, pause, gentle motion and exact run saves. |
| Lumen | Solo | Twelve authored circuit chapters, reproducible daily board, rotation, pinning, undo, hints, stars, tile themes and saved progress. |
| Petal | Solo | Eight garden challenges and Zen play, six flower shapes, line/burst/prism specials and combinations, cascades, shuffle, hints, keyboard/touch and saved boards. |
| Driftline | Solo | Three curved, hilly pseudo-3D roads, traffic, drift/boost, checkpoints, personal time-trial ghosts, untimed scenic mode, car colors, keyboard/touch/gamepad and gentle motion. |
| Pocket Putt | Solo | Nine authored miniature golf holes with sand, water, banks, bumpers and portals; fixed-step ball physics, daily course order, aim preview, three mulligans and saved rounds. |
| Fourfold | Computer, local two-player, private online match | Four-in-a-row, three AI strengths, either side, keyboard controls, hints, takeback, three board themes, saved local matches and host-validated online turns/rematches. |
| Wispwood | Solo | Eight forest groves, double jump, dash, springs, thorns, three lanterns per grove, forgiving checkpoints, saved journeys and keyboard/touch/gamepad. |
| Parcel | Solo | Twelve push-puzzle courtyards, reproducible daily delivery, optimal-push hint solver, undo, tap-to-walk, directional controls, par stars, two themes and saved routes. |
| Keepsake | Solo or up to four cooperating players | Five illustrated scenes, 12/24/48 interlocking pieces, drag/tap/keyboard placement, picture guide, edge filter, tray paging/shuffle and saved solo puzzles. Peers can place simultaneously; only contributors earn a completed puzzle. |
| Mosaic | Solo | Ceramic 2048-style tile merging on 4×4 or 5×5 boards, reproducible daily starts, three deterministic rewinds, keyboard/swipes/buttons, two palettes, local saves and optional early score banking. |

Starfall reconstructs the documented original *The Space Game* (2009) systems. The nine objective categories, structure costs/upgrades, reserves, mining output, and weapon roles come from contemporary references; see [the evidence and uncertainty inventory](SPACE_GAME_REFERENCE.md). Exact original maps, scripts, starting resources beyond verified Mission 1, enemy health/timing, most energy consumption, and link behavior beyond documented constraints could not be recovered. Those values are isolated in the catalog and simulation and calibrated with legal, funded strategies. This is original source and presentation, not a recovered Flash binary or a literal copy of its assets. Rift is an original small arena shooter inspired by early FPS games, with four arenas.

# Multiplayer and data

The server authenticates identities, manages private rooms, restricts packet size/rate, and forwards guest actions to the host. The host validates actions, runs the game, and sends snapshots. A new player receives the current state. Rift and Starfall interpolate presentation between network snapshots. Rift arena selection belongs to the host between rounds, and inputs carry the round ID so stale actions are rejected after map changes. Room control belongs to the host; Starfall guests can construct, inspect, upgrade, target, and recycle together. Solitaire races maintain independent boards.

When the host leaves, peers see that the room ended. Rooms do not survive server restarts. There is no host migration or dedicated simulation service; keep the host tab active during play. The game loops bound catch-up work rather than attempting unbounded background simulation. One backend process is sufficient for this architecture.

Scores have stable round identifiers and queued retries are idempotent. A late arrival to a completed round cannot earn its score. Training and Sandbox do not submit Starfall hiscores. Recall explicitly ends and records an active expedition. Usernames, BCrypt password hashes, scores, and outcomes are the durable application data. History is paginated and all results contribute to personal bests. Settings, campaign checkmarks and unfinished solo games are local browser preferences. Chess and Checkers reconstruct saved matches from their legal move trails; other saved games validate their snapshots before restoring. Multiplayer sessions do not overwrite local tabletop saves. Accounts have no email recovery; guests can play immediately.

Guest completions have a device-local scorebook, personal bests and bounded history. Failed account completions enter a persistent, account-specific local outbox. The client retries on reconnection, focus or login; the API checks the expected account ID before writing. Clearing browser storage removes guest history, unfinished local games and unsent results. Completed account results already received by PostgreSQL remain durable.

The home shelf has favorites, recent games, a Continue playing section, five daily links, filters and search. Focus mode removes the surrounding site furniture. Keyboard, touch and reduced-motion options are implemented per game. Music starts only through a gesture, is independent of effects, pauses in hidden tabs and releases audio resources when leaving a game.

Gameplay and submitted scores are trusted at the browser boundary. The leaderboard serves casual play; it is not resistant to a modified client. Public deployment requires HTTPS, a unique database password, secure session cookies, and an explicit allowed origin; see [the backend API and operational notes](../backend/README.md).

# Performance bounds

Starfall has at most 220 stations, 180 simultaneous enemies, 1,600 active missiles, and 60 pending fleet groups. Cosmetic particles are bounded; only the latest 720 economy history samples are retained. Snapshots retain gameplay state, round transport precision to three decimal places, and retain bounded explosion particles for every commander. A maximal synthetic room snapshot is checked against the 512 KiB protocol limit.

Rift batches static geometry and modeled rigs. Hardware WebGL retains higher render resolution; software WebGL uses a smaller internal frame with a sharp HTML HUD. Browser tests cover Chrome with software rendering in this environment. Other browsers and production-scale concurrency have not been benchmarked.
