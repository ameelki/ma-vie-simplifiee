package app.vie.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
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
    /** Dernière activité (mise à jour au plus toutes les 5 minutes). */
    public LocalDateTime lastSeenAt;
    /** Solde de départ du compte, saisi par l'utilisateur dans Budget. */
    @Column(precision = 12, scale = 2)
    public BigDecimal openingBalance;
    /** Revenu mensuel net saisi dans Budget. */
    @Column(precision = 12, scale = 2)
    public BigDecimal monthlyIncome;
    /** Charges fixes mensuelles (loyer, assurances…) : tableau JSON [{label, amount}]. */
    @Column(length = 4000)
    public String fixedCharges;
}
