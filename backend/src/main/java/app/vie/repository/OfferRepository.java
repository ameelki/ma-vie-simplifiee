package app.vie.repository;

import app.vie.entity.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByUserIdOrderByStoreAscProductAsc(Long userId);
    void deleteByUserIdAndStore(Long userId, String store);
}
