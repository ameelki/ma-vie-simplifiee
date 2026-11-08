package app.vie.repository;

import app.vie.entity.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
    Optional<FamilyMember> findByUserId(Long userId);
    List<FamilyMember> findByFamilyIdOrderByIdAsc(Long familyId);
    long countByFamilyId(Long familyId);
}
