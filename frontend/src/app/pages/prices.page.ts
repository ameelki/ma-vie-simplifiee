import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { OfferView } from '../core/models';
import { ToastService } from '../core/toast.service';
import { compressImage, errCode, fmtDate, money } from '../core/util';
import { IconComponent } from '../shared/icon.component';
import { OfferPhotoComponent } from '../shared/offer-photo.component';

const STORES = ['Cactus', 'Naturata', 'Delhaize', 'Lidl', 'Aldi'];

interface Line { product: string; price: number; unit?: string | null; photo?: string | null; keep: boolean; }
interface Hit { store: string; offer: OfferView; }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (w: string) => (w.length > 4 && /[sx]$/.test(w) ? w.slice(0, -1) : w);

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, IconComponent, OfferPhotoComponent],
  template: `
    @if (busy()) {
      <div class="block-screen" role="alertdialog" aria-modal="true" aria-live="assertive">
        <div class="block-box">
          <div class="spinner" aria-hidden="true"></div>
          <h2>{{ 'px.wait' | t }}</h2>
          <div class="block-count">{{ 'bills.elapsed' | t: { n: seconds() } }}</div>
          <p class="muted small">{{ 'bills.waitHint' | t }}</p>
        </div>
      </div>
    }
    <div class="page-head"><div><h1>{{ 'px.title' | t }}</h1><p class="muted">{{ 'px.sub' | t }}</p></div>
      <a class="btn ghost" routerLink="/courses">{{ 'nav.shopping' | t }}</a></div>

    <div class="card stack">
      <h2>{{ 'px.compare' | t }}</h2>
      @if (!listItems().length) {<div class="empty">{{ 'px.noList' | t }}</div>}
      @else if (!offers().length) {<div class="empty">{{ 'px.noOffers' | t }}</div>}
      @else {
        @if (best(); as b) {
          <div class="pill" style="align-self:flex-start">{{ 'px.best' | t: { store: b.store, n: b.count, total: fmt(b.total) } }}</div>
        }
        <div style="overflow-x:auto">
          <table class="tbl" style="width:100%;border-collapse:collapse">
            <thead><tr><th style="text-align:left">{{ 'shop.item' | t }}</th>
              @for (s of shown(); track s) {<th style="text-align:right">{{ s }}</th>}</tr></thead>
            <tbody>
              @for (r of rows(); track r.item) {
                <tr><td>{{ r.item }}</td>
                  @for (s of shown(); track s) {
                    <td style="text-align:right" [style.font-weight]="r.min !== null && r.cells[s] === r.min ? 700 : 400"
                        [style.color]="r.min !== null && r.cells[s] === r.min ? 'var(--green)' : 'inherit'">
                      {{ r.cells[s] !== undefined ? fmt(r.cells[s]) : '—' }}</td>
                  }
                </tr>
              }
            </tbody>
            <tfoot><tr><th style="text-align:left">{{ 'px.total' | t }}</th>
              @for (s of shown(); track s) {<th style="text-align:right">{{ fmt(totals()[s].total) }} <span class="muted small">({{ totals()[s].count }}/{{ listItems().length }})</span></th>}</tr></tfoot>
          </table>
        </div>
        @if (mixTotal() !== null) {<p>{{ 'px.mix' | t: { total: fmt(mixTotal()!) } }}</p>}
        <p class="muted small">{{ 'px.matchHint' | t }}</p>
      }
    </div>

    @if (canPublish() && aiEnabled) {
    <div class="card stack" style="margin-top:1rem">
      <h2>{{ 'px.import' | t }}</h2>
      <p class="muted small">{{ 'px.importHint' | t }}</p>
      <p class="muted small">{{ 'px.lu' | t }}</p>
      <div class="row">
        <label class="grow">{{ 'px.store' | t }}
          <select class="in" name="store" [(ngModel)]="store"><option value="">—</option>@for (s of storeList; track s) {<option [value]="s">{{ s }}</option>}</select></label>
      </div>
      <div class="row">
        <label class="btn ghost" style="cursor:pointer">
          <app-icon name="plus" [size]="18" /> {{ 'px.file' | t }}
          <input type="file" accept="application/pdf,image/*" hidden (change)="onFile($any($event.target))">
        </label>
        @if (fileName) {<span class="muted small">{{ fileName }}</span>}
      </div>
      <label>{{ 'px.paste' | t }}
        <textarea class="in" rows="4" name="pasted" [(ngModel)]="pasted" placeholder="Lait demi-écrémé 1 L - 0,99 €"></textarea></label>
      @if (error()) {<div class="err">{{ 'err.' + error() | t }}</div>}
      <button class="btn" type="button" [disabled]="!store || (!file && !pasted.trim())" (click)="read()">{{ 'px.read' | t }}</button>

      @if (lines().length) {
        <h3>{{ 'px.check' | t }}</h3>
        <label>{{ 'px.until' | t }} <input class="in" type="date" name="until" [(ngModel)]="until" style="width:auto"></label>
        <ul class="list">
          @for (l of lines(); track $index) {
            <li class="item">
              <input class="check" type="checkbox" [(ngModel)]="l.keep" [name]="'k' + $index">
              @if (l.photo) {<img [src]="'data:image/jpeg;base64,' + l.photo" alt="" width="56" height="56" style="object-fit:cover;border-radius:10px;flex:none">}
              <input class="in grow" [name]="'p' + $index" [(ngModel)]="l.product">
              <input class="in" type="number" step="0.01" min="0" style="width:6rem" [name]="'v' + $index" [(ngModel)]="l.price">
            </li>
          }
        </ul>
        <button class="btn" type="button" (click)="save()">{{ 'px.save' | t: { n: keptCount() } }}</button>
      }
      <button class="btn ghost" type="button" (click)="refresh()">{{ 'px.refresh' | t }}</button>
    </div>
    }

    @if (canPublish()) {
    <div class="card stack" style="margin-top:1rem">
      <h2>{{ 'px.manual' | t }}</h2>
      <div class="row">
        <label class="grow">{{ 'px.store' | t }}
          <select class="in" name="mstore" [(ngModel)]="mStore"><option value="">—</option>@for (s of storeList; track s) {<option [value]="s">{{ s }}</option>}</select></label>
        <label class="grow">{{ 'px.product' | t }} <input class="in" name="mproduct" [(ngModel)]="mProduct"></label>
      </div>
      <div class="row">
        <label>{{ 'px.price' | t }} <input class="in" type="number" step="0.01" min="0" name="mprice" [(ngModel)]="mPrice" style="width:7rem"></label>
        <label>{{ 'px.until' | t }} <input class="in" type="date" name="muntil" [(ngModel)]="mUntil" style="width:auto"></label>
        <label class="btn ghost" style="cursor:pointer">{{ 'px.photo' | t }}
          <input type="file" accept="image/*" hidden (change)="onPhoto($any($event.target))"></label>
        @if (mPhoto) {<img [src]="'data:image/jpeg;base64,' + mPhoto" alt="" width="48" height="48" style="object-fit:cover;border-radius:8px">}
      </div>
      <div class="row">
        <button class="btn" type="button" [disabled]="!mStore || !mProduct.trim() || !mPrice" (click)="addOne()">{{ 'px.add' | t }}</button>
        <button class="btn ghost" type="button" (click)="demo()">{{ 'px.demo' | t }}</button>
      </div>
    </div>
    }

    <div class="card stack" style="margin-top:1rem">
      <h2>{{ 'px.saved' | t }}</h2>
      @if (!offers().length) {<div class="empty">{{ 'px.promoNone' | t }}</div>}
      @for (s of storeNames(); track s) {
        <h3>{{ s }}</h3>
        <ul class="list">
          @for (o of byStore(s); track o.id) {
            <li class="item">@if (o.hasPhoto) {<app-offer-photo [id]="o.id" [size]="56" />}<div class="grow">{{ o.product }}@if (o.unit) { <span class="muted small">· {{ o.unit }}</span>}</div>
              <strong>{{ fmt(o.price) }}</strong>
              @if (o.validUntil) {<span class="muted small">{{ 'px.until' | t }} {{ d(o.validUntil) }}</span>}
              @if (canPublish()) {<button class="icon-btn" type="button" (click)="remove(o)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class PricesPage implements OnInit {
  private api = inject(Api);
  private i18n = inject(I18n);
  private toast = inject(ToastService);
  data = inject(DataService);
  storeList = STORES;
  offers = signal<OfferView[]>([]);
  lines = signal<Line[]>([]);
  /** Import de prospectus par l'IA : masqué pour l'instant (mettre true pour le réactiver). */
  aiEnabled = false;
  canPublish = signal(false);
  mStore = ''; mProduct = ''; mPrice: number | null = null; mUntil = ''; mPhoto = '';
  busy = signal(false);
  seconds = signal(0);
  error = signal('');
  store = ''; pasted = ''; until = ''; fileName = '';
  file: Blob | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  listItems = computed(() => {
    const seen = new Set<string>();
    return this.data.list('SHOPPING').filter((e) => e.kind !== 'MEAL' && !e.done).map((e) => e.title.trim()).filter((t) => { const k = norm(t); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  });
  stores = computed(() => [...new Set(this.offers().map((o) => o.store))].sort());
  storeNames = this.stores;
  /** Colonnes du tableau : seulement les magasins qui ont au moins un article de ma liste. */
  shown = computed(() => this.stores().filter((s) => this.rows().some((r) => r.cells[s] !== undefined)));
  keptCount = computed(() => this.lines().filter((l) => l.keep && l.product.trim() && l.price > 0).length);

  /** Pour chaque article de la liste, le prix le plus bas trouvé dans chaque magasin. */
  rows = computed(() => this.listItems().map((item) => {
    const cells: Record<string, number> = {};
    for (const h of this.matches(item)) if (cells[h.store] === undefined || h.offer.price < cells[h.store]) cells[h.store] = h.offer.price;
    const vals = Object.values(cells);
    return { item, cells, min: vals.length ? Math.min(...vals) : null };
  }));
  totals = computed(() => {
    const t: Record<string, { total: number; count: number }> = {};
    for (const s of this.stores()) t[s] = { total: 0, count: 0 };
    for (const r of this.rows()) for (const s of this.stores()) if (r.cells[s] !== undefined) { t[s].total += r.cells[s]; t[s].count++; }
    return t;
  });
  best = computed(() => {
    const list = this.stores().map((s) => ({ store: s, ...this.totals()[s] })).filter((x) => x.count > 0);
    list.sort((a, b) => b.count - a.count || a.total - b.total);
    return list[0] ?? null;
  });
  mixTotal = computed(() => {
    const m = this.rows().filter((r) => r.min !== null);
    return m.length ? m.reduce((s, r) => s + (r.min as number), 0) : null;
  });

  ngOnInit() {
    this.api.get<OfferView[]>('/offers').subscribe({ next: (o) => this.offers.set(o) });
    this.api.get<{ canPublish: boolean }>('/offers/can-publish').subscribe({ next: (r) => this.canPublish.set(r.canPublish), error: () => undefined });
  }

  fmt(v: number) { return money(this.i18n, v); }
  d(v: string) { return fmtDate(this.i18n, v); }
  byStore(s: string) { return this.offers().filter((o) => o.store === s); }

  private matches(item: string): Hit[] {
    const words = norm(item).split(' ').filter((w) => w.length >= 3).map(stem);
    if (!words.length) return [];
    return this.offers().filter((o) => {
      const p = ' ' + norm(o.product) + ' ';
      return words.every((w) => p.includes(w));
    }).map((o) => ({ store: o.store, offer: o }));
  }

  async onFile(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    this.file = f.type.startsWith('image/') ? await compressImage(f) : f;
    this.fileName = f.name;
  }

  read() {
    this.error.set('');
    this.lines.set([]);
    const form = new FormData();
    if (this.file) form.append('file', this.file, this.fileName.endsWith('.pdf') ? this.fileName : 'prospectus.jpg');
    else form.append('text', this.pasted);
    this.seconds.set(0);
    this.busy.set(true);
    this.timer = setInterval(() => this.seconds.set(this.seconds() + 1), 1000);
    this.api.postForm<{ validUntil: string | null; offers: { product: string; price: number; unit?: string | null; photo?: string | null }[] }>('/offers/import', form).subscribe({
      next: (r) => {
        this.stop();
        this.until = r.validUntil ?? '';
        this.lines.set(r.offers.map((o) => ({ ...o, keep: true })));
        if (!r.offers.length) this.error.set('ERR_AI_FAILED');
      },
      error: (e) => { this.stop(); this.error.set(errCode(e)); },
    });
  }

  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.busy.set(false);
  }

  save() {
    const offers = this.lines().filter((l) => l.keep && l.product.trim() && l.price > 0).map((l) => ({ product: l.product.trim(), price: Number(l.price), unit: l.unit ?? null, photo: l.photo ?? null }));
    this.api.post<OfferView[]>('/offers', { store: this.store.trim(), validUntil: this.until || null, offers }).subscribe({
      next: (o) => { this.offers.set(o); this.lines.set([]); this.file = null; this.fileName = ''; this.pasted = ''; this.toast.show(this.i18n.t('fam.saved')); },
      error: (e) => this.error.set(errCode(e)),
    });
  }

  async onPhoto(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const b = await compressImage(f, 220, 0.8);
    const buf = new Uint8Array(await b.arrayBuffer());
    let bin = '';
    buf.forEach((c) => (bin += String.fromCharCode(c)));
    this.mPhoto = btoa(bin);
  }

  addOne() {
    this.error.set('');
    this.api.post<OfferView[]>('/offers/one', { store: this.mStore, validUntil: this.mUntil || null, offers: [{ product: this.mProduct.trim(), price: Number(this.mPrice), unit: null, photo: this.mPhoto || null }] }).subscribe({
      next: (o) => { this.offers.set(o); this.mProduct = ''; this.mPrice = null; this.mPhoto = ''; this.toast.show(this.i18n.t('fam.saved')); },
      error: (e) => this.error.set(errCode(e)),
    });
  }

  demo() {
    this.api.post<OfferView[]>('/offers/demo').subscribe({ next: (o) => this.offers.set(o), error: (e) => this.error.set(errCode(e)) });
  }

  refresh() {
    this.api.post<{ stores: number }>('/offers/refresh').subscribe({
      next: (r) => { this.toast.show(this.i18n.t('px.refreshed', { n: r.stores })); this.ngOnInit(); },
      error: (e) => this.error.set(errCode(e)),
    });
  }

  remove(o: OfferView) {
    this.api.del<void>('/offers/' + o.id).subscribe({ next: () => this.offers.set(this.offers().filter((x) => x.id !== o.id)) });
  }
}
