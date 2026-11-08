package app.vie.controller;

import app.vie.entity.Offer;
import app.vie.entity.User;
import app.vie.repository.OfferRepository;
import app.vie.service.Errors;
import app.vie.service.OfferAiService;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Prix et offres des supermarchés : prospectus lus par l'IA (Ollama), enregistrés par l'utilisateur, comparés à sa liste de courses. */
@RestController
@RequestMapping("/api/offers")
public class OfferController {
    private static final long MAX = 8L * 1024 * 1024;
    private final CurrentUser current;
    private final OfferRepository offers;
    private final OfferAiService ai;

    public OfferController(CurrentUser current, OfferRepository offers, OfferAiService ai) {
        this.current = current;
        this.offers = offers;
        this.ai = ai;
    }

    public record Line(String product, Double price, String unit) {}
    public record SaveRequest(String store, String validUntil, List<Line> offers) {}

    @GetMapping
    public List<Offer> list(Authentication auth) {
        User me = MeController.me(current, auth);
        LocalDate today = LocalDate.now();
        return offers.findByUserIdOrderByStoreAscProductAsc(me.id).stream()
                .filter(o -> o.validUntil == null || !o.validUntil.isBefore(today)).toList();
    }

    /** Lit un prospectus (fichier ou texte collé) : renvoie les offres trouvées, sans rien enregistrer. */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> read(@RequestParam(value = "file", required = false) MultipartFile file,
                                    @RequestParam(value = "text", required = false) String text) throws IOException {
        boolean hasFile = file != null && !file.isEmpty();
        if (!hasFile && (text == null || text.isBlank())) throw Errors.bad("ERR_VALIDATION");
        if (hasFile && file.getSize() > MAX) throw Errors.bad("ERR_FILE_TOO_BIG");
        return ai.extract(hasFile ? file.getBytes() : null, hasFile ? file.getContentType() : null, text);
    }

    /** Enregistre les offres validées par l'utilisateur ; remplace les anciennes offres du même magasin. */
    @PostMapping
    @Transactional
    public List<Offer> save(@RequestBody SaveRequest r, Authentication auth) {
        User me = MeController.me(current, auth);
        String store = r.store() == null ? "" : r.store().trim();
        if (store.isEmpty() || store.length() > 60 || r.offers() == null || r.offers().isEmpty()) throw Errors.bad("ERR_VALIDATION");
        LocalDate until = null;
        if (r.validUntil() != null && r.validUntil().matches("\\d{4}-\\d{2}-\\d{2}")) until = LocalDate.parse(r.validUntil());
        offers.deleteByUserIdAndStore(me.id, store);
        for (Line l : r.offers()) {
            if (l.product() == null || l.product().isBlank() || l.price() == null || l.price() <= 0) continue;
            Offer o = new Offer();
            o.userId = me.id;
            o.store = store;
            o.product = l.product().trim().length() > 200 ? l.product().trim().substring(0, 200) : l.product().trim();
            o.price = BigDecimal.valueOf(l.price());
            o.unit = l.unit() == null || l.unit().isBlank() ? null : (l.unit().trim().length() > 40 ? l.unit().trim().substring(0, 40) : l.unit().trim());
            o.validUntil = until;
            offers.save(o);
        }
        return list(auth);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        User me = MeController.me(current, auth);
        Offer o = offers.findById(id).orElseThrow(() -> Errors.notFound("ERR_NOT_FOUND"));
        if (!me.id.equals(o.userId)) throw Errors.forbidden("ERR_FORBIDDEN");
        offers.delete(o);
    }
}
