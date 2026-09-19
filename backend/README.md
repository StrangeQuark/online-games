# Arcade server

Java 17+ and Maven 3.6+ are required. PostgreSQL is the only runtime database; H2 is used only in automated tests. There are no ORM entities, migration frameworks, Redis, or extra services. The schema is two tables initialized by `schema.sql`.

From the project root, start the database:

```sh
docker compose up -d db
```

Then run the API:

```sh
cd backend
mvn spring-boot:run
```

The default port is 8080. Use `PORT=8082 mvn spring-boot:run` if that port is occupied, and configure Vite's proxy to that port. If your environment sets `DEBUG`, unset it or set `DEBUG=false` to keep Spring's logging at normal verbosity. Database defaults match `docker-compose.yml`. `.env.example` documents environment settings; Spring does not automatically load a root `.env` file, so export custom values in your shell. The database volume persists across restarts.

Run `mvn test` for API and real WebSocket integration tests. Build an executable jar with `mvn package`, then start it using `java -jar target/arcade-0.0.1-SNAPSHOT.jar`.

## HTTP API

All write requests require `Content-Type: application/json`. Responses are JSON; errors have `{ "error": "Human-readable message." }`. Use the frontend on the same origin through Vite's `/api` and `/ws` proxy. Direct cross-origin API access is intentionally not enabled.

| Method | Path | Request / response |
|---|---|---|
| GET | `/api/health` | `{status:"ok"}` |
| GET | `/api/auth/me` | `{user:{id,username}}` or `{user:null}` |
| POST | `/api/auth/enroll` | `{username,password,confirmPassword}` → `{user}`; HTTP 201 |
| POST | `/api/auth/login` | `{username,password}` → `{user}` |
| POST | `/api/auth/logout` | `{}` → `{ok:true}` |
| GET | `/api/profile?offset=0` | `{user,highScores:[{game,score}],history:[{id,game,score,outcome,playedAt}],totalGames,hasMore}` |
| GET | `/api/leaderboard` | `[{username,game,score}]`; top ten per game |
| POST | `/api/scores` | `{game,score,outcome,runId}` → `{saved:true}` or `{saved:false}` on duplicate |

Usernames are case-insensitively unique, 3–20 ASCII letters, numbers, or underscores. Passwords require at least eight characters and at most 72 UTF-8 bytes. Only BCrypt hashes are stored. Login rotates the server session, which expires after eight hours of inactivity. Cookies are HttpOnly and SameSite=Lax. For HTTPS deployment, set `SESSION_COOKIE_SECURE=true` and `APP_ORIGINS` to the exact public origin. Origin validation and JSON-only writes protect browser requests against CSRF. Enrollment/login are limited to 30 requests per minute per direct client IP; a trusted reverse proxy should also enforce appropriate edge limits.

Valid score games: `chess`, `solitaire`, `checkers`, `rift`, `starfall`, `neonbreak`, `lumen`, `petal`, `driftline`, `pocketputt`, `fourfold`, `wispwood`, `parcel`, `keepsake`, `mosaic`. Scores are integers from 0 to 100,000,000. Outcomes are 1–32 letters/numbers/spaces/underscores/dashes. Run IDs are 8–80 letters/numbers/underscores/dashes. A unique `(user_id, run_id)` constraint makes completion retries idempotent. The optional `expectedUserId` must match the authenticated account; the browser includes it on its device-persisted retry queue to avoid saving a recovered round to a different account. Profile history returns up to 100 results per page, newest first. Use `offset=100`, `offset=200`, and so on to retrieve older results; negative offsets become zero. `totalGames` counts the account’s entire history and `hasMore` signals another page. All results contribute to high scores. Passwords and other account histories are never exposed by the API.

## Multiplayer protocol

Connect a browser WebSocket to `/ws`. Send `{type:"join",game:"chess",room:"ABC123"}`. Room codes are case-insensitive and normalized to uppercase. Names come from the login session; visitors receive `Guest-xxxx`. A supplied `username` field is ignored. Room codes can contain 1–24 letters, numbers, underscores, or dashes. Chess, Checkers, Solitaire and Fourfold rooms hold two players; Rift, Starfall and Keepsake hold four. Other games are solo and cannot open rooms.

The server sends:

```js
{type: "joined", room, playerId, hostId, players: [{id, name}]}
{type: "players", hostId, players: [{id, name}]}
```

The first player is the host. The host sends `{type:"state",state:{...}}`; other players receive the same message. The latest state is sent to newcomers. Players send `{type:"action",action:{...}}`; the host receives `{type:"action",playerId,action:{...}}`, with a server-issued player ID. Only hosts can publish state. State and action must be objects, messages are limited to 512 KiB, and a socket may send up to 120 messages/second. An optional `{type:"ping"}` receives `{type:"pong"}`.

Failures return `{type:"error",message}`. When the host leaves, peers receive `{type:"closed",message}` and their sockets close. Rooms exist only in memory and disappear on backend restart. There is no host migration, matchmaking, or persistent game resume.

This deliberately simple architecture has the host browser simulate multiplayer gameplay and clients submit scores. Scores are validated structurally, but **are not verified against game simulation and are not cheat-resistant**. The shared leaderboards are appropriate for a casual arcade, not ranked or prize competition. Server-authoritative game simulation would be a separate expansion. Run one backend instance: sessions and rooms are local to that process.
