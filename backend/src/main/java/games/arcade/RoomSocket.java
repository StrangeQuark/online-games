package games.arcade;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/** Small, ephemeral rooms: the host simulates a game and the server relays its state. */
@Component
public class RoomSocket extends TextWebSocketHandler {
    private final ObjectMapper json;
    private final Map<String, Peer> peers = new HashMap<>();
    private final Map<String, Room> rooms = new HashMap<>();

    private static class Peer {
        final WebSocketSession socket;
        final String id = UUID.randomUUID().toString();
        final String name;
        Room room;
        long windowStarted = System.currentTimeMillis();
        int messages;
        Peer(WebSocketSession socket) {
            this.socket = new ConcurrentWebSocketSessionDecorator(socket, 2000, 1024 * 1024);
            var user = (ArcadeStore.User) socket.getAttributes().get(ArcadeController.SESSION_USER);
            name = user == null ? "Guest-" + id.substring(0, 4) : user.username();
        }
    }

    private static class Room {
        final String key;
        final String code;
        final String game;
        final List<Peer> players = new ArrayList<>();
        JsonNode state;
        Room(String game, String code) { this.game = game; this.code = code; key = game + ":" + code; }
        String hostId() { return players.get(0).id; }
        List<Map<String, String>> roster() { return players.stream().map(p -> Map.of("id", p.id, "name", p.name)).toList(); }
    }

    public RoomSocket(ObjectMapper json) { this.json = json; }

    @Override
    public synchronized void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (peers.size() >= 1000) { session.close(CloseStatus.SERVICE_OVERLOAD); return; }
        session.setTextMessageSizeLimit(512 * 1024);
        peers.put(session.getId(), new Peer(session));
    }

    @Override
    protected synchronized void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Peer peer = peers.get(session.getId());
        if (peer == null) return;
        long now = System.currentTimeMillis();
        if (now - peer.windowStarted >= 1000) { peer.windowStarted = now; peer.messages = 0; }
        if (++peer.messages > 120) { error(peer, "Sending too quickly."); session.close(CloseStatus.POLICY_VIOLATION); return; }
        JsonNode data;
        try { data = json.readTree(message.getPayload()); }
        catch (IOException e) { error(peer, "Invalid JSON."); return; }
        if (data == null || !data.isObject()) { error(peer, "Send a JSON object."); return; }
        switch (data.path("type").asText()) {
            case "join" -> join(peer, data);
            case "state" -> {
                if (peer.room == null) { error(peer, "Join a room first."); return; }
                if (!peer.id.equals(peer.room.hostId())) { error(peer, "Only the host can publish state."); return; }
                if (!data.hasNonNull("state") || !data.get("state").isObject()) { error(peer, "State must be an object."); return; }
                peer.room.state = data.get("state");
                broadcast(peer.room, Map.of("type", "state", "state", peer.room.state), peer);
            }
            case "action" -> {
                if (peer.room == null) { error(peer, "Join a room first."); return; }
                if (!data.hasNonNull("action") || !data.get("action").isObject()) { error(peer, "Action must be an object."); return; }
                send(peer.room.players.get(0), Map.of("type", "action", "playerId", peer.id, "action", data.get("action")));
            }
            case "ping" -> send(peer, Map.of("type", "pong"));
            default -> error(peer, "Unknown message type.");
        }
    }

    private void join(Peer peer, JsonNode data) {
        if (peer.room != null) { error(peer, "Already in a room."); return; }
        String game = data.path("game").asText();
        String code = data.path("room").asText().toUpperCase(Locale.ROOT);
        if (!ArcadeController.MULTIPLAYER_GAMES.contains(game) || !code.matches("[A-Z0-9_-]{1,24}")) {
            error(peer, "Choose a valid game and room code (1–24 letters, numbers, underscores, or dashes)."); return;
        }
        Room room = rooms.computeIfAbsent(game + ":" + code, key -> new Room(game, code));
        int capacity = Set.of("chess", "checkers", "solitaire", "fourfold").contains(game) ? 2 : 4;
        if (room.players.size() >= capacity) { error(peer, "This room is full."); return; }
        room.players.add(peer);
        peer.room = room;
        send(peer, Map.of("type", "joined", "room", code, "playerId", peer.id, "hostId", room.hostId(), "players", room.roster()));
        broadcast(room, Map.of("type", "players", "players", room.roster(), "hostId", room.hostId()), peer);
        if (room.state != null) send(peer, Map.of("type", "state", "state", room.state));
    }

    @Override
    public synchronized void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Peer peer = peers.remove(session.getId());
        if (peer == null || peer.room == null) return;
        Room room = peer.room;
        if (peer.id.equals(room.hostId())) {
            rooms.remove(room.key);
            for (Peer other : List.copyOf(room.players)) {
                other.room = null;
                if (other != peer) {
                    send(other, Map.of("type", "closed", "message", "The host left. Create or join another room."));
                    try { other.socket.close(CloseStatus.NORMAL); } catch (IOException ignored) { /* Already disconnected. */ }
                }
            }
        } else {
            room.players.remove(peer);
            broadcast(room, Map.of("type", "players", "players", room.roster(), "hostId", room.hostId()), null);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable error) throws Exception { session.close(CloseStatus.SERVER_ERROR); }

    private void broadcast(Room room, Object message, Peer exclude) {
        for (Peer recipient : List.copyOf(room.players)) if (recipient != exclude) send(recipient, message);
    }

    private void error(Peer peer, String message) { send(peer, Map.of("type", "error", "message", message)); }

    private void send(Peer peer, Object message) {
        if (!peer.socket.isOpen()) return;
        try { peer.socket.sendMessage(new TextMessage(json.writeValueAsString(message))); }
        catch (IOException | IllegalStateException e) {
            try { peer.socket.close(CloseStatus.SERVER_ERROR); } catch (IOException ignored) { /* Already disconnected. */ }
        }
    }
}
