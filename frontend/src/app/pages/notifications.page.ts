import { Component, OnInit, inject, signal } from '@angular/core';
import { Api } from '../core/api.service';
import { I18n, TPipe } from '../core/i18n.service';
import { Notif } from '../core/models';
import { fmtDate } from '../core/util';
import { IconComponent } from '../shared/icon.component';

const ICON: Record<string, string> = { BILL: 'bills', EVENT: 'agenda', TASK: 'tasks', DOCUMENT: 'documents' };

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'notif.title' | t }}</h1></div>
      @if (hasUnread()) {<button class="btn ghost small" type="button" (click)="readAll()">{{ 'notif.readAll' | t }}</button>}</div>
    <div class="card">
      @if (list().length) {
        <ul class="list">
          @for (n of list(); track n.id) {
            <li class="item" [style.opacity]="n.readFlag ? .55 : 1">
              <div class="ico" style="width:40px;height:40px;border-radius:12px;background:var(--sand);color:var(--forest);display:grid;place-items:center;flex:none"><app-icon [name]="icon(n)" /></div>
              <div class="grow t">{{ text(n) }}</div>
              @if (!n.readFlag) {<button class="btn ghost small" type="button" (click)="read(n)">OK</button>}
            </li>
          }
        </ul>
      } @else {<div class="empty">{{ 'notif.none' | t }}</div>}
    </div>
  `,
})
export class NotificationsPage implements OnInit {
  private api = inject(Api);
  private i18n = inject(I18n);
  list = signal<Notif[]>([]);
  ngOnInit() { this.load(); }
  load() { this.api.get<Notif[]>('/notifications').subscribe({ next: (l) => this.list.set(l) }); }
  hasUnread() { return this.list().some((n) => !n.readFlag); }
  icon(n: Notif) { return ICON[n.kind] || 'assistant'; }
  text(n: Notif) { return this.i18n.t('notif.' + n.kind, { t: n.title, d: fmtDate(this.i18n, n.dueDate) }); }
  read(n: Notif) { this.api.put<void>('/notifications/' + n.id + '/read').subscribe({ next: () => this.list.set(this.list().map((x) => (x.id === n.id ? { ...x, readFlag: true } : x))) }); }
  readAll() { this.api.put<void>('/notifications/read-all').subscribe({ next: () => this.list.set(this.list().map((x) => ({ ...x, readFlag: true }))) }); }
}
