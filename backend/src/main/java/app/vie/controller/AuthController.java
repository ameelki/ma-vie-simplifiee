package app.vie.controller;

import app.vie.dto.Dto;
import app.vie.entity.Enums;
import app.vie.entity.User;
import app.vie.repository.UserRepository;
import app.vie.security.JwtService;
import app.vie.service.Errors;
import app.vie.service.MailService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final MailService mail;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, MailService mail) {
        this.mail = mail;
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    static String cleanLang(String lang) {
        if (lang == null) return "fr";
        String l = lang.trim().toLowerCase();
        return l.equals("de") || l.equals("en") || l.equals("pt") ? l : "fr";
    }

    @PostMapping("/register")
    public Dto.AuthResponse register(@Valid @RequestBody Dto.RegisterRequest r) {
        if (users.existsByEmailIgnoreCase(r.email().trim())) throw Errors.conflict("ERR_EMAIL_EXISTS");
        User u = new User();
        u.name = r.name().trim();
        u.email = r.email().trim().toLowerCase();
        u.phone = r.phone();
        u.lang = cleanLang(r.lang());
        u.passwordHash = encoder.encode(r.password());
        u.role = Enums.Role.USER;
        users.save(u);
        mail.welcome(u);
        return new Dto.AuthResponse(jwt.generate(u.email), u);
    }

    @PostMapping("/login")
    public Dto.AuthResponse login(@Valid @RequestBody Dto.LoginRequest r) {
        User u = users.findByEmailIgnoreCase(r.email().trim()).orElse(null);
        if (u == null || !u.active || !encoder.matches(r.password(), u.passwordHash))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ERR_BAD_CREDENTIALS");
        return new Dto.AuthResponse(jwt.generate(u.email), u);
    }
}
