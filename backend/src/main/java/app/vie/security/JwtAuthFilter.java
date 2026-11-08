package app.vie.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import app.vie.entity.User;
import app.vie.repository.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String email = jwt.extractEmail(header.substring(7));
            if (email != null) {
                User u = users.findByEmailIgnoreCase(email).orElse(null);
                if (u != null && u.active) {
                    java.time.LocalDateTime now = java.time.LocalDateTime.now();
                    if (u.lastSeenAt == null || u.lastSeenAt.isBefore(now.minusMinutes(5))) {
                        u.lastSeenAt = now;
                        try { users.save(u); } catch (Exception ignored) { }
                    }
                    var auth = new UsernamePasswordAuthenticationToken(
                            u.email, null, List.of(new SimpleGrantedAuthority("ROLE_" + u.role.name())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        chain.doFilter(req, res);
    }
}
