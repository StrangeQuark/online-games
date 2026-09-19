export type GameId =
  | "mosaic"
  | "chess"
  | "solitaire"
  | "checkers"
  | "rift"
  | "starfall"
  | "neonbreak"
  | "lumen"
  | "petal"
  | "driftline"
  | "pocketputt"
  | "fourfold"
  | "wispwood"
  | "parcel"
  | "keepsake";
export type User = { id: number; username: string };
export type Player = { id: string; name: string };
export type Network = {
  connected: boolean;
  isHost: boolean;
  playerId: string;
  players: Player[];
  room: string | null;
  sendAction: (action: any) => void;
  sendState: (state: any) => void;
  lastAction: { playerId: string; action: any; seq: number } | null;
  lastState: { state: any; seq: number } | null;
};
export type GameProps = {
  onScore: (score: number, outcome: string, resultId?: string) => void;
  network: Network;
};
