import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { Api } from '../core/api.service';
import { compressImage, errCode, fmtDate, money, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

const BILL_CATS = ['HOUSING', 'ENERGY', 'WATER', 'INTERNET', 'PHONE', 'INSURANCE', 'HEALTH', 'TAXES', 'OTHER'];

function readSize(): number {
  try { const n = Number(localStorage.getItem('vie_bills_size')); return [5, 10, 20, 50].includes(n) ? n : 10; } catch { return 10; }
}

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.bills' | t }}</h1><p>{{ 'bills.toPay' | t }} : <strong>{{ m(left()) }}</strong></p></div>
      @if (!data.canEdit('BILLS')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('BILLS')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    @if (data.canEdit('BILLS')) {
    <form class="card" (ngSubmit)="add()" style="margin-bottom:1rem">
      <h2>{{ 'bills.add' | t }}</h2>
      <div class="row" style="margin-bottom:.8rem">
        <input #file type="file" accept="application/pdf,image/*" hidden (change)="onFile($any($event.target))">
        <button class="btn ghost" type="button" [disabled]="analysing()" (click)="file.click()">{{ 'bills.import' | t }}</button>
        @if (analysing()) {<span class="muted small" role="status">{{ 'bills.analysing' | t }}</span>}
      </div>
      @if (aiDone()) {<div class="banner" style="margin-bottom:.8rem" role="status">{{ 'bills.aiDone' | t }}</div>}
      @if (aiError()) {<div class="err" role="alert" style="margin-bottom:.8rem">{{ 'err.' + aiError() | t }}</div>}
      <div class="form">
        <label class="f wide">{{ 'c.title' | t }}<input name="title" [(ngModel)]="title" required></label>
        <label class="f">{{ 'c.amount' | t }}<input name="amount" type="number" step="0.01" min="0" inputmode="decimal" [(ngModel)]="amount" required></label>
        <label class="f">{{ 'bills.due' | t }}<input name="date" type="date" [(ngModel)]="date" required></label>
        <label class="f">{{ 'c.category' | t }}
          <select name="category" [(ngModel)]="category">@for (c of cats; track c) {<option [value]="c">{{ 'bcat.' + c | t }}</option>}</select></label>
        <label class="f wide">{{ 'bills.note' | t }}<input name="note" [(ngModel)]="note"></label>
        <button class="btn" type="submit" [disabled]="!title.trim() || amount === null">{{ 'c.add' | t }}</button>
      </div>
    </form>
    }
    <div class="tabs" style="margin-bottom:1rem">
      <button class="tab" type="button" [class.on]="tab() === 'PENDING'" (click)="setTab('PENDING')">{{ 'bills.upcoming' | t }}</button>
      <button class="tab" type="button" [class.on]="tab() === 'PAID'" (click)="setTab('PAID')">{{ 'bills.paid' | t }}</button>
    </div>
    <div class="tabs" style="margin-bottom:1rem">
      <button class="tab" type="button" [class.on]="cat() === ''" (click)="setCat('')">{{ 'c.all' | t }} ({{ inTab().length }})</button>
      @for (c of usedCats(); track c.key) {
        <button class="tab" type="button" [class.on]="cat() === c.key" (click)="setCat(c.key)">{{ 'bcat.' + c.key | t }} ({{ c.n }})</button>
      }
    </div>
    <div class="row spread" style="margin-bottom:.8rem">
      <label class="check row" style="gap:.4rem"><input class="check" type="checkbox" [checked]="grouped()" (change)="grouped.set(!grouped())"> {{ 'bills.group' | t }}</label>
      <label class="row small muted" style="gap:.4rem">{{ 'bills.perPage' | t }}
        <select class="in" style="width:auto;min-height:36px" [value]="size()" (change)="setSize($any($event.target).value)">
          @for (n of sizes; track n) {<option [value]="n" [selected]="n === size()">{{ n }}</option>}
        </select></label>
    </div>
    <div class="card">
      @if (rows().length) {
        <ul class="list">
          @for (e of pageRows(); track e.id; let i = $index) {
            @if (grouped() && (i === 0 || pageRows()[i - 1].category !== e.category)) {
              <li class="row spread" style="padding:.6rem 0 .2rem;border-bottom:2px solid var(--sage)">
                <strong style="font-family:var(--serif);color:var(--forest)">{{ 'bcat.' + catOf(e) | t }}</strong>
                <span class="muted small">{{ 'bills.count' | t: { n: countOf(catOf(e)) } }} · {{ m(totalOf(catOf(e))) }}</span>
              </li>
            }
            <li class="item">
              <div class="grow"><div class="t">{{ e.title }}</div>
                <div class="s">@if (!grouped()) {<span class="pill">{{ 'bcat.' + catOf(e) | t }}</span> }{{ 'bills.due' | t }} {{ d(e.date) }} @if (late(e)) {<span class="pill bad">{{ 'bills.late' | t }}</span>}@if (e.note) { · {{ e.note }}}</div></div>
              <div class="amount">{{ m(e.amount) }}</div>
              @if (data.canEdit('BILLS')) {
                @if (e.status !== 'PAID') {<button class="btn small" type="button" (click)="data.update(e, { status: 'PAID' })">{{ 'bills.markPaid' | t }}</button>}
                <button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>
              }
            </li>
          }
        </ul>
        @if (pages() > 1) {
          <div class="row spread" style="margin-top:.8rem">
            <button class="btn ghost small" type="button" [disabled]="page() === 0" (click)="page.set(page() - 1)">{{ 'page.prev' | t }}</button>
            <span class="muted small">{{ 'page.of' | t: { p: page() + 1, n: pages() } }}</span>
            <button class="btn ghost small" type="button" [disabled]="page() >= pages() - 1" (click)="page.set(page() + 1)">{{ 'page.next' | t }}</button>
          </div>
        }
      } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
    </div>
    }
  `,
})
export class BillsPage {
  data = inject(DataService);
  private i18n = inject(I18n);
  tab = signal<'PENDING' | 'PAID'>('PENDING');
  private api = inject(Api);
  title = ''; amount: number | null = null; date = today(); note = '';
  analysing = signal(false);
  aiDone = signal(false);
  aiError = signal('');

  all = computed(() => this.data.list('BILLS'));
  cats = BILL_CATS;
  sizes = [5, 10, 20, 50];
  category = 'OTHER';
  cat = signal('');
  grouped = signal(true);
  page = signal(0);
  size = signal(readSize());
  inTab = computed(() => this.all().filter((e) => (e.status === 'PAID') === (this.tab() === 'PAID')));
  usedCats = computed(() => {
    const n: Record<string, number> = {};
    for (const e of this.inTab()) n[this.catOf(e)] = (n[this.catOf(e)] || 0) + 1;
    return BILL_CATS.filter((k) => n[k]).map((k) => ({ key: k, n: n[k] }));
  });
  /** Factures de l'onglet, filtrées par catégorie ; triées par catégorie puis échéance si le classement est actif. */
  rows = computed(() => this.inTab()
    .filter((e) => !this.cat() || this.catOf(e) === this.cat())
    .sort((a, b) => (this.grouped() ? BILL_CATS.indexOf(this.catOf(a)) - BILL_CATS.indexOf(this.catOf(b)) : 0) || (a.date || '').localeCompare(b.date || '')));
  pages = computed(() => Math.max(1, Math.ceil(this.rows().length / this.size())));
  pageRows = computed(() => {
    const p = Math.min(this.page(), this.pages() - 1);
    return this.rows().slice(p * this.size(), (p + 1) * this.size());
  });
  catOf(e: { category?: string | null }): string { return e.category && BILL_CATS.includes(e.category) ? e.category : 'OTHER'; }
  countOf(c: string) { return this.rows().filter((e) => this.catOf(e) === c).length; }
  totalOf(c: string) { return this.rows().filter((e) => this.catOf(e) === c).reduce((s, e) => s + Number(e.amount || 0), 0); }
  setTab(t: 'PENDING' | 'PAID') { this.tab.set(t); this.cat.set(''); this.page.set(0); }
  setCat(c: string) { this.cat.set(c); this.page.set(0); }
  setSize(v: string) {
    const n = Number(v) || 10;
    this.size.set(n);
    this.page.set(0);
    try { localStorage.setItem('vie_bills_size', String(n)); } catch { /* ignore */ }
  }
  left = computed(() => this.all().filter((e) => e.status !== 'PAID').reduce((s, e) => s + Number(e.amount || 0), 0));

  m(v: number | null | undefined) { return money(this.i18n, v); }
  d(v: string | null | undefined) { return fmtDate(this.i18n, v); }
  late(e: { status?: string | null; date?: string | null }) { return e.status !== 'PAID' && !!e.date && e.date < today(); }

  async onFile(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    this.aiError.set('');
    this.aiDone.set(false);
    this.analysing.set(true);
    try {
      const blob: Blob = f.type.startsWith('image/') ? await compressImage(f) : f;
      const name = f.type.startsWith('image/') ? 'facture.jpg' : f.name;
      this.api.upload<{ title?: string | null; amount?: number | null; dueDate?: string | null; note?: string | null; category?: string | null }>('/ai/bill', blob, name).subscribe({
        next: (r) => {
          if (r.title) this.title = r.title;
          if (r.amount !== null && r.amount !== undefined) this.amount = r.amount;
          if (r.dueDate) this.date = r.dueDate;
          if (r.note) this.note = r.note;
          if (r.category && BILL_CATS.includes(r.category)) this.category = r.category;
          this.aiDone.set(true);
          this.analysing.set(false);
        },
        error: (e) => { this.aiError.set(errCode(e)); this.analysing.set(false); },
      });
    } catch {
      this.aiError.set('ERR_FILE_TYPE');
      this.analysing.set(false);
    }
  }

  add() {
    this.data.create({ module: 'BILLS', title: this.title.trim(), amount: Number(this.amount), date: this.date, note: this.note.trim() || null, category: this.category, status: 'PENDING' }, () => { this.title = ''; this.amount = null; this.note = ''; this.category = 'OTHER'; this.aiDone.set(false); });
  }
}
