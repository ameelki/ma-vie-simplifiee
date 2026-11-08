package app.vie.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Élément générique d'un menu :
 * BUDGET (amount, kind INCOME/EXPENSE, category, date), BILLS (amount, date = échéance, status PENDING/PAID, category),
 * AGENDA (date, time), DOCUMENTS (category, date = validité), SHOPPING (kind LIST/MEAL, done, date = jour de repas),
 * TASKS (status TODO/DOING/DONE, date = échéance).
 */
@Entity
@Table(name = "entries")
public class Entry extends BaseEntity {
    public Long ownerId;
    @Enumerated(EnumType.STRING)
    public Enums.Module module;
    @Column(length = 200)
    public String title;
    @Column(length = 1000)
    public String note;
    @Column(precision = 12, scale = 2)
    public BigDecimal amount;
    public String kind;
    public String category;
    public LocalDate date;
    public String time;
    public String status;
    public Boolean done = Boolean.FALSE;
    public LocalDateTime createdAt = LocalDateTime.now();
}
