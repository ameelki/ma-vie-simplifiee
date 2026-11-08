package app.vie.entity;

import jakarta.persistence.*;

/** Photo du produit, découpée dans le prospectus (miniature JPEG). Table à part pour ne pas alourdir la liste des offres. */
@Entity
@Table(name = "offer_photos")
public class OfferPhoto extends BaseEntity {
    @Column(unique = true)
    public Long offerId;
    @Column(columnDefinition = "bytea")
    public byte[] data;
}
