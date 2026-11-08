package app.vie.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Mise à jour automatique des promos : chaque lundi à 7 h, télécharge les prospectus configurés (PROMO_FEEDS) et les fait lire par l'IA.
 * Les adresses des prospectus changent souvent : elles sont à mettre à jour à la main dans PROMO_FEEDS.
 */
@Lazy(false) // l'application démarre en mode paresseux : sans ceci, la tâche du lundi ne serait jamais enregistrée
@Service
public class PromoFeedJob {
    private static final Logger log = LoggerFactory.getLogger(PromoFeedJob.class);
    private final OfferAiService ai;
    private final OfferService offers;
    private final String feeds;
    private final HttpClient http = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).connectTimeout(Duration.ofSeconds(10)).build();

    public PromoFeedJob(OfferAiService ai, OfferService offers, @Value("${app.promo.feeds:}") String feeds) {
        this.ai = ai;
        this.offers = offers;
        this.feeds = feeds == null ? "" : feeds;
    }

    @Scheduled(cron = "0 0 7 * * MON", zone = "Europe/Luxembourg")
    public void weekly() {
        run();
    }

    /** Retourne le nombre de magasins mis à jour. */
    @SuppressWarnings("unchecked")
    public int run() {
        int done = 0;
        if (!ai.enabled()) return 0; // IA désactivée : rien à faire
        for (String part : feeds.split(";")) {
            String[] kv = part.trim().split("\\|", 2);
            if (kv.length != 2) continue;
            String store = OfferAiService.canonicalStore(kv[0]);
            if (store == null) { log.warn("Promos : magasin non accepté « {} »", kv[0]); continue; }
            try {
                HttpResponse<byte[]> res = http.send(HttpRequest.newBuilder(URI.create(kv[1].trim())).timeout(Duration.ofSeconds(60)).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
                if (res.statusCode() / 100 != 2 || res.body().length > 20_000_000) { log.warn("Promos {} : téléchargement refusé (HTTP {})", store, res.statusCode()); continue; }
                String type = res.headers().firstValue("content-type").orElse("application/pdf");
                Map<String, Object> r = ai.extract(res.body(), type, null);
                List<Map<String, Object>> list = (List<Map<String, Object>>) r.get("offers");
                if (list.isEmpty()) continue;
                String until = (String) r.get("validUntil");
                offers.replaceStore(store, until == null ? null : java.time.LocalDate.parse(until), null,
                        list.stream().map(m -> new OfferService.Line((String) m.get("product"), ((Number) m.get("price")).doubleValue(), (String) m.get("unit"), (String) m.get("photo"))).toList());
                done++;
                log.info("Promos {} mises à jour : {} offres", store, list.size());
            } catch (Exception e) {
                log.warn("Promos {} : échec ({})", store, e.toString());
            }
        }
        return done;
    }
}
