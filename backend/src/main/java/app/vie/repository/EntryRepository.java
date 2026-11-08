package app.vie.repository;

import app.vie.entity.Entry;
import app.vie.entity.Enums;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EntryRepository extends JpaRepository<Entry, Long> {
    List<Entry> findByOwnerIdOrderByDateAscIdAsc(Long ownerId);
    List<Entry> findByOwnerIdAndModuleOrderByDateAscIdAsc(Long ownerId, Enums.Module module);
    long countByOwnerId(Long ownerId);
}
