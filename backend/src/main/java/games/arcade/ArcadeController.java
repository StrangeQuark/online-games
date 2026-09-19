package games.arcade;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ArcadeController {
    static final String SESSION_USER = "arcadeUser";
    static final Set<String> GAMES = Set.of("chess", "solitaire", "checkers", "rift", "starfall", "neonbreak", "lumen", "petal", "driftline", "pocketputt", "fourfold", "wispwood", "parcel", "keepsake", "mosaic");
    static final Set<String> MULTIPLAYER_GAMES = Set.of("chess", "solitaire", "checkers", "rift", "starfall", "fourfold", "keepsake");
    private final ArcadeStore store;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
    // Match a real BCrypt hash for unknown users, avoiding a username timing oracle.
    private final String dummyHash = passwords.encode("no-account-placeholder");
    private final boolean secureCookie;

    public ArcadeController(ArcadeStore store, @Value("${server.servlet.session.cookie.secure}") boolean secureCookie) {
        this.store = store;
        this.secureCookie = secureCookie;
    }

    public record EnrollInput(@NotNull @Pattern(regexp = "[A-Za-z0-9_]{3,20}") String username,
                              @NotNull @Size(min = 8, max = 72) String password,
                              @NotNull @Size(min = 8, max = 72) String confirmPassword) {}
    public record LoginInput(@NotNull @Size(min = 1, max = 20) String username,
                             @NotNull @Size(min = 1, max = 72) String password) {}
    public record ScoreInput(@NotNull @Size(max = 20) String game,
                             @NotNull @Min(0) @Max(100000000) Integer score,
                             @NotNull @Pattern(regexp = "[A-Za-z0-9 _-]{1,32}") String outcome,
                             @NotNull @Pattern(regexp = "[A-Za-z0-9_-]{8,80}") String runId, Long expectedUserId) {}

    @GetMapping("/health")
    public Map<String, String> health() { return Map.of("status", "ok"); }

    @GetMapping("/auth/me")
    public Map<String, Object> me(HttpServletRequest request) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("user", sessionUser(request));
        return result;
    }

    @PostMapping("/auth/enroll")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, ArcadeStore.User> enroll(@Valid @RequestBody EnrollInput input, HttpServletRequest request) {
        if (!input.password().equals(input.confirmPassword())) throw badRequest("Passwords do not match.");
        checkPasswordLength(input.password());
        ArcadeStore.User user;
        try { user = store.enroll(input.username(), passwords.encode(input.password())); }
        catch (DuplicateKeyException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already enrolled."); }
        signIn(request, user);
        return Map.of("user", user);
    }

    @PostMapping("/auth/login")
    public Map<String, ArcadeStore.User> login(@Valid @RequestBody LoginInput input, HttpServletRequest request) {
        checkPasswordLength(input.password());
        var account = store.account(input.username());
        boolean valid = passwords.matches(input.password(), account.map(ArcadeStore.Account::passwordHash).orElse(dummyHash));
        if (!valid || account.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect username or password.");
        signIn(request, account.get().user());
        return Map.of("user", account.get().user());
    }

    @PostMapping("/auth/logout")
    public Map<String, Boolean> logout(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        response.addHeader("Set-Cookie", ResponseCookie.from("ARCADE_SESSION", "").httpOnly(true)
                .secure(secureCookie).sameSite("Lax").path("/").maxAge(0).build().toString());
        return Map.of("ok", true);
    }

    @GetMapping("/profile")
    public Map<String, Object> profile(HttpServletRequest request, @RequestParam(defaultValue = "0") int offset) {
        var user = requireUser(request);
        int pageOffset = Math.max(0, offset);
        var history = store.history(user.id(), pageOffset);
        long total = store.totalGames(user.id());
        return Map.of("user", user, "highScores", store.highScores(user.id()), "history", history,
                "totalGames", total, "hasMore", (long) pageOffset + history.size() < total);
    }

    @GetMapping("/leaderboard")
    public java.util.List<ArcadeStore.Leader> leaderboard() { return store.leaderboard(); }

    @PostMapping("/scores")
    public Map<String, Boolean> score(@Valid @RequestBody ScoreInput input, HttpServletRequest request) {
        var user = requireUser(request);
        if (input.expectedUserId() != null && input.expectedUserId() != user.id())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sign in to the account that completed this round to save it.");
        if (!GAMES.contains(input.game())) throw badRequest("Unknown game.");
        return Map.of("saved", store.saveScore(user.id(), input));
    }

    static ArcadeStore.User sessionUser(HttpServletRequest request) {
        var session = request.getSession(false);
        return session == null ? null : (ArcadeStore.User) session.getAttribute(SESSION_USER);
    }

    private ArcadeStore.User requireUser(HttpServletRequest request) {
        var user = sessionUser(request);
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to save scores and view your profile.");
        return user;
    }

    private void signIn(HttpServletRequest request, ArcadeStore.User user) {
        var oldSession = request.getSession(false);
        if (oldSession != null) oldSession.invalidate();
        request.getSession(true).setAttribute(SESSION_USER, user);
    }

    private void checkPasswordLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw badRequest("Password must be at most 72 UTF-8 bytes.");
    }

    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
