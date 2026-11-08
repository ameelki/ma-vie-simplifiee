import { Component, inject, OnInit, signal } from '@angular/core';
import { Api } from '../core/api.service';
import { I18n, TPipe } from '../core/i18n.service';
import { AdminOverview } from '../core/models';
import { fmtDate } from '../core/util';

/** Espace administrateur : qui utilise l'application et quand (réservé aux e-mails de APP_ADMINS). */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="page-head"><div><h1>{{ 'adm.title' | t }}</h1></div>
      <button class="btn ghost" type="button" (click)="load()">{{ 'adm.refresh' | t }}</button></div>
    @if (error()) {<div class="card err">{{ 'err.ERR_FORBIDDEN' | t }}</div>}
    @else if (data(); as o) {
      <div class="grid">
        <div class="card stat"><div><div class="val">{{ o.total }}</div><div class="lab">{{ 'adm.total' | t }}</div></div></div>
        <div class="card stat"><div><div class="val" style="color:var(--green)">{{ o.online }}</div><div class="lab">{{ 'adm.online' | t }}</div></div></div>
        <div class="card stat"><div><div class="val">{{ o.day }}</div><div class="lab">{{ 'adm.day' | t }}</div></div></div>
        <div class="card stat"><div><div class="val">{{ o.week }}</div><div class="lab">{{ 'adm.week' | t }}</div></div></div>
      </div>
      <div class="card" style="margin-top:1rem">
        <ul class="list">
          @for (u of o.users; track u.id) {
            <li class="item">
              <div class="avatar">{{ initial(u.name) }}</div>
              <div class="grow"><div class="t">{{ u.name }} @if (u.online) {<span class="pill ok">●</span>}</div>
                <div class="s">{{ u.email }} · {{ u.lang.toUpperCase() }}</div>
                <div class="s">{{ 'adm.created' | t }} {{ d(u.createdAt) }}</div></div>
              <div class="s" style="text-align:right">{{ 'adm.lastSeen' | t }}<br><strong>{{ u.lastSeenAt ? dt(u.lastSeenAt) : ('adm.never' | t) }}</strong></div>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class AdminPage implements OnInit {
  private api = inject(Api);
  private i18n = inject(I18n);
  data = signal<AdminOverview | null>(null);
  error = signal(false);

  ngOnInit() { this.load(); }
  load() {
    this.error.set(false);
    this.api.get<AdminOverview>('/admin/users').subscribe({ next: (o) => this.data.set(o), error: () => this.error.set(true) });
  }
  initial(n: string) { return (n || '?').trim().charAt(0).toUpperCase(); }
  d(v: string) { return fmtDate(this.i18n, v.substring(0, 10)); }
  dt(v: string) {
    const x = new Date(v);
    return x.toLocaleString(this.i18n.locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
