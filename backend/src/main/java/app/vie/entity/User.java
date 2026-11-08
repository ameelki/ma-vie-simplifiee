package app.vie.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_users")
public class User extends BaseEntity {
    public String name;
    @Column(unique = true, nullable = false)
    public String email;
    @JsonIgnore
    public String passwordHash;
    public String phone;
    /** Langue d'interface : fr, de, en ou pt. */
    public String lang = "fr";
    @Enumerated(EnumType.STRING)
    public Enums.Role role = Enums.Role.USER;
    public boolean active = true;
    public LocalDateTime createdAt = LocalDateTime.now();
}
