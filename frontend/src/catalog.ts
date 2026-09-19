import type { GameId } from "./types";
export type Game = {
  id: GameId;
  name: string;
  eyebrow: string;
  genre: string;
  description: string;
  players: string;
  color: string;
  original: boolean;
  multiplayer?: boolean;
};
export const games: Game[] = [
  {
    id: "mosaic",
    name: "Mosaic",
    eyebrow: "SMALL PIECES. LOVELY POSSIBILITIES.",
    genre: "Tile merging",
    description:
      "Slide a few tiles. Make a little room. Two small things become something lovely in your own sunlit studio.",
    players: "Solo",
    color: "#d6c391",
    original: true,
    multiplayer: false,
  },
  {
    id: "keepsake",
    name: "Keepsake",
    eyebrow: "SOMETHING LOVELY, PIECE BY PIECE",
    genre: "Cooperative jigsaw",
    description:
      "Five little worlds to put together. Find a quiet moment on your own, or share a table and make a picture with friends.",
    players: "1–4 players",
    color: "#d8c397",
    original: true,
  },
  {
    id: "parcel",
    name: "Parcel",
    eyebrow: "SIGNED, SEALED, DELIGHTFUL",
    genre: "Delivery puzzle",
    description:
      "A little courtyard. A few important parcels. Twelve thoughtful routes, a fresh daily delivery, and all the time in the world.",
    players: "Solo",
    color: "#d8bc88",
    original: true,
    multiplayer: false,
  },
  {
    id: "wispwood",
    name: "Wispwood",
    eyebrow: "THE FOREST LEFT A LIGHT ON",
    genre: "Forest platformer",
    description:
      "A brave little leaf, eight secret groves, and a window glowing somewhere beyond the ferns. Gather the lights. Find your way home.",
    players: "Solo",
    color: "#d1d59f",
    original: true,
    multiplayer: false,
  },
  {
    id: "fourfold",
    name: "Fourfold",
    eyebrow: "ONE DROP AHEAD",
    genre: "Four-in-a-row",
    description:
      "Honey or jade. One small drop at a time. Outthink the computer, share a screen, or invite a friend to your table.",
    players: "1–2 players",
    color: "#d8c48d",
    original: false,
  },
  {
    id: "pocketputt",
    name: "Pocket Putt",
    eyebrow: "SMALL COURSE. LOVELY POSSIBILITIES.",
    genre: "Miniature golf",
    description:
      "Nine tiny gardens, a few clever corners, and one gentle stroke at a time. Find your line. Make a little round of it.",
    players: "Solo",
    color: "#d9c99b",
    original: true,
    multiplayer: false,
  },
  {
    id: "driftline",
    name: "Driftline",
    eyebrow: "TAKE THE LONG WAY HOME",
    genre: "3D city driving",
    description:
      "A whole city, your own coupe, and nowhere else to be. Explore neighborhood streets, downtown towers, parks, and the waterfront in 3D.",
    players: "Solo",
    color: "#e8c698",
    original: true,
    multiplayer: false,
  },
  {
    id: "petal",
    name: "Petal",
    eyebrow: "GOOD THINGS GROW IN THREES",
    genre: "Garden match-three",
    description:
      "Swap a few flowers. Watch a whole garden bloom. Eight little challenges and a quiet, endless Zen mode.",
    players: "Solo",
    color: "#eeb6a5",
    original: true,
    multiplayer: false,
  },
  {
    id: "lumen",
    name: "Lumen",
    eyebrow: "A SMALL PUZZLE. A LITTLE LIGHT.",
    genre: "Circuit puzzle",
    description:
      "Turn copper paths into a garden of light. Twelve quiet puzzles and a new daily spark. No rush.",
    players: "Solo",
    color: "#d8c68d",
    original: true,
    multiplayer: false,
  },
  {
    id: "neonbreak",
    name: "Neon Break",
    eyebrow: "FIND YOUR FLOW STATE",
    genre: "Brick breaker",
    description:
      "Chase the perfect angle through eight glowing sectors. Catch power-ups. Make the whole wall light up.",
    players: "Solo",
    color: "#a6e3d0",
    original: true,
    multiplayer: false,
  },
  {
    id: "chess",
    name: "Chess",
    eyebrow: "THE ROYAL GAME",
    genre: "Strategy",
    description:
      "A quiet board. A thousand possibilities. Make your next move a good one.",
    players: "1–2 players",
    color: "#b4c8ac",
    original: false,
  },
  {
    id: "solitaire",
    name: "Solitaire",
    eyebrow: "A MOMENT TO YOURSELF",
    genre: "Cards",
    description:
      "Shuffle the day away with a familiar favorite. Or race a friend to the finish.",
    players: "Solo / race",
    color: "#dcba78",
    original: false,
  },
  {
    id: "checkers",
    name: "Checkers",
    eyebrow: "SMALL MOVES, BIG PLANS",
    genre: "Strategy",
    description:
      "Jump in, think ahead, and claim your crown. Simple never gets old.",
    players: "1–2 players",
    color: "#d9a185",
    original: false,
  },
  {
    id: "starfall",
    name: "Starfall",
    eyebrow: "AN AFTERHOURS ORIGINAL",
    genre: "Space strategy",
    description:
      "Build your outpost among the asteroids. Mine, connect, and hold the line together.",
    players: "1–4 players",
    color: "#9ecac7",
    original: true,
  },
  {
    id: "rift",
    name: "Rift",
    eyebrow: "AN AFTERHOURS ORIGINAL",
    genre: "Arena shooter",
    description:
      "Four battlegrounds. Six weapons. Grab a jetpack, cloak up, and chase the next frag.",
    players: "1–4 players",
    color: "#df9e79",
    original: true,
  },
];
export const gameName = (id: string) =>
  games.find((g) => g.id === id)?.name ?? id;

const neighbors: Record<GameId, GameId[]> = {
  mosaic: ["lumen", "petal", "parcel"],
  chess: ["fourfold", "checkers", "starfall"],
  checkers: ["fourfold", "chess", "parcel"],
  fourfold: ["checkers", "chess", "lumen"],
  solitaire: ["keepsake", "lumen", "petal"],
  lumen: ["parcel", "mosaic", "keepsake"],
  parcel: ["lumen", "pocketputt", "fourfold"],
  keepsake: ["petal", "solitaire", "lumen"],
  petal: ["mosaic", "keepsake", "parcel"],
  pocketputt: ["driftline", "parcel", "neonbreak"],
  driftline: ["pocketputt", "neonbreak", "wispwood"],
  neonbreak: ["driftline", "wispwood", "rift"],
  wispwood: ["neonbreak", "pocketputt", "keepsake"],
  rift: ["starfall", "driftline", "neonbreak"],
  starfall: ["rift", "chess", "fourfold"],
};
export const gamesAfter = (id: GameId) =>
  neighbors[id].map((next) => games.find((game) => game.id === next)!);
