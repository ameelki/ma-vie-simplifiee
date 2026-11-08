package app.vie.entity;

import jakarta.persistence.*;

/** L'admin de la famille autorise « granteeId » à ouvrir le menu « module » de « ownerId ». */
@Entity
@Table(name = "access_grants")
public class AccessGrant extends BaseEntity {
    @ManyToOne(optional = false)
    public Family family;
    public Long ownerId;
    public Long granteeId;
    @Enumerated(EnumType.STRING)
    public Enums.Module module;
    @Enumerated(EnumType.STRING)
    public Enums.Level level = Enums.Level.VIEW;
}
