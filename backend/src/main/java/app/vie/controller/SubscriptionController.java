package app.vie.controller;

import app.vie.entity.Enums;
import app.vie.entity.Subscription;
import app.vie.entity.User;
import app.vie.repository.SubscriptionRepository;
import app.vie.service.Errors;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Abonnement Premium. Le paiement en ligne n'est pas branché : choisir une offre l'active directement (mode démonstration).
 */
@RestController
@RequestMapping("/api/subscription")
public class SubscriptionController {
    private final CurrentUser current;
    private final SubscriptionRepository subs;

    public SubscriptionController(CurrentUser current, SubscriptionRepository subs) {
        this.current = current;
        this.subs = subs;
    }

    private Subscription mine(User me) {
        return subs.findByUserId(me.id).orElseGet(() -> {
            Subscription s = new Subscription();
            s.userId = me.id;
            return subs.save(s);
        });
    }

    private static Map<String, Object> view(Subscription s) {
        LocalDate today = LocalDate.now();
        boolean trial = s.trialEndsAt != null && !s.trialEndsAt.isBefore(today);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("plan", s.plan.name());
        m.put("trialEndsAt", s.trialEndsAt);
        m.put("trialActive", trial);
        m.put("trialUsed", s.trialEndsAt != null);
        m.put("trialDaysLeft", trial ? ChronoUnit.DAYS.between(today, s.trialEndsAt) : 0);
        m.put("premium", s.plan != Enums.Plan.FREE || trial);
        return m;
    }

    @GetMapping
    public Map<String, Object> get(Authentication auth) {
        return view(mine(MeController.me(current, auth)));
    }

    /** Démarre l'essai gratuit de 7 jours (une seule fois). */
    @PostMapping("/trial")
    public Map<String, Object> trial(Authentication auth) {
        Subscription s = mine(MeController.me(current, auth));
        if (s.trialEndsAt != null) throw Errors.bad("ERR_CONFLICT");
        s.trialEndsAt = LocalDate.now().plusDays(7);
        return view(subs.save(s));
    }

    @PutMapping("/plan")
    public Map<String, Object> plan(@RequestBody Map<String, String> body, Authentication auth) {
        Enums.Plan p;
        try {
            p = Enums.Plan.valueOf(String.valueOf(body.get("plan")));
        } catch (IllegalArgumentException e) {
            throw Errors.bad("ERR_VALIDATION");
        }
        Subscription s = mine(MeController.me(current, auth));
        s.plan = p;
        s.startedAt = p == Enums.Plan.FREE ? null : LocalDate.now();
        return view(subs.save(s));
    }
}
