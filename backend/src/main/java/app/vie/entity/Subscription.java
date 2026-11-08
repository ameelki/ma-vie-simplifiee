package app.vie.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/** Abonnement d'un utilisateur : gratuit, ou Premium mensuel / annuel, avec essai gratuit de 7 jours. */
@Entity
@Table(name = "subscriptions")
public class Subscription extends BaseEntity {
    @Column(unique = true)
    public Long userId;
    @Enumerated(EnumType.STRING)
    public Enums.Plan plan = Enums.Plan.FREE;
    /** Fin de l'essai gratuit (null = essai jamais démarré). */
    public LocalDate trialEndsAt;
    public LocalDate startedAt;
}
