package app.vie.controller;

import app.vie.entity.Entry;
import app.vie.entity.Enums;
import app.vie.entity.Notification;
import app.vie.entity.User;
import app.vie.repository.EntryRepository;
import app.vie.repository.NotificationRepository;
import app.vie.service.Errors;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Rappels : générés à partir de mes propres menus (factures proches, rendez-vous, tâches, documents qui expirent). */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final CurrentUser current;
    private final NotificationRepository notifs;
    private final EntryRepository entries;

    public NotificationController(CurrentUser current, NotificationRepository notifs, EntryRepository entries) {
        this.current = current;
        this.notifs = notifs;
        this.entries = entries;
    }

    private void add(User me, Enums.NotifKind kind, Entry e) {
        if (notifs.existsByUserIdAndRefEntryIdAndKind(me.id, e.id, kind)) return;
        Notification n = new Notification();
        n.userId = me.id;
        n.kind = kind;
        n.title = e.title;
        n.dueDate = e.date;
        n.amount = e.amount;
        n.refEntryId = e.id;
        notifs.save(n);
    }

    private void refresh(User me) {
        LocalDate today = LocalDate.now();
        for (Entry e : entries.findByOwnerIdOrderByDateAscIdAsc(me.id)) {
            if (e.date == null || e.module == null) continue;
            switch (e.module) {
                case BILLS -> { if (!"PAID".equals(e.status) && !e.date.isAfter(today.plusDays(3))) add(me, Enums.NotifKind.BILL, e); }
                case AGENDA -> { if (!e.date.isBefore(today) && !e.date.isAfter(today.plusDays(1))) add(me, Enums.NotifKind.EVENT, e); }
                case TASKS -> { if (!"DONE".equals(e.status) && !e.date.isAfter(today.plusDays(1))) add(me, Enums.NotifKind.TASK, e); }
                case DOCUMENTS -> { if (!e.date.isAfter(today.plusDays(30))) add(me, Enums.NotifKind.DOCUMENT, e); }
                default -> { }
            }
        }
    }

    @GetMapping
    public List<Notification> list(Authentication auth) {
        User me = MeController.me(current, auth);
        refresh(me);
        return notifs.findTop50ByUserIdOrderByCreatedAtDescIdDesc(me.id);
    }

    @GetMapping("/count")
    public Map<String, Long> count(Authentication auth) {
        User me = MeController.me(current, auth);
        refresh(me);
        return Map.of("unread", notifs.countByUserIdAndReadFlagFalse(me.id));
    }

    @PutMapping("/{id}/read")
    public void read(@PathVariable Long id, Authentication auth) {
        User me = MeController.me(current, auth);
        Notification n = notifs.findById(id).orElseThrow(() -> Errors.notFound("ERR_NOT_FOUND"));
        if (!me.id.equals(n.userId)) throw Errors.forbidden("ERR_FORBIDDEN");
        n.readFlag = Boolean.TRUE;
        notifs.save(n);
    }

    @PutMapping("/read-all")
    public void readAll(Authentication auth) {
        User me = MeController.me(current, auth);
        List<Notification> list = notifs.findByUserIdAndReadFlagFalse(me.id);
        list.forEach(n -> n.readFlag = Boolean.TRUE);
        notifs.saveAll(list);
    }
}
