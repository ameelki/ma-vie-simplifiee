package app.vie.controller;

import app.vie.entity.Offer;
import app.vie.entity.OfferPhoto;
import app.vie.entity.User;
import app.vie.repository.OfferPhotoRepository;
import app.vie.repository.OfferRepository;
import app.vie.service.Errors;
import app.vie.service.OfferAiService;
import app.vie.service.OfferService;
import app.vie.service.PromoFeedJob;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Promos des supermarchés du Luxembourg, communes à tous : les utilisateurs consultent seulement.
 * Les prospectus sont publiés par les administrateurs (PROMO_ADMINS) ou récupérés automatiquement (PROMO_FEEDS).
 */
@RestController
@RequestMapping("/api/offers")
public class OfferController {
    private static final long MAX = 8L * 1024 * 1024;
    private final CurrentUser current;
    private final OfferRepository offerRepo;
    private final OfferPhotoRepository photos;
    private final OfferAiService ai;
    private final OfferService service;
    private final PromoFeedJob feed;
    private final List<String> admins;

    public OfferController(CurrentUser current, OfferRepository offerRepo, OfferPhotoRepository photos, OfferAiService ai, OfferService service,
                           PromoFeedJob feed, @Value("${app.promo.admins:}") String admins) {
        this.current = current;
        this.offerRepo = offerRepo;
        this.photos = photos;
        this.ai = ai;
        this.service = service;
        this.feed = feed;
        this.admins = Arrays.stream(admins.split(",")).map(String::trim).filter(x -> !x.isEmpty()).map(String::toLowerCase).toList();
    }

    public record SaveRequest(String store, String validUntil, List<OfferService.Line> offers) {}

    private boolean publisher(User u) {
        return u.role == app.vie.entity.Enums.Role.ADMIN || admins.contains(u.email.toLowerCase());
    }

    private User publisherOnly(Authentication auth) {
        User me = MeController.me(current, auth);
        if (!publisher(me)) throw Errors.forbidden("ERR_FORBIDDEN");
        return me;
    }

    @GetMapping
    public List<Offer> list(Authentication auth) {
        MeController.me(current, auth);
        return service.current();
    }

    @GetMapping("/can-publish")
    public Map<String, Boolean> canPublish(Authentication auth) {
        return Map.of("canPublish", publisher(MeController.me(current, auth)));
    }

    /** Lit un prospectus (fichier ou texte collé) : renvoie les offres trouvées, sans rien enregistrer. */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> read(@RequestParam(value = "file", required = false) MultipartFile file,
                                    @RequestParam(value = "text", required = false) String text, Authentication auth) throws IOException {
        publisherOnly(auth);
        boolean hasFile = file != null && !file.isEmpty();
        if (!hasFile && (text == null || text.isBlank())) throw Errors.bad("ERR_VALIDATION");
        if (hasFile && file.getSize() > MAX) throw Errors.bad("ERR_FILE_TOO_BIG");
        return ai.extract(hasFile ? file.getBytes() : null, hasFile ? file.getContentType() : null, text);
    }

    /** Publie les offres validées : elles remplacent celles du même magasin pour tout le monde. */
    @PostMapping
    public List<Offer> save(@RequestBody SaveRequest r, Authentication auth) {
        User me = publisherOnly(auth);
        String store = OfferAiService.canonicalStore(r.store());
        if (store == null) throw Errors.bad("ERR_STORE");
        if (r.offers() == null || r.offers().isEmpty()) throw Errors.bad("ERR_VALIDATION");
        LocalDate until = r.validUntil() != null && r.validUntil().matches("\\d{4}-\\d{2}-\\d{2}") ? LocalDate.parse(r.validUntil()) : null;
        service.replaceStore(store, until, me.id, r.offers());
        return service.current();
    }

    /** Lance tout de suite la récupération automatique des prospectus configurés. */
    @PostMapping("/refresh")
    public Map<String, Integer> refresh(Authentication auth) {
        publisherOnly(auth);
        return Map.of("stores", feed.run());
    }

    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> photo(@PathVariable Long id, Authentication auth) {
        MeController.me(current, auth);
        OfferPhoto ph = photos.findByOfferId(id).orElseThrow(() -> Errors.notFound("ERR_NOT_FOUND"));
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.maxAge(Duration.ofHours(12)).cachePrivate()).body(ph.data);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        publisherOnly(auth);
        service.delete(offerRepo.findById(id).orElseThrow(() -> Errors.notFound("ERR_NOT_FOUND")));
    }
}
