# Afterhours

An original browser arcade with React/Vite, Spring Boot, and PostgreSQL. Fifteen playable games, private multiplayer rooms, illustrated artwork, original synthesized music, and a simple username/password account with hiscores and complete game history.

[What’s new in the four-hour iteration](docs/WHATS_NEW.md) · [Validation and screenshots](docs/VALIDATION.md)

## Run locally

Requirements: Node 22.12+, Java 17+, Maven 3.6+, and Docker Compose.

Start PostgreSQL from the repository root:

```sh
docker compose up -d db
```

Start the backend in one terminal:

```sh
cd backend
mvn spring-boot:run
```

Start the frontend in another:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. You can play immediately as a guest, with a scorebook saved on this device. Join the club to keep future results with your account, or create a room in a multiplayer game and share its link/code to play with friends.

If port 8080 is occupied, start the backend with `PORT=8082 mvn spring-boot:run` and Vite with `API_TARGET=http://localhost:8082 npm run dev`. The packaged site and API use **http://localhost:8080**, with Vite on **5173** when started. This workspace uses Node 24; Node 22.12 or newer is supported.

Database defaults match Compose. In this workspace, Docker is unavailable, so development currently uses a separate native PostgreSQL 16 cluster on `127.0.0.1:5433`, started with `DATABASE_URL=jdbc:postgresql://127.0.0.1:5433/arcade` for Spring Boot; the existing Docker volume was left intact. Copy `.env.example` to `.env` for Compose overrides; export custom database variables into the backend shell as well. `docker compose stop` preserves scores in the named volume.

## One executable application

Build the frontend first, then package it into Spring Boot:

```sh
cd frontend
npm ci
npm run build
cd ../backend
mvn clean package
java -jar target/arcade-0.0.1-SNAPSHOT.jar
```

Open **http://localhost:8080**. This single Java process serves the site, API, and WebSocket endpoint; PostgreSQL remains the only other service. The Vite server is only needed during development.

For a public HTTPS host, set a unique database password, `SESSION_COOKIE_SECURE=true`, and `APP_ORIGINS` to the exact public origin. Keep PostgreSQL private. Cookies and rooms are kept in the single backend process; restarting it signs users out and closes rooms while preserving accounts and scores.

## Checks

```sh
cd backend
mvn test
cd ../frontend
npm test
npm run build
npm run test:e2e
```

Browser tests need the database, backend, and Vite running and use the installed Google Chrome. Set `E2E_BASE_URL` for another URL. Tests create their own users and remove only those users from the local Compose database afterward. For a native development database, set `E2E_DATABASE_URL` to its PostgreSQL connection URL; set `E2E_CLEANUP_DB=false` when cleanup must be managed separately. Run the E2E suite once at a time, since Playwright owns its output directory.

Rules tests cover legal chess moves (including perft), checkers captures/crowning, Solitaire card conservation, and Starfall’s power/economy/objectives. Browser tests cover the account lifecycle, real completed games and saved results, classic and custom multiplayer in separate browser contexts, card interactions, mobile layouts, audio lifecycle, and failure handling. See [validation notes](docs/VALIDATION.md).

## Games and assets

- **Chess and Checkers:** original rules engines and SVG pieces, three computer strengths, either side, hints, drag moves, three board themes, saved local matches and takeback history, local and private online play.
- **Solitaire:** draw-one or draw-three Klondike, daily and replayable deals, hints, undo, automatic foundations, three felt colors, saved solo deals and shared-deal races.
- **Starfall:** nine campaign missions, training, 30,000-mineral mining, endless survival, selectable fleets, speed mining, and sandbox. Independent energy networks, nine structure types, branching weapons, repair drones, finite asteroids, and cooperative construction.
- **Rift:** four original 3D arenas: an expanded Ion Foundry, Mosswater Aqueduct, Ember Citadel, and Orbital Array. Six weapons, sprint stamina, temporary speed/cloak/jetpack pickups, articulated armored characters, navigating bots, private multiplayer, and short score-based matches.
- **Neon Break:** eight brick-breaking sectors, three difficulties, armored and explosive bricks, five powerups, combos, and mouse/touch/keyboard controls.
- **Lumen:** twelve circuit puzzles plus a daily board, rotation, pinning, undo, hints, two tile themes, and saved progress.
- **Petal:** eight match-three gardens plus Zen play, six distinct flowers, cascading matches and special combinations, touch swipes, hints, and saved boards.
- **Driftline:** a free-roaming 3D city with 64 blocks, a detailed coupe, city traffic and signals, acceleration/braking/reverse, three camera views, three lighting presets, a destination map, six discoveries, saved travel journal, and keyboard/touch/gamepad driving. [City Edition details and controls](docs/DRIFTLINE_CITY.md).
- **Pocket Putt:** nine miniature golf holes with banks, sand, water, bumpers and portals; daily course order, mulligans, keyboard/touch aiming and saved rounds.
- **Fourfold:** four-in-a-row with three computer strengths, hints, takeback, either side, saved local play and private two-player rooms.
- **Mosaic:** ceramic tile merging on 4×4 or 5×5 boards, reproducible daily starts, three exact rewinds, touch swipes, two palettes, saved boards and bankable scores.
- **Keepsake:** five illustrated jigsaws in three sizes, interlocking pieces, mouse/touch/keyboard placement, picture guides, edge filtering, saved solo puzzles and simultaneous 1–4 player cooperation.
- **Parcel:** twelve courier puzzles plus a reproducible daily delivery, pushable parcels, route hints, undo, courtyard themes, click-to-walk and saved progress.
- **Wispwood:** eight forest platforming groves, double jumps, dash, springs, lanterns, forgiving checkpoints, keyboard/multi-touch/gamepad controls and saved journeys.

The shelf includes favorites, recent games, saved games, five daily challenges, search, genre filters and a surprise pick. Every game also offers three related picks and a favorite button. Focus mode gives each game more room. Solo progress stays in this browser for Chess, Checkers, Fourfold, Solitaire, Starfall, Neon Break, Lumen, Petal, Pocket Putt, Wispwood, Parcel, Keepsake and Mosaic; local records also track Neon Break and Driftline. Clearing browser storage removes device-only progress and guest scores. Account rounds interrupted by a connection error are kept in a device-local outbox and retried for the same account after reconnection or login.

- [Art and final generation prompts](docs/ART.md): original illustrations in `frontend/public/assets/`, generated with the built-in image tool, plus hand-authored in-game drawings.
- [Original music](docs/MUSIC.md): two full procedural soundtracks plus four gentle arcade arrangements, generated live with Web Audio.
- [Design, gameplay scope, and limitations](docs/DESIGN.md).
- [Backend API, security, and room protocol](backend/README.md).

Starfall reconstructs the documented systems, modes, and nine objective categories of *The Space Game* (2009) with original code, artwork, and music. Original maps, wave scripts, and unrecoverable timing values are reconstructed rather than extracted; the [reference inventory](docs/SPACE_GAME_REFERENCE.md) distinguishes verified values from estimates. Multiplayer uses a browser host and client-submitted results, so the leaderboard is intended for casual play, not cheat-resistant competition.
