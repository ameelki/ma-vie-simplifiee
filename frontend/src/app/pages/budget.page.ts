import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { ToastService } from '../core/toast.service';
import { I18n, TPipe } from '../core/i18n.service';
import { Entry, User } from '../core/models';
import { fmtDate, money, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

const CATS = ['HOUSING', 'FOOD', 'TRANSPORT', 'LEISURE', 'HEALTH', 'OTHER'];
const COLORS: Record<string, string> = { HOUSING: '#173F38', FOOD: '#2E7D64', TRANSPORT: '#6FA58F', LEISURE: '#A7C4B4', HEALTH: '#C9B48A', OTHER: '#8E9A95' };

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.budget' | t }}</h1><p>{{ monthLabel() }}</p></div>
      @if (!data.canEdit('BUDGET')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('BUDGET')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    <div class="grid">
      <div class="card"><div class="stat"><div class="ico"><app-icon name="budget" /></div><div><div class="val amount in-c">{{ m(income()) }}</div><div class="lab">{{ 'budget.income' | t }}</div></div></div></div>
      <div class="card"><div class="stat"><div class="ico"><app-icon name="bills" /></div><div><div class="val amount out-c">{{ m(expense()) }}</div><div class="lab">{{ 'budget.expense' | t }}</div></div></div></div>
      <div class="card hero-card"><div class="stat"><div><div class="val" style="color:#fff">{{ m(income() - expense()) }}</div><div class="lab" style="color:var(--sage)">{{ 'budget.balance' | t }}</div></div></div></div>
    </div>

    @if (data.ownerId() === null) {
      <div class="card" style="margin-top:1rem">
        <h2>{{ 'budget.account' | t }}</h2>
        <div class="val" style="font-family:var(--serif);font-size:1.8rem;color:var(--forest)">{{ m(accountBalance()) }}</div>
        <p class="muted small">{{ 'budget.accountHint' | t }}</p>
        <form class="row" (ngSubmit)="saveOpening()" style="margin-top:.6rem">
          <label class="f grow">{{ 'budget.opening' | t }}
            <input name="opening" type="number" step="0.01" inputmode="decimal" [(ngModel)]="opening" placeholder="0.00"></label>
          <button class="btn" type="submit">{{ 'c.save' | t }}</button>
        </form>
      </div>
    }

    <div class="tabs" style="margin-top:1rem">
      <button class="tab" type="button" [class.on]="tab() === 'now'" (click)="tab.set('now')">{{ 'budget.tabNow' | t }}</button>
      <button class="tab" type="button" [class.on]="tab() === 'analysis'" (click)="tab.set('analysis')">{{ 'budget.tabAnalysis' | t }}</button>
    </div>
    @if (tab() === 'analysis') {
      <div class="card" style="margin-top:1rem">
        <h2>{{ 'budget.last6' | t }}</h2>
        <div class="row" style="align-items:flex-end;gap:.8rem;flex-wrap:nowrap;height:190px;margin-top:1rem">
          @for (b of history(); track b.key) {
            <div class="grow" style="display:grid;justify-items:center;gap:4px;min-width:0">
              <div style="display:flex;align-items:flex-end;gap:3px;height:150px">
                <div [style.height.px]="b.incH" style="width:14px;background:var(--green);border-radius:4px 4px 0 0" [title]="m(b.inc)"></div>
                <div [style.height.px]="b.expH" style="width:14px;background:var(--forest);border-radius:4px 4px 0 0" [title]="m(b.exp)"></div>
              </div>
              <span class="muted small">{{ b.label }}</span>
            </div>
          }
        </div>
        <div class="legend" style="margin-top:1rem"><div><i style="background:var(--green)"></i>{{ 'budget.income' | t }}</div><div><i style="background:var(--forest)"></i>{{ 'budget.expense' | t }}</div></div>
        <p class="muted" style="margin-top:.8rem">{{ 'budget.avgExpense' | t }} : <strong>{{ m(avgExpense()) }}</strong></p>
      </div>
    } @else {
    <div class="grid two" style="margin-top:1rem">
      <div class="card">
        <h2>{{ 'budget.by' | t }}</h2>
        @if (slices().length) {
          <div class="row" style="gap:1.2rem">
            <div class="donut" [style.background]="gradient()" role="img" [attr.aria-label]="'budget.by' | t"></div>
            <div class="legend">
              @for (s of slices(); track s.cat) {<div><i [style.background]="s.color"></i>{{ 'cat.' + s.cat | t }} — {{ m(s.value) }}</div>}
            </div>
          </div>
        } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
      </div>

      @if (data.canEdit('BUDGET')) {
      <form class="card" (ngSubmit)="add()">
        <h2>{{ 'budget.add' | t }}</h2>
        <div class="form">
          <label class="f">{{ 'c.category' | t }}
            <select name="kind" [(ngModel)]="kind"><option value="EXPENSE">{{ 'kind.EXPENSE' | t }}</option><option value="INCOME">{{ 'kind.INCOME' | t }}</option></select></label>
          @if (kind === 'EXPENSE') {
            <label class="f">{{ 'c.category' | t }}
              <select name="cat" [(ngModel)]="cat">@for (c of cats; track c) {<option [value]="c">{{ 'cat.' + c | t }}</option>}</select></label>
          }
          <label class="f wide">{{ 'c.title' | t }}<input name="title" [(ngModel)]="title" required></label>
          <label class="f">{{ 'c.amount' | t }}<input name="amount" type="number" step="0.01" min="0" inputmode="decimal" [(ngModel)]="amount" required></label>
          <label class="f">{{ 'c.date' | t }}<input name="date" type="date" [(ngModel)]="date" required></label>
          <button class="btn wide" type="submit" [disabled]="!title.trim() || amount === null">{{ 'c.add' | t }}</button>
        </div>
      </form>
      }
    </div>

    <div class="card" style="margin-top:1rem">
      <h2>{{ 'budget.list' | t }}</h2>
      @if (rows().length) {
        <ul class="list">
          @for (e of rows(); track e.id) {
            <li class="item">
              <div class="grow"><div class="t">{{ e.title }}</div><div class="s">{{ d(e.date) }} · {{ 'cat.' + (e.category || 'OTHER') | t }}</div></div>
              <div class="amount" [class.in-c]="e.kind === 'INCOME'" [class.out-c]="e.kind !== 'INCOME'">{{ e.kind === 'INCOME' ? '+' : '−' }}{{ m(e.amount) }}</div>
              @if (data.canEdit('BUDGET')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>}
            </li>
          }
        </ul>
      } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
    </div>
    }
    }
  `,
})
export class BudgetPage {
  data = inject(DataService);
  private i18n = inject(I18n);
  private api = inject(Api);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  opening: number | null = this.auth.user()?.openingBalance ?? null;
  cats = CATS;
  tab = signal<'now' | 'analysis'>('now');
  kind = 'EXPENSE'; cat = 'FOOD'; title = ''; amount: number | null = null; date = today();
  private month = today().substring(0, 7);

  all = computed(() => this.data.list('BUDGET'));
  rows = computed(() => this.all().filter((e) => (e.date || '').startsWith(this.month)).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  income = computed(() => this.rows().filter((e) => e.kind === 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0));
  expense = computed(() => this.rows().filter((e) => e.kind !== 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0));
  /** Solde du compte = solde de départ + tous les revenus - toutes les dépenses jusqu'à aujourd'hui. */
  accountBalance = computed(() => {
    const start = Number(this.auth.user()?.openingBalance ?? 0);
    const t = today();
    return start + this.all().filter((e) => !e.date || e.date <= t).reduce((s, e) => s + (e.kind === 'INCOME' ? 1 : -1) * Number(e.amount || 0), 0);
  });
  slices = computed(() => {
    const sums: Record<string, number> = {};
    for (const e of this.rows().filter((x) => x.kind !== 'INCOME')) { const c = e.category || 'OTHER'; sums[c] = (sums[c] || 0) + Number(e.amount || 0); }
    return Object.keys(sums).map((cat) => ({ cat, value: sums[cat], color: COLORS[cat] || COLORS['OTHER'] }));
  });
  gradient = computed(() => {
    const total = this.slices().reduce((s, x) => s + x.value, 0) || 1;
    let acc = 0;
    const parts = this.slices().map((s) => { const from = acc; acc += (s.value / total) * 100; return `${s.color} ${from}% ${acc}%`; });
    return 'conic-gradient(' + parts.join(',') + ')';
  });
  history = computed(() => {
    this.i18n.lang();
    const now = new Date();
    const out: { key: string; label: string; inc: number; exp: number; incH: number; expH: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const rows = this.all().filter((e) => (e.date || '').startsWith(key));
      const inc = rows.filter((e) => e.kind === 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0);
      const exp = rows.filter((e) => e.kind !== 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0);
      out.push({ key, label: d.toLocaleDateString(this.i18n.locale(), { month: 'short' }), inc, exp, incH: 0, expH: 0 });
    }
    const max = Math.max(1, ...out.map((o) => Math.max(o.inc, o.exp)));
    return out.map((o) => ({ ...o, incH: Math.max(2, Math.round((o.inc / max) * 150)), expH: Math.max(2, Math.round((o.exp / max) * 150)) }));
  });
  avgExpense = computed(() => { const h = this.history(); return h.reduce((s, x) => s + x.exp, 0) / (h.length || 1); });
  monthLabel = computed(() => { this.i18n.lang(); const [y, mo] = this.month.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString(this.i18n.locale(), { month: 'long', year: 'numeric' }); });

  m(v: number | null | undefined) { return money(this.i18n, v); }
  d(v: string | null | undefined) { return fmtDate(this.i18n, v); }

  saveOpening() {
    this.api.put<User>('/me/opening', { amount: this.opening === null || (this.opening as unknown) === '' ? null : Number(this.opening) }).subscribe({
      next: (u) => { this.auth.setUser(u); this.toast.show(this.i18n.t('fam.saved')); },
    });
  }

  add() {
    const payload: Partial<Entry> & { module: 'BUDGET'; title: string } = {
      module: 'BUDGET', title: this.title.trim(), amount: Number(this.amount), kind: this.kind,
      category: this.kind === 'INCOME' ? 'INCOME' : this.cat, date: this.date,
    };
    this.data.create(payload, () => { this.title = ''; this.amount = null; });
  }
}
