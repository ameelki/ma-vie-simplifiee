package app.vie.repository;

import app.vie.entity.AccessGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AccessGrantRepository extends JpaRepository<AccessGrant, Long> {
    List<AccessGrant> findByFamilyId(Long familyId);
    List<AccessGrant> findByFamilyIdAndOwnerIdAndGranteeId(Long familyId, Long ownerId, Long granteeId);
    List<AccessGrant> findByFamilyIdAndGranteeId(Long familyId, Long granteeId);
    void deleteByFamilyId(Long familyId);
    void deleteByFamilyIdAndOwnerId(Long familyId, Long ownerId);
    void deleteByFamilyIdAndGranteeId(Long familyId, Long granteeId);
    void deleteByFamilyIdAndOwnerIdAndGranteeId(Long familyId, Long ownerId, Long granteeId);
}
