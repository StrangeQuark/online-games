package games.arcade;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ArcadeStore {
    public record User(long id, String username) {}
    record Account(User user, String passwordHash) {}
    public record HighScore(String game, int score) {}
    public record PlayedGame(long id, String game, int score, String outcome, Instant playedAt) {}
    public record Leader(String username, String game, int score) {}
    private final JdbcTemplate db;

    public ArcadeStore(JdbcTemplate db) { this.db = db; }

    Optional<Account> account(String username) {
        return db.query("SELECT id, username, password_hash FROM arcade_users WHERE username_lower = ?",
                (rs, n) -> new Account(new User(rs.getLong("id"), rs.getString("username")), rs.getString("password_hash")),
                username.toLowerCase(Locale.ROOT)).stream().findFirst();
    }

    User enroll(String username, String passwordHash) {
        db.update("INSERT INTO arcade_users (username, username_lower, password_hash) VALUES (?, ?, ?)",
                username, username.toLowerCase(Locale.ROOT), passwordHash);
        return account(username).orElseThrow().user();
    }

    boolean saveScore(long userId, ArcadeController.ScoreInput score) {
        return db.update("""
                INSERT INTO scores (user_id, game, score, outcome, run_id) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """, userId, score.game(), score.score(), score.outcome(), score.runId()) == 1;
    }

    List<HighScore> highScores(long userId) {
        return db.query("SELECT game, MAX(score) AS score FROM scores WHERE user_id = ? GROUP BY game ORDER BY game",
                (rs, n) -> new HighScore(rs.getString("game"), rs.getInt("score")), userId);
    }

    long totalGames(long userId) {
        return db.queryForObject("SELECT COUNT(*) FROM scores WHERE user_id = ?", Long.class, userId);
    }

    List<PlayedGame> history(long userId, int offset) {
        return db.query("""
                SELECT id, game, score, outcome, played_at FROM scores
                WHERE user_id = ? ORDER BY played_at DESC, id DESC LIMIT 100 OFFSET ?
                """, (rs, n) -> new PlayedGame(rs.getLong("id"), rs.getString("game"), rs.getInt("score"),
                rs.getString("outcome"), rs.getTimestamp("played_at").toInstant()), userId, offset);
    }

    List<Leader> leaderboard() {
        return db.query("""
                SELECT username, game, score FROM (
                    SELECT u.username, s.game, MAX(s.score) AS score,
                        ROW_NUMBER() OVER (PARTITION BY s.game ORDER BY MAX(s.score) DESC, u.username) AS ranking
                    FROM scores s JOIN arcade_users u ON s.user_id = u.id GROUP BY u.id, u.username, s.game
                ) ranked WHERE ranking <= 10 ORDER BY game, score DESC, username
                """, (rs, n) -> new Leader(rs.getString("username"), rs.getString("game"), rs.getInt("score")));
    }
}
