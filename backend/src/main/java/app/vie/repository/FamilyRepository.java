package app.vie.repository;

import app.vie.entity.Family;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FamilyRepository extends JpaRepository<Family, Long> {
    Optional<Family> findByInviteCode(String inviteCode);
    boolean existsByInviteCode(String inviteCode);
}
