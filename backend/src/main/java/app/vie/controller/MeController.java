package app.vie.controller;

import app.vie.dto.Dto;
import app.vie.entity.User;
import app.vie.repository.UserRepository;
import app.vie.service.AccessService;
import app.vie.service.Errors;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final CurrentUser current;
    private final UserRepository users;
    private final AccessService access;

    public MeController(CurrentUser current, UserRepository users, AccessService access) {
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

    /** Les membres de ma famille dont je peux ouvrir au moins un menu. */
    @GetMapping("/access")
    public List<Dto.Viewable> viewables(Authentication auth) {
        return access.viewables(me(current, auth));
    }
}
