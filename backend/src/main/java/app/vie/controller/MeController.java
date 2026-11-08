package app.vie.controller;

import app.vie.dto.Dto;
import app.vie.entity.User;
import app.vie.repository.UserRepository;
import app.vie.service.AccessService;
import app.vie.service.Errors;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final CurrentUser current;
    private final UserRepository users;
    private final AccessService access;
    private final PasswordEncoder encoder;

    public MeController(CurrentUser current, UserRepository users, AccessService access, PasswordEncoder encoder) {
        this.encoder = encoder;
        this.current = current;
        this.users = users;
        this.access = access;
    }

    static User me(CurrentUser current, Authentication auth) {
        User u = current.get(auth);
        if (u == null) throw Errors.notFound("ERR_USER_UNKNOWN");
        return u;
    }

    @GetMapping
    public User profile(Authentication auth) {
        return me(current, auth);
    }

    @PutMapping
    public User update(@Valid @RequestBody Dto.ProfileRequest r, Authentication auth) {
        User u = me(current, auth);
        u.name = r.name().trim();
        u.phone = r.phone();
        u.lang = AuthController.cleanLang(r.lang());
        return users.save(u);
    }

    public record OpeningRequest(Double amount) {}
    public record Charge(String label, Double amount) {}
    public record PlanRequest(Double monthlyIncome, List<Charge> fixed) {}

    /** Mon budget mensuel : revenu net et charges fixes, base du « reste à vivre » calculé dans Budget. */
    @PutMapping("/plan")
    public User plan(@RequestBody PlanRequest r, Authentication auth) throws com.fasterxml.jackson.core.JsonProcessingException {
        User u = me(current, auth);
        if (r.monthlyIncome() == null) u.monthlyIncome = null;
        else if (r.monthlyIncome() < 0 || r.monthlyIncome() > 1e9) throw Errors.bad("ERR_VALIDATION");
        else u.monthlyIncome = java.math.BigDecimal.valueOf(r.monthlyIncome()).setScale(2, java.math.RoundingMode.HALF_UP);
        List<Charge> clean = new java.util.ArrayList<>();
        if (r.fixed() != null) {
            if (r.fixed().size() > 30) throw Errors.bad("ERR_VALIDATION");
            for (Charge c : r.fixed()) {
                if (c.label() == null || c.label().isBlank() || c.amount() == null || c.amount() < 0 || c.amount() > 1e9) continue;
                String l = c.label().trim();
                clean.add(new Charge(l.length() > 60 ? l.substring(0, 60) : l, Math.round(c.amount() * 100) / 100.0));
            }
        }
        u.fixedCharges = clean.isEmpty() ? null : new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(clean);
        return users.save(u);
    }

    /** Solde de départ de mon compte (Budget). Vide = aucun. */
    @PutMapping("/opening")
    public User opening(@RequestBody OpeningRequest r, Authentication auth) {
        User u = me(current, auth);
        if (r.amount() == null) u.openingBalance = null;
        else if (Math.abs(r.amount()) > 1e9) throw Errors.bad("ERR_VALIDATION");
        else u.openingBalance = java.math.BigDecimal.valueOf(r.amount()).setScale(2, java.math.RoundingMode.HALF_UP);
        return users.save(u);
    }

    /** Changer mon mot de passe (le mot de passe actuel est demandé). */
    @PutMapping("/password")
    public void password(@Valid @RequestBody Dto.PasswordRequest r, Authentication auth) {
        User u = me(current, auth);
        if (!encoder.matches(r.current(), u.passwordHash)) throw Errors.bad("ERR_BAD_CREDENTIALS");
        u.passwordHash = encoder.encode(r.password());
        users.save(u);
    }

    /** Les membres de ma famille dont je peux ouvrir au moins un menu. */
    @GetMapping("/access")
    public List<Dto.Viewable> viewables(Authentication auth) {
        return access.viewables(me(current, auth));
    }
}
