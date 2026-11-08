package app.vie.repository;

import app.vie.entity.Enums;
import app.vie.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop50ByUserIdOrderByCreatedAtDescIdDesc(Long userId);
    boolean existsByUserIdAndRefEntryIdAndKind(Long userId, Long refEntryId, Enums.NotifKind kind);
    long countByUserIdAndReadFlagFalse(Long userId);
    List<Notification> findByUserIdAndReadFlagFalse(Long userId);
}
