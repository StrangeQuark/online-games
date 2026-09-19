package games.arcade;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ArcadeApiTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;

    private MockHttpSession enroll(String username) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/enroll").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"strong-password\",\"confirmPassword\":\"strong-password\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.user.username").value(username))
                .andReturn().getRequest().getSession(false);
    }

    @Test
    void enrollmentLoginAndLogoutProtectPasswordsAndRotateSession() throws Exception {
        var session = enroll("NightOwl");
        assertThat(db.queryForObject("SELECT password_hash FROM arcade_users WHERE username = 'NightOwl'", String.class))
                .startsWith("$2a$12$").doesNotContain("strong-password");
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.user.username").value("NightOwl"));
        mvc.perform(post("/api/auth/enroll").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"nightowl\",\"password\":\"strong-password\",\"confirmPassword\":\"strong-password\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"NightOwl\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
        HttpSession signedIn = mvc.perform(post("/api/auth/login").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"NIGHTOWL\",\"password\":\"strong-password\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
        assertThat(session.isInvalid()).isTrue();
        assertThat(signedIn.getId()).isNotEqualTo(session.getId());
        mvc.perform(post("/api/auth/logout").session((MockHttpSession) signedIn).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));
        assertThat(((MockHttpSession) signedIn).isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isOk()).andExpect(content().json("{\"user\":null}"));
        mvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    void scoresAreIdempotentPrivateAndRanked() throws Exception {
        var first = enroll("ScorePilot");
        var second = enroll("OtherPilot");
        String score = "{\"game\":\"starfall\",\"score\":1200,\"outcome\":\"victory\",\"runId\":\"test-run-123\"}";
        mvc.perform(post("/api/scores").contentType(MediaType.APPLICATION_JSON).content(score)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/scores").session(first).contentType(MediaType.APPLICATION_JSON).content(score))
                .andExpect(status().isOk()).andExpect(jsonPath("$.saved").value(true));
        mvc.perform(post("/api/scores").session(first).contentType(MediaType.APPLICATION_JSON).content(score))
                .andExpect(jsonPath("$.saved").value(false));
        mvc.perform(post("/api/scores").session(first).contentType(MediaType.APPLICATION_JSON)
                .content(score.replace("1200", "800").replace("test-run-123", "test-run-456"))).andExpect(jsonPath("$.saved").value(true));
        mvc.perform(get("/api/profile").session(first)).andExpect(jsonPath("$.highScores[0].score").value(1200))
                .andExpect(jsonPath("$.history.length()").value(2)).andExpect(jsonPath("$.history[0].score").value(800))
                .andExpect(jsonPath("$.history[0].playedAt").isString());
        mvc.perform(get("/api/profile").session(second)).andExpect(jsonPath("$.history.length()").value(0));
        mvc.perform(get("/api/leaderboard"))
                .andExpect(jsonPath("$[?(@.game == 'starfall')].username").value(org.hamcrest.Matchers.hasItem("ScorePilot")))
                .andExpect(jsonPath("$[?(@.game == 'starfall')].score").value(org.hamcrest.Matchers.hasItem(1200)));
        mvc.perform(post("/api/scores").session(first).contentType(MediaType.APPLICATION_JSON).content(score.replace("1200", "-1")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/scores").session(first).contentType(MediaType.APPLICATION_JSON).content(score.replace("1200", "1.5")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/scores").session(first).contentType(MediaType.APPLICATION_JSON).content(score.replace("starfall", "unknown")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recoveredScoresCannotLandInAnotherAccount() throws Exception {
        var original = enroll("RecoveryPilot");
        var other = enroll("DifferentPilot");
        long owner = db.queryForObject("SELECT id FROM arcade_users WHERE username = 'RecoveryPilot'", Long.class);
        String score = "{\"game\":\"lumen\",\"score\":750,\"outcome\":\"complete\",\"runId\":\"recovered-round-123\",\"expectedUserId\":" + owner + "}";
        mvc.perform(post("/api/scores").session(other).contentType(MediaType.APPLICATION_JSON).content(score))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/profile").session(other)).andExpect(jsonPath("$.totalGames").value(0));
        mvc.perform(post("/api/scores").session(original).contentType(MediaType.APPLICATION_JSON).content(score))
                .andExpect(status().isOk()).andExpect(jsonPath("$.saved").value(true));
    }

    @Test
    void fullHistoryIsPagedInOrderAndIsolatedFromOtherAccounts() throws Exception {
        var session = enroll("HistoryPilot");
        var other = enroll("PrivateHistory");
        for (int score = 0; score < 101; score++) {
            mvc.perform(post("/api/scores").session(session).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"game\":\"rift\",\"score\":" + score + ",\"outcome\":\"complete\",\"runId\":\"history-run-" + score + "\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.saved").value(true));
        }
        mvc.perform(get("/api/profile").session(session))
                .andExpect(jsonPath("$.totalGames").value(101)).andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.history.length()").value(100))
                .andExpect(jsonPath("$.history[0].score").value(100)).andExpect(jsonPath("$.history[99].score").value(1));
        mvc.perform(get("/api/profile?offset=100").session(session))
                .andExpect(jsonPath("$.totalGames").value(101)).andExpect(jsonPath("$.hasMore").value(false))
                .andExpect(jsonPath("$.history.length()").value(1)).andExpect(jsonPath("$.history[0].score").value(0))
                .andExpect(jsonPath("$.highScores[0].score").value(100));
        mvc.perform(get("/api/profile?offset=-9").session(session))
                .andExpect(jsonPath("$.history.length()").value(100)).andExpect(jsonPath("$.history[0].score").value(100));
        mvc.perform(get("/api/profile?offset=101").session(session))
                .andExpect(jsonPath("$.history.length()").value(0)).andExpect(jsonPath("$.hasMore").value(false));
        mvc.perform(get("/api/profile?offset=100").session(other))
                .andExpect(jsonPath("$.totalGames").value(0)).andExpect(jsonPath("$.history.length()").value(0))
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void rejectsMismatchedPasswordsMalformedRequestsAndCrossSiteWrites() throws Exception {
        mvc.perform(post("/api/auth/enroll").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"Mismatch\",\"password\":\"strong-password\",\"confirmPassword\":\"another-password\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Passwords do not match."));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("not json"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_FORM_URLENCODED).content("username=a&password=b"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).header("Origin", "https://evil.example").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).header("Origin", "http://localhost:5173").content("{}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"Nobody\",\"password\":\"" + "🔑".repeat(20) + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"Nobody\",\"password\":\"" + "x".repeat(5000) + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Provide a valid JSON request."));
    }

    @Test
    void everyCatalogGameCanSaveAResultAndAppearInPersonalBests() throws Exception {
        var session = enroll("CatalogPlayer");
        for (String game : ArcadeController.GAMES) {
            mvc.perform(post("/api/scores").session(session).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"game\":\"" + game + "\",\"score\":420,\"outcome\":\"complete\",\"runId\":\"catalog-round-" + game + "\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.saved").value(true));
        }
        mvc.perform(get("/api/profile").session(session))
                .andExpect(jsonPath("$.highScores.length()").value(ArcadeController.GAMES.size()))
                .andExpect(jsonPath("$.history.length()").value(ArcadeController.GAMES.size()));
    }

    @Test
    void throttlesRepeatedAuthenticationAttempts() throws Exception {
        for (int attempt = 0; attempt < 30; attempt++) {
            mvc.perform(post("/api/auth/login").with(request -> { request.setRemoteAddr("203.0.113.5"); return request; })
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/auth/login").with(request -> { request.setRemoteAddr("203.0.113.5"); return request; })
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "60"));
    }
}
