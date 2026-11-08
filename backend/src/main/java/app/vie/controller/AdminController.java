package app.vie.controller;

import app.vie.entity.User;
import app.vie.repository.UserRepository;
import app.vie.service.Errors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Espace administrateur : liste des utilisateurs et de leur activité. Réservé aux e-mails de APP_ADMINS (ou au rôle ADMIN). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final CurrentUser current;
    private final UserRepository users;
    private final List<String> admins;

    public AdminController(CurrentUser current, UserRepository users, @Value("${app.admin.emails:}") String admins) {
        this.current = current;
        this.users = users;
        this.admins = Arrays.stream(admins.split(",")).map(String::trim).filter(x -> !x.isEmpty()).map(String::toLowerCase).toList();
    }

    private boolean isAdmin(User u) {
        return u.role == app.vie.entity.Enums.Role.ADMIN || admins.contains(u.email.toLowerCase());
    }

    public record UserRow(Long id, String name, String email, String lang, LocalDateTime createdAt, LocalDateTime lastSeenAt, boolean online) {}

    @GetMapping("/status")
    public Map<String, Boolean> status(Authentication auth) {
        return Map.of("admin", isAdmin(MeController.me(current, auth)));
    }

    @GetMapping("/users")
    public Map<String, Object> list(Authentication auth) {
        if (!isAdmin(MeController.me(current, auth))) throw Errors.forbidden("ERR_FORBIDDEN");
        LocalDateTime now = LocalDateTime.now();
        List<User> all = users.findAll();
        List<UserRow> rows = all.stream()
                .sorted(Comparator.comparing((User u) -> u.lastSeenAt == null ? u.createdAt : u.lastSeenAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(u -> new UserRow(u.id, u.name, u.email, u.lang, u.createdAt, u.lastSeenAt, u.lastSeenAt != null && u.lastSeenAt.isAfter(now.minusMinutes(10))))
                .toList();
        long day = all.stream().filter(u -> u.lastSeenAt != null && u.lastSeenAt.isAfter(now.minusDays(1))).count();
        long week = all.stream().filter(u -> u.lastSeenAt != null && u.lastSeenAt.isAfter(now.minusDays(7))).count();
        return Map.of("total", all.size(), "online", rows.stream().filter(UserRow::online).count(), "day", day, "week", week, "users", rows);
    }
}
