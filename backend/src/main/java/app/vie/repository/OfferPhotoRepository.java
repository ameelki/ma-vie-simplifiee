package app.vie.repository;

import app.vie.entity.OfferPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.Optional;

public interface OfferPhotoRepository extends JpaRepository<OfferPhoto, Long> {
    Optional<OfferPhoto> findByOfferId(Long offerId);
    void deleteByOfferIdIn(Collection<Long> offerIds);
}
