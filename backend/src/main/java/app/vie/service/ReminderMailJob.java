package app.vie.service;

import app.vie.entity.Entry;
import app.vie.entity.User;
import app.vie.repository.EntryRepository;
import app.vie.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Résumé quotidien par e-mail (8 h, activé avec MAIL_DIGEST=true) et envoi à la demande depuis le profil. */
@Service
public class ReminderMailJob {
    private final EntryRepository entries;
    private final UserRepository users;
    private final MailService mail;
    private final boolean digest;

    public ReminderMailJob(EntryRepository entries, UserRepository users, MailService mail, @Value("${app.mail.digest:false}") boolean digest) {
        this.entries = entries;
        this.users = users;
        this.mail = mail;
        this.digest = digest;
    }

    private static String money(Entry e) {
        return e.amount == null ? "" : " (" + e.amount.setScale(2, java.math.RoundingMode.HALF_UP) + " €)";
    }

    public List<String> lines(User u) {
        LocalDate today = LocalDate.now();
        List<String> out = new ArrayList<>();
        for (Entry e : entries.findByOwnerIdOrderByDateAscIdAsc(u.id)) {
            if (e.date == null || e.module == null) continue;
            switch (e.module) {
                case BILLS -> { if (!"PAID".equals(e.status) && !e.date.isAfter(today.plusDays(3))) out.add(e.title + money(e) + " - " + e.date); }
                case AGENDA -> { if (e.date.equals(today)) out.add(e.title + (e.time != null ? " - " + e.time : "")); }
                case TASKS -> { if (!"DONE".equals(e.status) && !e.date.isAfter(today.plusDays(1))) out.add(e.title + " - " + e.date); }
                case DOCUMENTS -> { if (!e.date.isAfter(today.plusDays(30))) out.add(e.title + " - " + e.date); }
                default -> { }
            }
        }
        return out;
    }

    /** Envoie le résumé à l'utilisateur, même s'il est vide (test depuis le profil). */
    public int sendNow(User u) {
        List<String> l = lines(u);
        mail.digest(u, l);
        return l.size();
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Europe/Luxembourg")
    public void daily() {
        if (!digest) return;
        for (User u : users.findAll()) {
            if (!u.active) continue;
            List<String> l = lines(u);
            if (!l.isEmpty()) mail.digest(u, l);
        }
    }
}
