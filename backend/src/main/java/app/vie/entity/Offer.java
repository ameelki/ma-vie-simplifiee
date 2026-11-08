package app.vie.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Prix ou offre relevé(e) dans un supermarché (prospectus lu par l'IA ou saisie manuelle). */
@Entity
@Table(name = "offers")
public class Offer extends BaseEntity {
    public Long userId;
    @Column(length = 60)
    public String store;
    @Column(length = 200)
    public String product;
    @Column(precision = 10, scale = 2)
    public BigDecimal price;
    @Column(length = 40)
    public String unit;
    public LocalDate validUntil;
    public Boolean hasPhoto = Boolean.FALSE;
}
