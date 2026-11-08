package app.vie.controller;

import app.vie.dto.Dto;
import app.vie.entity.Entry;
import app.vie.entity.Enums;
import app.vie.entity.User;
import app.vie.repository.EntryRepository;
import app.vie.service.AccessService;
import app.vie.service.DemoData;
import app.vie.service.Errors;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Les éléments de tous les menus ; chaque appel vérifie le droit d'accès (soi-même ou partage famille). */
@RestController
@RequestMapping("/api/entries")
public class EntryController {
    private final CurrentUser current;
    private final EntryRepository entries;
    private final AccessService access;
    private final DemoData demo;

    public EntryController(CurrentUser current, EntryRepository entries, AccessService access, DemoData demo) {
        this.current = current;
        this.entries = entries;
        this.access = access;
        this.demo = demo;
    }

    private static Enums.Module module(String m) {
        try {
            return Enums.Module.valueOf(m);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw Errors.bad("ERR_VALIDATION");
        }
    }

    /** Tous les éléments des menus que je peux voir chez « ownerId » (moi par défaut). */
    @GetMapping
    public List<Entry> list(@RequestParam(required = false) Long ownerId, Authentication auth) {
        User me = MeController.me(current, auth);
        Long owner = ownerId == null ? me.id : ownerId;
        Map<Enums.Module, Enums.Level> allowed = access.access(me, owner);
        if (allowed.isEmpty()) throw Errors.forbidden("ERR_FORBIDDEN");
        List<Entry> out = new ArrayList<>();
        for (Entry e : entries.findByOwnerIdOrderByDateAscIdAsc(owner)) {
            if (e.module != null && allowed.containsKey(e.module)) out.add(e);
        }
        return out;
    }

    private static void apply(Entry e, Dto.EntryRequest r) {
        e.title = r.title().trim();
        e.note = r.note();
        e.amount = r.amount();
        e.kind = r.kind();
        e.category = r.category();
        e.date = r.date();
        e.time = r.time();
        e.status = r.status();
        e.done = r.done() != null && r.done();
    }

    @PostMapping
    public Entry create(@Valid @RequestBody Dto.EntryRequest r, Authentication auth) {
        User me = MeController.me(current, auth);
        Long owner = r.ownerId() == null ? me.id : r.ownerId();
        Enums.Module m = module(r.module());
        access.require(me, owner, m, true);
        Entry e = new Entry();
        e.ownerId = owner;
        e.module = m;
        apply(e, r);
        return entries.save(e);
    }

    @PutMapping("/{id}")
    public Entry update(@PathVariable Long id, @Valid @RequestBody Dto.EntryRequest r, Authentication auth) {
        User me = MeController.me(current, auth);
        Entry e = entries.findById(id).orElseThrow(() -> Errors.notFound("ERR_NOT_FOUND"));
        access.require(me, e.ownerId, e.module, true);
        apply(e, r);
        return entries.save(e);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        User me = MeController.me(current, auth);
        Entry e = entries.findById(id).orElseThrow(() -> Errors.notFound("ERR_NOT_FOUND"));
        access.require(me, e.ownerId, e.module, true);
        entries.delete(e);
    }

    /** Charge des exemples dans mon espace (seulement s'il est encore vide). */
    @PostMapping("/demo")
    public List<Entry> loadDemo(Authentication auth) {
        return demo.seed(MeController.me(current, auth));
    }
}
