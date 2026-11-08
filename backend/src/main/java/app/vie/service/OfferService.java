package app.vie.service;

import app.vie.entity.Offer;
import app.vie.entity.OfferPhoto;
import app.vie.repository.OfferPhotoRepository;
import app.vie.repository.OfferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;

/** Promos communes à tous les utilisateurs : une publication remplace les anciennes offres du même magasin. */
@Service
public class OfferService {
    public record Line(String product, Double price, String unit, String photo) {}

    private final OfferRepository offers;
    private final OfferPhotoRepository photos;

    public OfferService(OfferRepository offers, OfferPhotoRepository photos) {
        this.offers = offers;
        this.photos = photos;
    }

    public List<Offer> current() {
        LocalDate today = LocalDate.now();
        return offers.findAllByOrderByStoreAscProductAsc().stream().filter(o -> o.validUntil == null || !o.validUntil.isBefore(today)).toList();
    }

    @Transactional
    public void replaceStore(String store, LocalDate until, Long publisherId, List<Line> lines) {
        List<Long> old = offers.findByStore(store).stream().map(o -> o.id).toList();
        if (!old.isEmpty()) photos.deleteByOfferIdIn(old);
        offers.deleteByStore(store);
        add(store, until, publisherId, lines);
    }

    /** Ajoute des offres sans toucher à celles qui existent déjà (saisie manuelle). */
    @Transactional
    public void add(String store, LocalDate until, Long publisherId, List<Line> lines) {
        for (Line l : lines) {
            if (l.product() == null || l.product().isBlank() || l.price() == null || l.price() <= 0) continue;
            Offer o = new Offer();
            o.userId = publisherId;
            o.store = store;
            String p = l.product().trim();
            o.product = p.length() > 200 ? p.substring(0, 200) : p;
            o.price = BigDecimal.valueOf(l.price());
            String u = l.unit() == null ? "" : l.unit().trim();
            o.unit = u.isEmpty() ? null : (u.length() > 40 ? u.substring(0, 40) : u);
            o.validUntil = until;
            byte[] jpg = null;
            if (l.photo() != null && l.photo().length() < 300_000) {
                try { jpg = Base64.getDecoder().decode(l.photo()); } catch (IllegalArgumentException ignored) { }
            }
            o.hasPhoto = jpg != null;
            offers.save(o);
            if (jpg != null) {
                OfferPhoto ph = new OfferPhoto();
                ph.offerId = o.id;
                ph.data = jpg;
                photos.save(ph);
            }
        }
    }

    @Transactional
    public void delete(Offer o) {
        photos.deleteByOfferIdIn(List.of(o.id));
        offers.delete(o);
    }
}
