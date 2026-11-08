package app.vie.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "family_members")
public class FamilyMember extends BaseEntity {
    @ManyToOne(optional = false)
    public Family family;
    @ManyToOne(optional = false)
    public User user;
    @Enumerated(EnumType.STRING)
    public Enums.FamilyRole role = Enums.FamilyRole.MEMBER;
    /** Menus que ce membre accepte de partager avec la famille, séparés par des virgules (ex : BUDGET,BILLS). */
    @Column(length = 200)
    public String offered = "";
}
