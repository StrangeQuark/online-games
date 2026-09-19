import { resumeSummary } from "./resumeSummary";
import { useScoreOutbox, type ScoreOutbox } from "./useScoreOutbox";
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  Gamepad2,
  Globe2,
  Heart,
  LogOut,
  MoonStar,
  Maximize2,
  Minimize2,
  Search,
  Shuffle,
  Star,
  CalendarDays,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { api } from "./api";
import { readGuestBook, recordGuestRound } from "./guestScores";
import { games, gameName, gamesAfter } from "./catalog";
import { useRoom } from "./useRoom";
import type { GameId, User } from "./types";

const Keepsake = lazy(() => import("./games/keepsake/Keepsake"));
const Mosaic = lazy(() => import("./games/mosaic/Mosaic"));
const Parcel = lazy(() => import("./games/parcel/Parcel"));
const Wispwood = lazy(() => import("./games/wispwood/Wispwood"));
const Fourfold = lazy(() => import("./games/fourfold/Fourfold"));
const PocketPutt = lazy(() => import("./games/pocketputt/PocketPutt"));
const Driftline = lazy(() => import("./games/driftline/Driftline"));
const Petal = lazy(() => import("./games/petal/Petal"));
const Lumen = lazy(() => import("./games/lumen/Lumen"));
const NeonBreak = lazy(() => import("./games/neonbreak/NeonBreak"));
const Chess = lazy(() => import("./games/classics/Chess"));
const Solitaire = lazy(() => import("./games/classics/Solitaire"));
const Checkers = lazy(() => import("./games/classics/Checkers"));
const Rift = lazy(() => import("./games/custom/Rift"));
const Starfall = lazy(() => import("./games/custom/Starfall"));
const components = {
  mosaic: Mosaic,
  keepsake: Keepsake,
  parcel: Parcel,
  wispwood: Wispwood,
  fourfold: Fourfold,
  pocketputt: PocketPutt,
  driftline: Driftline,
  petal: Petal,
  lumen: Lumen,
  neonbreak: NeonBreak,
  chess: Chess,
  solitaire: Solitaire,
  checkers: Checkers,
  rift: Rift,
  starfall: Starfall,
};
type ScoreRow = { username: string; game: GameId; score: number };
type Profile = {
  user: User;
  totalGames: number;
  hasMore: boolean;
  highScores: { game: GameId; score: number }[];
  history: {
    id: number;
    game: GameId;
    score: number;
    outcome: string;
    playedAt: string;
  }[];
};

function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}
const number = (n: number) => n.toLocaleString();
function readGameList(key: string): GameId[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`afterhours:${key}`) || "[]",
    );
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter((id): id is GameId => games.some((g) => g.id === id)),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
function saveGameList(key: string, value: GameId[]) {
  try {
    localStorage.setItem(`afterhours:${key}`, JSON.stringify(value));
  } catch {
    /* Keep playing when storage is unavailable. */
  }
}

