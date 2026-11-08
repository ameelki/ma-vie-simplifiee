import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { Api } from '../core/api.service';

const cache = new Map<number, string>();

/** Photo d'un produit en promo (découpée dans le prospectus). Chargée avec le jeton de connexion, puis gardée en mémoire. */
@Component({
  selector: 'app-offer-photo',
  standalone: true,
  template: `@if (src()) {<img [src]="src()" alt="" loading="lazy" [style.width.px]="size" [style.height.px]="size" style="object-fit:cover;border-radius:10px;background:#f3ede0;display:block">}`,
})
export class OfferPhotoComponent implements OnChanges {
  private api = inject(Api);
  @Input({ required: true }) id!: number;
  @Input() size = 64;
  src = signal('');

  ngOnChanges() {
    const c = cache.get(this.id);
    if (c) { this.src.set(c); return; }
    this.api.blob(`/offers/${this.id}/photo`).subscribe({
      next: (b) => { const u = URL.createObjectURL(b); cache.set(this.id, u); this.src.set(u); },
      error: () => this.src.set(''),
    });
  }
}
