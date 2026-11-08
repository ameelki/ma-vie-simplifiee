package app.vie.service;

import app.vie.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Envoi d'e-mails par SMTP (en local : Mailpit, sans compte ni coût). Une erreur d'envoi ne bloque jamais l'application. */
@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final ObjectProvider<JavaMailSender> sender;
    private final boolean enabled;
    private final String from;

    public MailService(ObjectProvider<JavaMailSender> sender, @Value("${app.mail.enabled:true}") boolean enabled,
                       @Value("${app.mail.from}") String from) {
        this.sender = sender;
        this.enabled = enabled;
        this.from = from;
    }

    @Async
    public void send(String to, String subject, String text) {
        JavaMailSender s = sender.getIfAvailable();
        if (!enabled || s == null || to == null || to.isBlank()) return;
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(text);
            s.send(m);
            log.info("E-mail envoyé à {} : {}", to, subject);
        } catch (Exception e) {
            log.warn("E-mail non envoyé à {} : {}", to, e.getMessage());
        }
    }

    private static int idx(String lang) {
        return switch (lang == null ? "fr" : lang) {
            case "en" -> 1;
            case "de" -> 2;
            case "pt" -> 3;
            default -> 0;
        };
    }

    public void welcome(User u) {
        String[] subject = {"Bienvenue dans Ma Vie Simplifiée", "Welcome to My Life Simplified", "Willkommen bei Mein Leben vereinfacht", "Bem-vindo à A Minha Vida Simplificada"};
        String[] body = {
            "Bonjour %s,\n\nVotre compte est prêt. Budget, factures, agenda, documents, courses et tâches : tout est au même endroit, et vous décidez ce que vous partagez avec votre famille.\n\nMoins de stress. Plus de contrôle.",
            "Hello %s,\n\nYour account is ready. Budget, bills, calendar, documents, shopping and tasks: all in one place, and you decide what you share with your family.\n\nLess stress. More control.",
            "Hallo %s,\n\nIhr Konto ist bereit. Budget, Rechnungen, Kalender, Dokumente, Einkäufe und Aufgaben: alles an einem Ort, und Sie entscheiden, was Sie mit Ihrer Familie teilen.\n\nWeniger Stress. Mehr Kontrolle.",
            "Olá %s,\n\nA sua conta está pronta. Orçamento, faturas, agenda, documentos, compras e tarefas: tudo num só lugar, e é você quem decide o que partilha com a família.\n\nMenos stress. Mais controlo."};
        int i = idx(u.lang);
        send(u.email, subject[i], String.format(body[i], u.name));
    }

    public void digest(User u, java.util.List<String> lines) {
        String[] subject = {"Votre résumé du jour", "Your daily summary", "Ihre Tagesübersicht", "O seu resumo do dia"};
        String[] head = {"Bonjour %s, voici l'essentiel :", "Hello %s, here is what matters:", "Hallo %s, das Wichtigste:", "Olá %s, eis o essencial:"};
        String[] none = {"Rien d'urgent aujourd'hui. Profitez de votre journée !", "Nothing urgent today. Enjoy your day!", "Heute nichts Dringendes. Genießen Sie den Tag!", "Nada urgente hoje. Aproveite o seu dia!"};
        int i = idx(u.lang);
        StringBuilder sb = new StringBuilder(String.format(head[i], u.name)).append("\n\n");
        if (lines.isEmpty()) sb.append(none[i]);
        else lines.forEach(l -> sb.append("• ").append(l).append('\n'));
        send(u.email, subject[i], sb.toString());
    }
}