export default function App() {
  const route = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const accountScores = useScoreOutbox(user);
  const [auth, setAuth] = useState<"login" | "enroll" | null>(null);
  const [accountError, setAccountError] = useState("");
  useEffect(() => {
    api<{ user: User | null }>("/auth/me")
      .then((x) => setUser(x.user))
      .catch(() => {});
  }, []);
  const logout = async () => {
    try {
      await api("/auth/logout", {});
      setUser(null);
      location.hash = "/";
      setAccountError("");
    } catch (e) {
      setAccountError((e as Error).message);
    }
  };
  const match = route.match(/^\/play\/([a-z]+)(?:\?(.*))?$/);
  const selected = games.find((g) => g.id === match?.[1]);
  useEffect(() => {
    const page =
      selected?.name ??
      {
        "/profile": "Your scorebook",
        "/hiscores": "Hall of fame",
        "/about": "Our little story",
      }[route];
    document.title = page
      ? `${page} · Afterhours`
      : "Afterhours — A little out of time. A lot of fun.";
  }, [route, selected?.id]);
  return (
    <>
      <button
        className="skip-content"
        onClick={() => {
          const content = document.getElementById("main-content");
          content?.focus();
          content?.scrollIntoView({ block: "start" });
        }}
      >
        Skip to content
      </button>
      <div className="topline">
        <span>A SMALL CORNER OF THE INTERNET. A BIG SOFT SPOT FOR GAMES.</span>
        <span>
          <i /> NO DOWNLOADS. JUST PLAY.
        </span>
      </div>
      <header className="header">
        <a className="brand" href="#/" aria-label="Afterhours home">
          <span className="brand-icon">
            <Gamepad2 size={27} />
            <i />
          </span>
          <span>
            afterhours<span className="brand-caption">THE INTERNET ARCADE</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className={route === "/" ? "active" : ""} href="#/">
            The arcade
          </a>
          <a
            className={route === "/hiscores" ? "active" : ""}
            href="#/hiscores"
          >
            Hiscores
          </a>
          <a className={route === "/about" ? "active" : ""} href="#/about">
            Our little story
          </a>
        </nav>
        <div className="account-nav">
          {user ? (
            <>
              <a className="profile-link" href="#/profile">
                <span className="avatar small">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                {user.username}
              </a>
              <button
                className="icon-button"
                onClick={logout}
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <button className="text-button" onClick={() => setAuth("login")}>
                Log in
              </button>
              <button
                className="button cream compact"
                onClick={() => setAuth("enroll")}
              >
                Join the club <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </header>
      {accountError && (
        <p className="error site-error" role="alert">
          {accountError}
        </p>
      )}
      {!selected && user && accountScores.count > 0 && (
        <div className="score-recovery" role="status">
          <Trophy size={17} />
          <span>
            {accountScores.status ||
              `${accountScores.count} round(s) waiting to save.`}
          </span>
          {accountScores.failed && (
            <button className="text-button" onClick={accountScores.save}>
              Retry save
            </button>
          )}
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        {selected ? (
          <GamePage
            key={selected.id}
            game={selected.id}
            user={user}
            accountScores={accountScores}
            initialRoom={new URLSearchParams(match?.[2]).get("room")}
            enroll={() => setAuth("enroll")}
          />
        ) : route === "/profile" ? (
          <ProfilePage user={user} enroll={() => setAuth("login")} />
        ) : route === "/hiscores" ? (
          <Hiscores />
        ) : route === "/about" ? (
          <About enroll={() => setAuth("enroll")} />
        ) : route === "/" ? (
          <Home user={user} enroll={() => setAuth("enroll")} />
        ) : (
          <div className="empty page">
            <MoonStar size={40} />
            <h1>A little off the map.</h1>
            <a className="button cream" href="#/">
              Back to the arcade
            </a>
          </div>
        )}
      </main>
      <footer>
        <a className="footer-brand" href="#/">
          afterhours <span>✦</span>
        </a>
        <p>Good games. Late nights. Just one more round.</p>
        <span>
          BUILT WITH A LITTLE NOSTALGIA <Heart size={12} />
        </span>
      </footer>
      {auth && (
        <AuthModal
          mode={auth}
          setMode={setAuth}
          close={() => setAuth(null)}
          onUser={(u) => {
            setUser(u);
            setAuth(null);
          }}
        />
      )}
    </>
  );
}

function Home({ user, enroll }: { user: User | null; enroll: () => void }) {
  const [filter, setFilter] = useState("All games");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(() => readGameList("favorites"));
  const [recent] = useState(() => readGameList("recent").slice(0, 4));
  const searchRef = useRef<HTMLInputElement>(null);
  const [resumeGames] = useState(() =>
    [...readGameList("recent"), ...games.map((g) => g.id)]
      .filter((id, i, all) => all.indexOf(id) === i)
      .map((id) => ({ id, detail: resumeSummary(id) }))
      .filter((item) => item.detail)
      .slice(0, 4),
  );
  const [libraryNotice, setLibraryNotice] = useState("");
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target as HTMLElement).matches("input,textarea,select") &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const favorite = (id: GameId) => {
    const next = favorites.includes(id)
      ? favorites.filter((g) => g !== id)
      : [...favorites, id];
    setFavorites(next);
    saveGameList("favorites", next);
    setLibraryNotice(
      `${gameName(id)} ${next.includes(id) ? "added to" : "removed from"} your favorites.`,
    );
  };
  const filtered = games.filter(
    (g) =>
      (filter === "All games" ||
        (filter === "The classics" && !g.original) ||
        (filter === "Our originals" && g.original) ||
        (filter === "Play together" && g.multiplayer !== false) ||
        (filter === "Favorites" && favorites.includes(g.id))) &&
      `${g.name} ${g.genre} ${g.description}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="page home">
      <section className="welcome">
        <div>
          <div className="eyebrow">
            <span className="tiny-star">✦</span> YOUR NEXT GOOD TIME STARTS HERE
          </div>
          <h1>
            A little out of time. <br />A lot of <em>fun.</em>
          </h1>
          <p>
            Old-school soul. Freshly made games. A place to slow down,
            <br className="desktop-break" /> team up, and lose track of the
            clock.
          </p>
        </div>
        <div className="welcome-seal">
          <MoonStar />
          <span>ALWAYS OPEN</span>
          <strong>Est. 2026</strong>
          <span>ONE MORE ROUND</span>
        </div>
      </section>
      {resumeGames.length > 0 && (
        <section className="resume-shelf" aria-label="Continue playing">
          <div className="resume-shelf-heading">
            <span className="eyebrow">RIGHT WHERE YOU LEFT IT</span>
            <span>Saved on this device</span>
          </div>
          <div>
            {resumeGames.map((item) => (
              <a key={item.id} href={`#/play/${item.id}`}>
                <img src={`/assets/${item.id}.webp`} alt="" />
                <span>
                  <strong>{gameName(item.id)}</strong>
                  <small>{item.detail}</small>
                </span>
                <ArrowRight size={17} />
              </a>
            ))}
          </div>
        </section>
      )}
      <section className="featured" aria-label="Featured games">
        <a className="feature-main" href="#/play/lumen">
          <img
            src="/assets/lumen.webp"
            alt="A glowing brass and porcelain circuit puzzle in a moonlit conservatory"
            fetchPriority="high"
          />
          <div className="feature-shade" />
          <div className="feature-top">
            <span className="badge">
              <Sparkles size={12} /> JUST ARRIVED. MADE WITH CARE.
            </span>
            <span className="issue">FEATURED / 002</span>
          </div>
          <div className="feature-copy">
            <span className="eyebrow">TURN. CONNECT. ILLUMINATE.</span>
            <h2>
              Lumen<span>A LITTLE LIGHT GOES A LONG WAY.</span>
            </h2>
            <p>
              A tangle of paths. A garden of light.
              <br />
              Find a little calm in the connections.
            </p>
            <span className="button cream">
              Find your spark <ArrowRight size={17} />
            </span>
            <div className="feature-meta">
              <Sparkles size={13} /> 12 gardens <span>•</span> Circuit puzzles{" "}
              <span>•</span> A new daily challenge
            </div>
          </div>
          <span className="feature-orbit">✧</span>
        </a>
        <a href="#/play/neonbreak" className="feature-side feature-neon">
          <img
            src="/assets/neonbreak.webp"
            alt="A brilliant energy ball shattering colorful glass bricks above a brass paddle"
          />
          <div className="feature-shade" />
          <span className="badge side-badge">
            <Crosshair size={12} /> ONE MORE SPARK
          </span>
          <div className="side-copy">
            <span className="eyebrow">FIND YOUR FLOW STATE.</span>
            <h2>
              NEON BREAK<span>Let it glow.</span>
            </h2>
            <div className="side-bottom">
              <span>Brick breaker · Eight sectors</span>
              <span className="circle-arrow">
                <ArrowRight size={19} />
              </span>
            </div>
          </div>
        </a>
      </section>
      <div className="arcade-strip">
        <span>
          <Globe2 /> Right in your browser
        </span>
        <span>
          <Users /> Better with friends
        </span>
        <span>
          <Trophy /> Your next personal best
        </span>
        <span>
          <Heart /> Made for the love of it
        </span>
      </div>
      {!user && readGuestBook().totalGames > 0 && (
        <a className="guest-scorebook-return" href="#/profile">
          <Trophy size={15} />
          <span>
            Your guest scorebook{" "}
            <small>
              {readGuestBook().totalGames} completed{" "}
              {readGuestBook().totalGames === 1 ? "round" : "rounds"} on this
              device
            </small>
          </span>
          <ArrowRight size={15} />
        </a>
      )}
      <section className="daily-shelf" aria-label="Daily challenges">
        <div>
          <CalendarDays size={21} />
          <span>
            <strong>A little ritual, every day.</strong>
            <small>Same challenge for everyone. A fresh start tomorrow.</small>
          </span>
        </div>
        <a href="#/play/lumen?daily=1">
          <span>DAILY CIRCUIT</span>Lumen <ArrowRight size={14} />
        </a>
        <a href="#/play/solitaire?daily=1">
          <span>DAILY SHUFFLE</span>Solitaire <ArrowRight size={14} />
        </a>
        <a href="#/play/pocketputt?daily=1">
          <span>DAILY COURSE</span>Pocket Putt <ArrowRight size={14} />
        </a>
        <a href="#/play/parcel?daily=1">
          <span>DAILY DELIVERY</span>Parcel <ArrowRight size={14} />
        </a>
        <a href="#/play/mosaic?daily=1">
          <span>DAILY STUDIO</span>Mosaic <ArrowRight size={14} />
        </a>
      </section>
      {recent.length > 0 && (
        <section className="recent-shelf" aria-label="Recently played">
          <span className="eyebrow">BACK FOR ANOTHER ROUND?</span>
          <div>
            {recent.map((id) => (
              <a key={id} href={`#/play/${id}`}>
                <img src={`/assets/${id}.webp`} alt="" />
                <span>
                  {gameName(id)}
                  <small>Recently played</small>
                </span>
                <ArrowRight size={15} />
              </a>
            ))}
          </div>
        </section>
      )}
      <section className="library" id="games">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PICK SOMETHING GOOD</span>
            <h2>
              The game shelf<span>{String(games.length).padStart(2, "0")}</span>
            </h2>
          </div>
          <div className="shelf-heading-actions">
            <button
              className="button outline compact"
              onClick={() => {
                const pool = filtered.length ? filtered : games;
                location.hash = `/play/${pool[Math.floor(Math.random() * pool.length)].id}`;
              }}
            >
              <Shuffle size={14} /> Surprise me
            </button>
            <a href="#/hiscores" className="inline-link">
              Hall of fame <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="library-tools">
          <div className="tabs" aria-label="Filter games">
            {[
              "All games",
              "The classics",
              "Our originals",
              "Play together",
              "Favorites",
            ].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                className={filter === f ? "selected" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
                {f === "Our originals" && <Sparkles size={12} />}
                {f === "Favorites" && <Star size={12} />}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={16} />
            <input
              ref={searchRef}
              aria-label="Find a game"
              placeholder="Find your next favorite…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>
        <p className="shelf-status" role="status">
          {libraryNotice ||
            `${filtered.length} games to make your own. Press / to search.`}
        </p>
        <div className="game-grid">
          {filtered.map((g) => (
            <div className="game-card-shell" key={g.id}>
              <a href={`#/play/${g.id}`} className="game-card">
                <div className="card-art">
                  <img
                    loading="lazy"
                    src={`/assets/${g.id}.webp`}
                    alt={`${g.name} original cover illustration`}
                  />
                  <span className="card-tag" style={{ color: g.color }}>
                    {g.original ? "AFTERHOURS ORIGINAL" : "THE CLASSICS"}
                  </span>
                  <span className="card-play">
                    <ArrowRight size={21} />
                  </span>
                </div>
                <div className="card-content">
                  <div className="card-title">
                    <h3>{g.name}</h3>
                    <span>{g.genre}</span>
                  </div>
                  <p>{g.description}</p>
                  <div className="card-bottom">
                    <span>
                      <Users size={13} />
                      {g.players}
                    </span>
                    <span>
                      PLAY A ROUND <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </a>
              <button
                className={`favorite-toggle${favorites.includes(g.id) ? " is-favorite" : ""}`}
                aria-label={`${favorites.includes(g.id) ? "Remove" : "Add"} ${g.name} ${favorites.includes(g.id) ? "from" : "to"} favorites`}
                aria-pressed={favorites.includes(g.id)}
                onClick={() => favorite(g.id)}
              >
                <Star
                  size={16}
                  fill={favorites.includes(g.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
          ))}
          {filtered.length > 0 && (
            <div className="shelf-note">
              <span className="note-star">✳</span>
              <span className="eyebrow">A WORK IN PLAY</span>
              <h3>There’s always room for one more.</h3>
              <p>Small games, made with care. This is just the beginning.</p>
              <a href="#/about">
                A note from the arcade <ArrowRight size={14} />
              </a>
            </div>
          )}
        </div>
        {filtered.length === 0 && (
          <div className="empty">
            <Search size={30} />
            <h3>No games on this shelf.</h3>
            <p>
              {filter === "Favorites"
                ? "Tap the star on a game to keep it on your personal shelf."
                : "Try another name or choose All games."}
            </p>
            <button
              className="button outline"
              onClick={() => {
                setQuery("");
                setFilter("All games");
              }}
            >
              Show all games
            </button>
          </div>
        )}
      </section>
      <section className="club-banner">
        <div className="club-stamp">
          <Trophy size={35} />
          <span>MAKE YOUR MARK</span>
        </div>
        <div>
          <span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span>
          <h2>Your best moments deserve a place.</h2>
          <p>
            Keep your hiscores, revisit old rounds, and give your next game
            something to beat.
          </p>
        </div>
        {user ? (
          <a className="button cream" href="#/profile">
            Your player page <ArrowRight size={16} />
          </a>
        ) : (
          <button className="button cream" onClick={enroll}>
            Claim your username <ArrowRight size={16} />
          </button>
        )}
      </section>
      <div className="home-signoff">
        <span>NO INSTALLS. NO QUARTERS REQUIRED.</span>
        <MoonStar size={20} />
        <span>SEE YOU FOR ONE MORE ROUND.</span>
      </div>
    </div>
  );
}

function AuthModal({
  mode,
  setMode,
  close,
  onUser,
}: {
  mode: "login" | "enroll";
  setMode: (mode: "login" | "enroll") => void;
  close: () => void;
  onUser: (user: User) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector("input")?.focus();
    return () => dialog?.close();
  }, []);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (mode === "enroll" && data.password !== data.confirmPassword) {
      setError("Those passwords don’t match. Give it another try.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ user: User }>(`/auth/${mode}`, data);
      onUser(r.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      className="auth-modal"
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <button
        className="close-modal icon-button"
        onClick={close}
        aria-label="Close account dialog"
      >
        <X />
      </button>
      <MoonStar size={32} className="gold" />
      <span className="eyebrow">YOUR SEAT AT THE ARCADE</span>
      <h2>{mode === "enroll" ? "Come on in." : "Good to see you."}</h2>
      <p>
        {mode === "enroll"
          ? "A username, a password, and a place for your personal bests."
          : "Your next personal best is waiting."}
      </p>
      <form onSubmit={submit}>
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            title="3–20 letters, numbers, or underscores"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "enroll" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "enroll" ? 8 : 1}
            maxLength={72}
          />
        </label>
        {mode === "enroll" && (
          <>
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
              />
            </label>
            <p className="form-hint">
              Use 8–72 characters. No email needed, so keep your password
              somewhere safe; there’s no email recovery.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button cream full" disabled={busy}>
          {busy
            ? "Just a moment…"
            : mode === "enroll"
              ? "Join the club"
              : "Log in"}
          <ArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        {mode === "enroll" ? "Already a regular?" : "First time here?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "enroll" ? "login" : "enroll");
            setError("");
          }}
        >
          {mode === "enroll" ? "Log in" : "Join the club"}
        </button>
      </p>
      <div className="privacy-note">
        <Shield size={14} /> Just your account, hiscores, and game history.
      </div>
    </dialog>
  );
}

class GameBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h2>This round hit a snag.</h2>
        <p>Reload the page to start a fresh game.</p>
        <button className="button cream" onClick={() => location.reload()}>
          Reload game
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function GamePage({
  game,
  user,
  accountScores,
  initialRoom,
  enroll,
}: {
  game: GameId;
  user: User | null;
  accountScores: ScoreOutbox;
  initialRoom: string | null;
  enroll: () => void;
}) {
  const info = games.find((g) => g.id === game)!;
  const Game = components[game];
  const { network, join, leave, error, busy } = useRoom(
    game,
    info.multiplayer === false ? null : initialRoom,
  );
  const [focusMode, setFocusMode] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() =>
    readGameList("favorites").includes(game),
  );
  useEffect(() => {
    document.body.classList.add("playing-game");
    saveGameList(
      "recent",
      [game, ...readGameList("recent").filter((id) => id !== game)].slice(0, 4),
    );
    return () => document.body.classList.remove("playing-game", "focus-game");
  }, []);
  useEffect(() => {
    document.body.classList.toggle("focus-game", focusMode);
  }, [focusMode]);
  const [code, setCode] = useState("");
  const [copy, setCopy] = useState(false);
  const [scoreStatus, setScoreStatus] = useState("");
  const onScore = useCallback(
    (score: number, outcome: string, resultId?: string) => {
      const runId = resultId
        ? `${game}-${resultId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)
        : crypto.randomUUID();
      if (!user) {
        const saved = recordGuestRound(game, score, outcome, runId);
        setScoreStatus(
          saved
            ? "Round complete. Saved to your guest scorebook on this device."
            : "Round complete. Your scorebook is available for this session.",
        );
        return;
      }
      setScoreStatus("");
      accountScores.enqueue({
        game,
        score: Math.max(0, Math.round(score)),
        outcome:
          outcome.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 32) || "Completed",
        runId,
      });
    },
    [game, user, accountScores.enqueue],
  );
  const create = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    join(Array.from(bytes, (x) => alphabet[x % alphabet.length]).join(""));
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${location.pathname}#/play/${game}?room=${network.room}`,
      );
      setCopy(true);
      setTimeout(() => setCopy(false), 2500);
    } catch {
      setScoreStatus(`Share room code ${network.room} with your friend.`);
    }
  };
  return (
    <div className="page play-page">
      <a className="back-link" href="#/">
        <ArrowLeft size={15} /> Back to the arcade
      </a>
      <div className="game-heading">
        <div>
          <span className="eyebrow">{info.eyebrow}</span>
          <h1>
            {info.name}
            <span>{info.genre}</span>
          </h1>
        </div>
        <div className="game-heading-actions">
          <span className="players-label">
            <Users size={16} />
            {info.players}
          </span>
          <button
            className={`game-favorite-button${isFavorite ? " is-favorite" : ""}`}
            aria-label={`${isFavorite ? "Remove" : "Add"} ${info.name} ${isFavorite ? "from" : "to"} favorites`}
            title={isFavorite ? "Saved to favorites" : "Save to favorites"}
            aria-pressed={isFavorite}
            onClick={() => {
              const saved = readGameList("favorites");
              saveGameList(
                "favorites",
                isFavorite
                  ? saved.filter((id) => id !== game)
                  : [...new Set([...saved, game])],
              );
              setIsFavorite((value) => !value);
            }}
          >
            <Star size={17} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            className="button outline compact focus-toggle"
            aria-label={focusMode ? "Exit focus" : "Focus mode"}
            title={focusMode ? "Exit focus" : "Focus mode"}
            aria-pressed={focusMode}
            onClick={() => {
              setFocusMode((v) => !v);
              window.scrollTo(0, 0);
            }}
          >
            {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{focusMode ? "Exit focus" : "Focus mode"}</span>
          </button>
        </div>
      </div>
      {info.multiplayer !== false && (
        <section className="room-bar" aria-label="Multiplayer room">
          {network.connected ? (
            <>
              <div className="room-connected">
                <span className="live-dot" />
                <strong>ROOM {network.room}</strong>
                <span>
                  {network.isHost ? "You’re hosting" : "You’re connected"}
                </span>
                <span>{network.players.map((p) => p.name).join(" · ")}</span>
              </div>
              <div className="room-actions">
                <button className="button outline compact" onClick={copyLink}>
                  {copy ? <Check size={14} /> : <Copy size={14} />}{" "}
                  {copy ? "Copied!" : "Invite a friend"}
                </button>
                <button className="text-button" onClick={leave}>
                  Leave room
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="room-intro">
                <Users size={20} />
                <div>
                  <strong>Good company. Great games.</strong>
                  <span>Create a private room and invite a friend.</span>
                </div>
              </div>
              <div className="room-actions">
                <button
                  className="button cream compact"
                  disabled={busy}
                  onClick={create}
                >
                  {busy ? "Connecting…" : "Create room"}
                </button>
                <span className="room-or">or</span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (code.trim()) join(code.trim());
                  }}
                >
                  <input
                    aria-label="Room code"
                    placeholder="ROOM CODE"
                    value={code}
                    maxLength={24}
                    pattern="[A-Za-z0-9-]{3,24}"
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                  <button className="button outline compact" disabled={busy}>
                    Join <ChevronRight size={14} />
                  </button>
                </form>
              </div>
            </>
          )}
          {error && (
            <span className="error" role="alert">
              {error}
            </span>
          )}
        </section>
      )}
      <GameBoundary>
        <Suspense
          fallback={
            <div className="game-loading">
              <MoonStar />
              <p>Setting up your game…</p>
            </div>
          }
        >
          <Game network={network} onScore={onScore} />
        </Suspense>
      </GameBoundary>
      {(scoreStatus || (user && accountScores.status)) && (
        <div className="score-notice" role="status">
          <Trophy size={16} />
          {scoreStatus || accountScores.status}
          {user && accountScores.failed && (
            <button className="text-button" onClick={accountScores.save}>
              Retry save
            </button>
          )}
        </div>
      )}
      <div className="play-note">
        <span>
          <Heart size={15} /> Take your time. Enjoy the game.
        </span>
        {user ? (
          <a href="#/profile">
            Your hiscores & history <ArrowRight size={14} />
          </a>
        ) : (
          <span className="guest-play-links">
            <a href="#/profile">
              Your guest scorebook <ArrowRight size={14} />
            </a>
            <button className="text-button" onClick={enroll}>
              Join the club
            </button>
          </span>
        )}
      </div>
      <section className="next-games" aria-label="More to play">
        <div className="next-games-heading">
          <div>
            <span className="eyebrow">WHEN YOU FEEL LIKE SOMETHING ELSE</span>
            <h2>Your next little adventure.</h2>
          </div>
          <a href="#/">
            All {games.length} games <ArrowRight size={14} />
          </a>
        </div>
        <div className="next-games-grid">
          {gamesAfter(game).map((next) => (
            <a href={`#/play/${next.id}`} key={next.id}>
              <img src={`/assets/${next.id}.webp`} alt="" loading="lazy" />
              <span>
                <strong>{next.name}</strong>
                <small>
                  {next.genre} · {next.players}
                </small>
              </span>
              <ArrowRight size={16} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfilePage({
  user,
  enroll,
}: {
  user: User | null;
  enroll: () => void;
}) {
  const [guestBook] = useState(readGuestBook);
  const [profile, setProfile] = useState<Profile | null>(() =>
    !user && guestBook.totalGames
      ? { ...guestBook, user: { id: 0, username: "Guest" }, hasMore: false }
      : null,
  );
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    if (user) {
      setProfile(null);
      api<Profile>("/profile")
        .then((value) => {
          if (active) setProfile(value);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    } else
      setProfile(
        guestBook.totalGames
          ? { ...guestBook, user: { id: 0, username: "Guest" }, hasMore: false }
          : null,
      );
    return () => {
      active = false;
    };
  }, [user, guestBook]);
  const loadMore = async () => {
    if (!profile) return;
    setLoadingMore(true);
    setError("");
    try {
      const next = await api<Profile>(
        `/profile?offset=${profile.history.length}`,
      );
      setProfile((previous) =>
        previous
          ? {
              ...next,
              history: [
                ...previous.history,
                ...next.history.filter(
                  (h) => !previous.history.some((old) => old.id === h.id),
                ),
              ],
            }
          : next,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };
  if (!user && !guestBook.totalGames)
    return (
      <div className="page empty">
        <Trophy size={40} />
        <h1>A home for your hiscores.</h1>
        <p>Log in to see your personal bests and every completed round.</p>
        <button className="button cream" onClick={enroll}>
          Log in <ArrowRight size={16} />
        </button>
      </div>
    );
  return (
    <div className="page profile-page">
      <div className="profile-heading">
        <span className="avatar">
          {user ? user.username[0].toUpperCase() : <Gamepad2 size={27} />}
        </span>
        <div>
          <span className="eyebrow">
            {user ? "A REGULAR AT AFTERHOURS" : "YOUR LITTLE LOCAL SCOREBOOK"}
          </span>
          <h1>
            {user ? `${user.username}’s corner.` : "Your guest scorebook."}
          </h1>
          <p>
            {user
              ? "Every round has a story. Here are yours."
              : "Saved in this browser, ready for your next round."}
          </p>
        </div>
      </div>
      {!user && (
        <div className="guest-scorebook-note">
          <p>
            Guest records stay on this device. An account keeps future rounds in
            your player page and the hall of fame.
          </p>
          <button className="button cream compact" onClick={enroll}>
            Join or log in <ArrowRight size={14} />
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!profile && !error ? (
        <p>Opening your scorebook…</p>
      ) : (
        profile && (
          <>
            <div className="stat-grid">
              <div>
                <span>COMPLETED ROUNDS</span>
                <strong>{number(profile.totalGames)}</strong>
              </div>
              <div>
                <span>GAMES EXPLORED</span>
                <strong>
                  {profile.highScores.length}
                  <small> / {games.length}</small>
                </strong>
              </div>
              <div>
                <span>NEXT ON THE AGENDA</span>
                <strong className="small-stat">One more round.</strong>
              </div>
            </div>
            <div className="section-heading">
              <h2>Your personal bests</h2>
              <Trophy size={21} />
            </div>
            <div className="personal-bests">
              {games.map((g) => (
                <a href={`#/play/${g.id}`} key={g.id}>
                  <img src={`/assets/${g.id}.webp`} alt="" />
                  <div>
                    <span>{g.name}</span>
                    <strong>
                      {profile.highScores.find((s) => s.game === g.id)
                        ? number(
                            profile.highScores.find((s) => s.game === g.id)!
                              .score,
                          )
                        : "—"}
                    </strong>
                  </div>
                  <ArrowRight size={16} />
                </a>
              ))}
            </div>
            <div className="section-heading history-heading">
              <h2>The scorebook</h2>
              <select
                aria-label="Filter game history"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Every game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            {profile.history.filter(
              (h) => filter === "all" || h.game === filter,
            ).length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>GAME</th>
                      <th>RESULT</th>
                      <th>SCORE</th>
                      <th>PLAYED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.history
                      .filter((h) => filter === "all" || h.game === filter)
                      .map((h) => (
                        <tr key={h.id}>
                          <td>
                            <a href={`#/play/${h.game}`}>{gameName(h.game)}</a>
                          </td>
                          <td>{h.outcome}</td>
                          <td className="gold">{number(h.score)}</td>
                          <td>{new Date(h.playedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty inset">
                <MoonStar size={32} />
                <h3>A fresh page.</h3>
                <p>Finish a round to add your first score.</p>
                <a className="button outline" href="#/">
                  Find a game <ArrowRight size={15} />
                </a>
              </div>
            )}
            {profile.hasMore && (
              <div className="history-more">
                <button
                  className="button outline"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? "Opening older rounds…" : "Load older rounds"}{" "}
                  <ArrowDown size={15} />
                </button>
                <span>
                  Showing {profile.history.length} of{" "}
                  {number(profile.totalGames)} rounds
                </span>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

function Hiscores() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [filter, setFilter] = useState<GameId>("starfall");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<ScoreRow[]>("/leaderboard")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const shown = rows
    .filter((r) => r.game === filter)
    .sort((a, b) => b.score - a.score);
  return (
    <div className="page hiscores-page">
      <div className="eyebrow">A LITTLE FRIENDLY COMPETITION</div>
      <h1>The hall of fame.</h1>
      <p className="page-intro">
        Good rounds deserve to be remembered. Can you set the next personal
        best?
      </p>
      <div className="tabs leaderboard-tabs">
        {games.map((g) => (
          <button
            aria-pressed={filter === g.id}
            className={filter === g.id ? "selected" : ""}
            onClick={() => setFilter(g.id)}
            key={g.id}
          >
            {g.name}
          </button>
        ))}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p>Opening the hall of fame…</p>
      ) : shown.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>GAME</th>
                <th>HISCORE</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.username}>
                  <td>{i === 0 ? "♛" : String(i + 1).padStart(2, "0")}</td>
                  <td>{r.username}</td>
                  <td>{gameName(r.game)}</td>
                  <td className="gold">{number(r.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty inset">
          <Trophy size={44} />
          <h2>The first spot is yours to claim.</h2>
          <p>
            There are no saved {gameName(filter)} scores yet. Start something
            good.
          </p>
          <a href={`#/play/${filter}`} className="button cream">
            Play {gameName(filter)} <ArrowRight size={15} />
          </a>
        </div>
      )}
    </div>
  );
}

function About({ enroll }: { enroll: () => void }) {
  return (
    <div className="page about-page">
      <span className="eyebrow">A NOTE FROM THE ARCADE</span>
      <h1>
        For the love
        <br />
        of <em>one more round.</em>
      </h1>
      <p className="about-lead">
        Remember when a link could lead to your new favorite game?
      </p>
      <p>
        Afterhours is a little home for that feeling. A shelf of familiar
        classics, little worlds of our own, and room for your friends.
        Everything plays right here in your browser.
      </p>
      <div className="about-divider">✦</div>
      <h2>Familiar feelings. New worlds.</h2>
      <p>
        Our classic games are built from scratch, with original pieces and
        boards. Rift brings back the speed and atmosphere of early arena
        shooters. Starfall is our tribute to the asteroid mining and connected
        defenses that made The Space Game (2009), by Casual Collective, so
        memorable. It has original art, music, maps, and its own cooperative
        missions.
      </p>
      <p>
        There are quieter corners, too: connect a little light in Lumen, deliver
        a parcel, or make a ceramic Mosaic. Take the coastal road in Driftline,
        follow the lanterns through Wispwood, or gather friends around a
        Keepsake jigsaw. Find the pace that feels like yours.
      </p>
      <p>
        The artwork starts with original generated illustrations and
        hand-authored game drawings. Original music gives the worlds their own
        sound, from gentle garden melodies to late-night arcade rhythms. Turn it
        on whenever the mood takes you.
      </p>
      <h2>A simple kind of club.</h2>
      <p>
        No email, no profile forms. Just a username and password to remember
        your hiscores and completed games. Guest scores and unfinished solo
        games stay on your device, so you can come back to them. Or share a
        private room with a friend and make an evening of it.
      </p>
      <button className="button cream" onClick={enroll}>
        Make yourself at home <ArrowRight size={16} />
      </button>
      <a className="about-return" href="#/">
        Find your next favorite <ArrowDown size={14} />
      </a>
    </div>
  );
}
