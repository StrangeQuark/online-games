package games.arcade;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RoomSocketTest {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;

    private class Client implements WebSocket.Listener, AutoCloseable {
        final BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();
        final StringBuilder partial = new StringBuilder();
        WebSocket socket;
        Client() { socket = HttpClient.newHttpClient().newWebSocketBuilder()
                .buildAsync(URI.create("ws://localhost:" + port + "/ws"), this).join(); }
        void send(String message) { socket.sendText(message, true).join(); }
        JsonNode next(String type) throws Exception {
            long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (System.nanoTime() < until) {
                JsonNode result = messages.poll(200, TimeUnit.MILLISECONDS);
                if (result != null && result.path("type").asText().equals(type)) return result;
            }
            throw new AssertionError("Did not receive " + type);
        }
        public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
            partial.append(data);
            if (last) {
                try { messages.add(json.readTree(partial.toString())); }
                catch (Exception e) { throw new AssertionError(e); }
                partial.setLength(0);
            }
            ws.request(1);
            return null;
        }
        public void close() { socket.abort(); }
    }

    @Test
    void hostRelaysActionsAndStateWithCapacityAndCleanHostDeparture() throws Exception {
        try (Client host = new Client(); Client guest = new Client(); Client third = new Client()) {
            host.send("{\"type\":\"join\",\"game\":\"chess\",\"room\":\"unitroom\",\"username\":\"Impersonated\"}");
            JsonNode joined = host.next("joined");
            assertThat(joined.path("room").asText()).isEqualTo("UNITROOM");
            assertThat(joined.path("players").get(0).path("name").asText()).startsWith("Guest-");
            assertThat(joined.path("hostId").asText()).isEqualTo(joined.path("playerId").asText());
            host.send("{\"type\":\"state\",\"state\":{\"turn\":0}}");
            guest.send("{\"type\":\"join\",\"game\":\"chess\",\"room\":\"UNITROOM\"}");
            JsonNode guestJoined = guest.next("joined");
            assertThat(guestJoined.path("players").size()).isEqualTo(2);
            assertThat(guest.next("state").path("state").path("turn").asInt()).isZero();
            assertThat(host.next("players").path("players").size()).isEqualTo(2);
            guest.send("{\"type\":\"action\",\"action\":{\"move\":\"e2e4\"}}");
            JsonNode action = host.next("action");
            assertThat(action.path("playerId").asText()).isEqualTo(guestJoined.path("playerId").asText());
            assertThat(action.path("action").path("move").asText()).isEqualTo("e2e4");
            guest.send("{\"type\":\"state\",\"state\":{\"turn\":99}}");
            assertThat(guest.next("error").path("message").asText()).contains("Only the host");
            host.send("{\"type\":\"state\",\"state\":{\"turn\":1}}");
            assertThat(guest.next("state").path("state").path("turn").asInt()).isEqualTo(1);
            third.send("{\"type\":\"join\",\"game\":\"chess\",\"room\":\"UNITROOM\"}");
            assertThat(third.next("error").path("message").asText()).contains("full");
            host.socket.sendClose(WebSocket.NORMAL_CLOSURE, "finished").join();
            assertThat(guest.next("closed").path("message").asText()).contains("host left");
        }
    }

    @Test
    void largeBattleStateReachesCurrentAndLateJoiningCommanders() throws Exception {
        try (Client host = new Client(); Client guest = new Client(); Client late = new Client()) {
            host.send("{\"type\":\"join\",\"game\":\"starfall\",\"room\":\"largebattle\"}");
            host.next("joined");
            guest.send("{\"type\":\"join\",\"game\":\"starfall\",\"room\":\"largebattle\"}");
            guest.next("joined");
            var packet = json.createObjectNode().put("type", "state");
            var state = packet.putObject("state").put("game", "starfall");
            var missiles = state.putArray("projectiles");
            for (int i = 0; i < 1600; i++) missiles.addObject().put("id", i)
                    .put("x", 123.457).put("y", 456.789).put("target", 1000)
                    .put("enemy", i % 2 == 0).put("angle", 1.234).put("speed", 130)
                    .put("damage", 550).put("hp", 30).put("life", 11.346)
                    .put("radius", 42).put("source", 1);
            String encoded = json.writeValueAsString(packet);
            assertThat(encoded.length()).isBetween(128 * 1024, 512 * 1024);
            host.send(encoded);
            assertThat(guest.next("state").path("state").path("projectiles").size()).isEqualTo(1600);
            late.send("{\"type\":\"join\",\"game\":\"starfall\",\"room\":\"largebattle\"}");
            late.next("joined");
            assertThat(late.next("state").path("state").path("projectiles").get(1599).path("id").asInt()).isEqualTo(1599);
        }
    }

    @Test
    void badMessagesAreRejectedWithoutBreakingSocket() throws Exception {
        try (Client client = new Client()) {
            client.send("[]");
            assertThat(client.next("error").path("message").asText()).contains("JSON object");
            client.send("{\"type\":\"join\",\"game\":\"invalid\",\"room\":\"abc\"}");
            client.next("error");
            client.send("{\"type\":\"ping\"}");
            client.next("pong");
        }
    }
}
