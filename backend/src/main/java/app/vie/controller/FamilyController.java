package app.vie.controller;

import app.vie.dto.Dto;
import app.vie.service.FamilyService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/family")
public class FamilyController {
    private final CurrentUser current;
    private final FamilyService family;

    public FamilyController(CurrentUser current, FamilyService family) {
        this.current = current;
        this.family = family;
    }

    /** La famille de l'utilisateur, ou {} s'il n'en a pas. */
    @GetMapping
    public Object mine(Authentication auth) {
        Dto.FamilyView v = family.view(MeController.me(current, auth));
        return v == null ? Map.of() : v;
    }

    @PostMapping
    public Dto.FamilyView create(@Valid @RequestBody Dto.FamilyCreateRequest r, Authentication auth) {
        return family.create(MeController.me(current, auth), r.name());
    }

    @PostMapping("/join")
    public Dto.FamilyView join(@Valid @RequestBody Dto.JoinRequest r, Authentication auth) {
        return family.join(MeController.me(current, auth), r.code());
    }

    /** Ce que je suis d'accord pour partager avec ma famille. */
    @PutMapping("/offers")
    public Dto.FamilyView offers(@RequestBody Dto.OffersRequest r, Authentication auth) {
        return family.setOffers(MeController.me(current, auth), r.modules());
    }

    /** Admin : qui peut ouvrir quels menus de quel membre. */
    @PutMapping("/grants")
    public Dto.FamilyView grants(@Valid @RequestBody Dto.GrantRequest r, Authentication auth) {
        return family.setGrants(MeController.me(current, auth), r.ownerId(), r.granteeId(), r.modules());
    }

    @PutMapping("/members/{userId}/role")
    public Dto.FamilyView role(@PathVariable Long userId, @Valid @RequestBody Dto.RoleRequest r, Authentication auth) {
        return family.setRole(MeController.me(current, auth), userId, r.role());
    }

    /** Quitter la famille (son propre id) ou retirer un membre (admin). Renvoie {} quand on quitte. */
    @DeleteMapping("/members/{userId}")
    public Object remove(@PathVariable Long userId, Authentication auth) {
        Dto.FamilyView v = family.remove(MeController.me(current, auth), userId);
        return v == null ? Map.of() : v;
    }
}
