package app.vie.repository;

import app.vie.entity.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findAllByOrderByStoreAscProductAsc();
    List<Offer> findByStore(String store);
    List<Offer> findByStoreIgnoreCaseAndProductIgnoreCase(String store, String product);
    void deleteByStore(String store);
}
