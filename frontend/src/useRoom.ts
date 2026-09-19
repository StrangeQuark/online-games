import { useCallback, useEffect, useRef, useState } from "react";
import type { GameId, Network, Player } from "./types";

export function useRoom(game: GameId, initialRoom: string | null) {
  const socket = useRef<WebSocket | null>(null);
  const seq = useRef(0);
  const [room, setRoom] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [hostId, setHostId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<Network["lastAction"]>(null);
  const [lastState, setLastState] = useState<Network["lastState"]>(null);
  const leave = useCallback(() => {
    socket.current?.close();
    socket.current = null;
    setRoom(null);
    setPlayers([]);
    setLastAction(null);
    setLastState(null);
    setBusy(false);
  }, []);
  const join = useCallback(
    (code: string) => {
      socket.current?.close();
      setError("");
      setBusy(true);
      setLastAction(null);
      setLastState(null);
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
      );
      socket.current = ws;
      ws.onopen = () =>
        ws.send(
          JSON.stringify({ type: "join", game, room: code.toUpperCase() }),
        );
      ws.onmessage = (event) => {
        if (socket.current !== ws) return;
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "joined") {
          setRoom(data.room);
          setPlayerId(data.playerId);
          setHostId(data.hostId);
          setPlayers(data.players);
          setBusy(false);
        }
        if (data.type === "players") {
          setPlayers(data.players);
          setHostId(data.hostId);
        }
        if (data.type === "state")
          setLastState({ state: data.state, seq: ++seq.current });
        if (data.type === "action")
          setLastAction({
            playerId: data.playerId,
            action: data.action,
            seq: ++seq.current,
          });
        if (data.type === "error") {
          setError(data.message || data.error || "Could not join this room.");
          setBusy(false);
        }
        if (data.type === "closed") {
          setError("The host left. Create a new room to play again.");
          leave();
        }
      };
      ws.onerror = () => {
        if (socket.current === ws) {
          setError("The multiplayer server is unavailable. Please try again.");
          setBusy(false);
        }
      };
      ws.onclose = () => {
        if (socket.current === ws) {
          setRoom(null);
          setPlayers([]);
          setBusy(false);
          setError(
            (previous) =>
              previous ||
              "Room disconnected. You can create or join another room.",
          );
        }
      };
    },
    [game, leave],
  );
  useEffect(() => {
    if (initialRoom) join(initialRoom);
    return () => {
      socket.current?.close();
      socket.current = null;
    };
  }, [initialRoom, join]);
  const sendAction = useCallback((action: unknown) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type: "action", action }));
  }, []);
  const sendState = useCallback((state: unknown) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type: "state", state }));
  }, []);
  return {
    network: {
      connected: !!room,
      isHost: playerId === hostId,
      playerId,
      players,
      room,
      sendAction,
      sendState,
      lastAction,
      lastState,
    } satisfies Network,
    join,
    leave,
    error,
    busy,
  };
}
