import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { addDays, fmtDate, money, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TPipe, IconComponent],
  template: `
    <div class="card hero-card" style="margin-bottom:1rem">
      <h1>{{ 'home.hello' | t: { name: first() } }}</h1>
      <p class="muted" style="margin:0">{{ 'home.sub' | t }}</p>
    </div>
    @if (data.entries().length === 0 && !data.loading()) {
      <div class="card" style="margin-bottom:1rem">
        <p>{{ 'home.demoHint' | t }}</p>
        <button class="btn" type="button" (click)="data.loadDemo()">{{ 'home.demo' | t }}</button>
      </div>
    }
    <div class="grid">
      <a class="card stat" routerLink="/budget" style="text-decoration:none;color:inherit"><div class="ico"><app-icon name="budget" /></div><div><div class="val">{{ m(balance()) }}</div><div class="lab">{{ 'home.balance' | t }}</div></div></a>
      <a class="card stat" routerLink="/factures" style="text-decoration:none;color:inherit"><div class="ico"><app-icon name="bills" /></div><div><div class="val">{{ bills().length }}</div><div class="lab">{{ 'home.bills' | t }}</div></div></a>
      <a class="card stat" routerLink="/agenda" style="text-decoration:none;color:inherit"><div class="ico"><app-icon name="agenda" /></div><div><div class="val">{{ upcoming().length }}</div><div class="lab">{{ 'home.appts' | t }}</div></div></a>
      <a class="card stat" routerLink="/taches" style="text-decoration:none;color:inherit"><div class="ico"><app-icon name="tasks" /></div><div><div class="val">{{ openTasks() }}</div><div class="lab">{{ 'home.tasks' | t }}</div></div></a>
      <a class="card stat" routerLink="/courses" style="text-decoration:none;color:inherit"><div class="ico"><app-icon name="shopping" /></div><div><div class="val">{{ toBuy() }}</div><div class="lab">{{ 'home.shopping' | t }}</div></div></a>
    </div>
    <div class="grid two" style="margin-top:1rem">
      <div class="card">
        <h2>{{ 'home.today' | t }}</h2>
        @if (todayRows().length) {
          <ul class="list">@for (e of todayRows(); track e.id) {<li class="item"><span class="pill">{{ e.time || '—' }}</span><div class="grow t">{{ e.title }}</div></li>}</ul>
        } @else {<div class="empty">{{ 'home.nothingToday' | t }}</div>}
      </div>
      <div class="card">
        <h2>{{ 'home.next' | t }}</h2>
        @if (next().length) {
          <ul class="list">@for (e of next(); track e.id) {<li class="item"><div class="grow"><div class="t">{{ e.title }}</div><div class="s">{{ d(e.date) }}</div></div>
            @if (e.module === 'BILLS') {<span class="amount">{{ m(e.amount) }}</span>}</li>}</ul>
        } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
      </div>
    </div>
  `,
})
export class HomePage implements OnInit {
  data = inject(DataService);
  private auth = inject(AuthService);
  private i18n = inject(I18n);

  ngOnInit() { if (this.data.ownerId() !== null) this.data.select(null); }

  first = computed(() => (this.auth.user()?.name || '').split(' ')[0]);
  private month = today().substring(0, 7);
  balance = computed(() => this.data.list('BUDGET').filter((e) => (e.date || '').startsWith(this.month)).reduce((s, e) => s + (e.kind === 'INCOME' ? 1 : -1) * Number(e.amount || 0), 0));
  bills = computed(() => this.data.list('BILLS').filter((e) => e.status !== 'PAID'));
  upcoming = computed(() => this.data.list('AGENDA').filter((e) => (e.date || '') >= today()));
  openTasks = computed(() => this.data.list('TASKS').filter((e) => e.status !== 'DONE').length);
  toBuy = computed(() => this.data.list('SHOPPING').filter((e) => e.kind !== 'MEAL' && !e.done).length);
  todayRows = computed(() => this.data.list('AGENDA').filter((e) => e.date === today()).sort((a, b) => (a.time || '').localeCompare(b.time || '')));
  next = computed(() => {
    const limit = addDays(today(), 14);
    return [...this.bills(), ...this.upcoming()].filter((e) => (e.date || '') >= today() && (e.date || '') <= limit).sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 6);
  });
  m(v: number) { return money(this.i18n, v); }
  d(v: string | null | undefined) { return fmtDate(this.i18n, v); }
}
