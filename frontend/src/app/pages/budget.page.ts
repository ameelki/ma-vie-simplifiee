import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { Entry } from '../core/models';
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
  `,
})
export class BudgetPage {
  data = inject(DataService);
  private i18n = inject(I18n);
  cats = CATS;
  kind = 'EXPENSE'; cat = 'FOOD'; title = ''; amount: number | null = null; date = today();
  private month = today().substring(0, 7);

  all = computed(() => this.data.list('BUDGET'));
  rows = computed(() => this.all().filter((e) => (e.date || '').startsWith(this.month)).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  income = computed(() => this.rows().filter((e) => e.kind === 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0));
  expense = computed(() => this.rows().filter((e) => e.kind !== 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0));
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
  monthLabel = computed(() => { this.i18n.lang(); const [y, mo] = this.month.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString(this.i18n.locale(), { month: 'long', year: 'numeric' }); });

  m(v: number | null | undefined) { return money(this.i18n, v); }
  d(v: string | null | undefined) { return fmtDate(this.i18n, v); }

  add() {
    const payload: Partial<Entry> & { module: 'BUDGET'; title: string } = {
      module: 'BUDGET', title: this.title.trim(), amount: Number(this.amount), kind: this.kind,
      category: this.kind === 'INCOME' ? 'INCOME' : this.cat, date: this.date,
    };
    this.data.create(payload, () => { this.title = ''; this.amount = null; });
  }
}
