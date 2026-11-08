package app.vie.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Rappel généré à partir des menus (facture à payer, rendez-vous, tâche, document qui expire). Le texte est composé par l'interface, dans la langue de l'utilisateur. */
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {
    public Long userId;
    @Enumerated(EnumType.STRING)
    public Enums.NotifKind kind;
    @Column(length = 200)
    public String title;
    public LocalDate dueDate;
    @Column(precision = 12, scale = 2)
    public BigDecimal amount;
    public Long refEntryId;
    public Boolean readFlag = Boolean.FALSE;
    public LocalDateTime createdAt = LocalDateTime.now();
}
