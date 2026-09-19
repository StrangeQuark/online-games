package games.arcade;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Same-origin JSON writes prevent browser CSRF without an extra token exchange. */
@Component
public class RequestGuard extends OncePerRequestFilter {
    private final Set<String> origins;
    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();
    private record AttemptWindow(long startedAt, int count) {}

    public RequestGuard(@Value("${arcade.origins}") String origins) {
        this.origins = Arrays.stream(origins.split(",")).map(String::trim).collect(Collectors.toSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "same-origin");
        if (request.getRequestURI().startsWith("/api/")) response.setHeader("Cache-Control", "no-store");
        if (request.getRequestURI().startsWith("/api/") && !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod())) {
            String origin = request.getHeader("Origin");
            if (origin != null && !origins.contains(origin) && !sameOrigin(request, origin)) {
                reject(response, 403, "This origin is not allowed."); return;
            }
            if ("cross-site".equals(request.getHeader("Sec-Fetch-Site")) && (origin == null || !origins.contains(origin))) {
                reject(response, 403, "Cross-site requests are not allowed."); return;
            }
            String contentType = request.getContentType();
            if (contentType == null || !contentType.split(";", 2)[0].trim().equalsIgnoreCase("application/json")) {
                reject(response, 415, "Use application/json."); return;
            }
            if (request.getContentLengthLong() > 16_384) { reject(response, 413, "Request is too large."); return; }
            if (Set.of("/api/auth/login", "/api/auth/enroll").contains(request.getRequestURI()) && !allowAttempt(request.getRemoteAddr())) {
                response.setHeader("Retry-After", "60");
                reject(response, 429, "Too many attempts. Please wait a minute."); return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean sameOrigin(HttpServletRequest request, String origin) {
        try {
            URI uri = URI.create(origin);
            int port = uri.getPort() == -1 ? ("https".equals(uri.getScheme()) ? 443 : 80) : uri.getPort();
            return request.getScheme().equals(uri.getScheme()) && request.getServerName().equalsIgnoreCase(uri.getHost()) && request.getServerPort() == port;
        } catch (IllegalArgumentException e) { return false; }
    }

    private boolean allowAttempt(String ip) {
        long now = System.currentTimeMillis();
        if (attempts.size() > 1000) attempts.entrySet().removeIf(entry -> now - entry.getValue().startedAt() > 60_000);
        if (attempts.size() > 10_000 && !attempts.containsKey(ip)) return false;
        var window = attempts.compute(ip, (key, previous) -> previous == null || now - previous.startedAt() > 60_000
                ? new AttemptWindow(now, 1) : new AttemptWindow(previous.startedAt(), previous.count() + 1));
        return window.count() <= 30;
    }

    private void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
