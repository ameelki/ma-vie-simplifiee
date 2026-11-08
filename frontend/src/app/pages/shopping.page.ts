import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { DataService } from '../core/data.service';
import { OfferView } from '../core/models';
import { I18n, TPipe } from '../core/i18n.service';
import { fmtDate, matchOffers, money } from '../core/util';
import { IconComponent } from '../shared/icon.component';
import { OfferPhotoComponent } from '../shared/offer-photo.component';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, IconComponent, OfferPhotoComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.shopping' | t }}</h1></div>
      <a class="btn ghost" routerLink="/prix">{{ 'px.open' | t }}</a>
      @if (!data.canEdit('SHOPPING')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('SHOPPING')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    @if (offers().length) {
      <div class="promo-banner">
        <div class="promo-head"><strong>{{ 'px.promoTitle' | t }}</strong>
          <a routerLink="/prix">{{ 'px.promoAll' | t }}</a></div>
        <div class="promo-row">
          @for (p of promos(); track p.id) {
            <div class="promo-chip">
              @if (p.hasPhoto) {<app-offer-photo [id]="p.id" [size]="96" />}
              <span class="promo-price">{{ fmt(p.price) }}</span>
              <span class="promo-name">{{ p.product }}</span>
              <span class="muted small">{{ p.store }}@if (p.validUntil) { · {{ 'px.until' | t }} {{ d(p.validUntil) }}}</span>
              @if (data.canEdit('SHOPPING')) {<button class="btn ghost small" type="button" (click)="addPromo(p)">{{ 'px.promoAdd' | t }}</button>}
            </div>
          } @empty {<span class="muted small">{{ 'px.promoNone' | t }}</span>}
        </div>
      </div>
    } @else {
      <div class="promo-banner"><div class="promo-head"><strong>{{ 'px.promoTitle' | t }}</strong>
        <a routerLink="/prix">{{ 'px.promoAll' | t }}</a></div><span class="muted small">{{ 'px.promoNone' | t }}</span>
        @if (canPublish()) {<div class="row" style="margin-top:.5rem"><button class="btn small" type="button" (click)="demo()">{{ 'px.demo' | t }}</button></div>}</div>
    }
    <div class="grid two">
      <div class="card">
        <h2>{{ 'shop.list' | t }}</h2>
        @if (data.canEdit('SHOPPING')) {
          <form class="row" (ngSubmit)="addItem()" style="margin-bottom:.6rem;flex-wrap:nowrap">
            <input class="in grow" name="item" [(ngModel)]="item" [placeholder]="'shop.item' | t" autocomplete="off">
            <button class="btn" type="submit" [disabled]="!item.trim()"><app-icon name="plus" [size]="18" /></button>
          </form>
        }
        @if (suggest().length) {
          <div class="promo-suggest">
            <span class="small">{{ 'px.promoFor' | t }}</span>
            @for (p of suggest(); track p.id) {<span class="promo-chip small"><span class="promo-price">{{ fmt(p.price) }}</span> {{ p.product }} · {{ p.store }}</span>}
          </div>
        }
        @if (items().length) {
          <ul class="list">
            @for (e of items(); track e.id) {
              <li class="item">
                <input class="check" type="checkbox" [checked]="!!e.done" [disabled]="!data.canEdit('SHOPPING')" (change)="data.update(e, { done: !e.done })">
                <div class="grow t" [style.text-decoration]="e.done ? 'line-through' : 'none'" [style.opacity]="e.done ? .55 : 1">{{ e.title }}</div>
                @if (data.canEdit('SHOPPING')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>}
              </li>
            }
          </ul>
        } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
      </div>

      <div class="card">
        <h2>{{ 'shop.meals' | t }}</h2>
        <ul class="list">
          @for (d of days; track d) {
            <li class="item" style="align-items:flex-start">
              <strong style="width:5.5rem;flex:none;color:var(--forest)">{{ 'day.' + d | t }}</strong>
              <div class="grow">
                @for (e of meals(d); track e.id) {
                  <div class="row" style="flex-wrap:nowrap"><span class="grow">{{ e.title }}</span>
                    @if (data.canEdit('SHOPPING')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="16" /></button>}</div>
                } @empty {<span class="muted">—</span>}
                @if (data.canEdit('SHOPPING')) {
                  <form class="row" style="flex-wrap:nowrap;margin-top:.3rem" (ngSubmit)="addMeal(d)">
                    <input class="in grow" [name]="'m' + d" [(ngModel)]="mealText[d]" [placeholder]="'shop.addMeal' | t">
                    <button class="btn ghost small" type="submit" [disabled]="!(mealText[d] || '').trim()"><app-icon name="plus" [size]="16" /></button>
                  </form>
                }
              </div>
            </li>
          }
        </ul>
      </div>
    </div>
    }
  `,
})
export class ShoppingPage implements OnInit {
  data = inject(DataService);
  private api = inject(Api);
  private i18n = inject(I18n);
  offers = signal<OfferView[]>([]);
  canPublish = signal(false);
  ngOnInit() {
    this.api.get<OfferView[]>('/offers').subscribe({ next: (o) => this.offers.set(o), error: () => undefined });
    this.api.get<{ canPublish: boolean }>('/offers/can-publish').subscribe({ next: (r) => this.canPublish.set(r.canPublish), error: () => undefined });
  }
  demo() { this.api.post<OfferView[]>('/offers/demo').subscribe({ next: (o) => this.offers.set(o), error: () => undefined }); }
  fmt(v: number) { return money(this.i18n, v); }
  d(v: string) { return fmtDate(this.i18n, v); }
  /** Promos qui correspondent à ma liste d'abord, puis les moins chères. */
  promos = computed(() => {
    const titles = this.items().filter((e) => !e.done).map((e) => e.title);
    const hit = this.offers().filter((o) => titles.some((t) => matchOffers(t, [o]).length));
    const rest = [...this.offers()].filter((o) => !hit.includes(o)).sort((a, b) => a.price - b.price);
    return [...hit, ...rest].slice(0, 6);
  });
  /** Pendant la saisie d'un article : offres correspondantes. */
  suggest() { return this.item.trim().length >= 3 ? matchOffers(this.item, this.offers()).sort((a, b) => a.price - b.price).slice(0, 3) : []; }
  addPromo(p: OfferView) { this.data.create({ module: 'SHOPPING', title: p.product, kind: 'LIST', done: false }); }
  days = DAYS;
  item = '';
  mealText: Record<string, string> = {};
  items = computed(() => this.data.list('SHOPPING').filter((e) => e.kind !== 'MEAL').sort((a, b) => Number(!!a.done) - Number(!!b.done) || a.id - b.id));
  meals(day: string) { return this.data.list('SHOPPING').filter((e) => e.kind === 'MEAL' && e.category === day); }
  addItem() { this.data.create({ module: 'SHOPPING', title: this.item.trim(), kind: 'LIST', done: false }, () => (this.item = '')); }
  addMeal(day: string) { this.data.create({ module: 'SHOPPING', title: (this.mealText[day] || '').trim(), kind: 'MEAL', category: day }, () => (this.mealText[day] = '')); }
}
