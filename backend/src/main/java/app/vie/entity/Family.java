package app.vie.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "families")
public class Family extends BaseEntity {
    public String name;
    @Column(unique = true, nullable = false)
    public String inviteCode;
}
