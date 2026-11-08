import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { fmtDate, iso, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.agenda' | t }}</h1></div>
      @if (!data.canEdit('AGENDA')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('AGENDA')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    <div class="grid two">
      <div class="card">
        <div class="row spread" style="margin-bottom:.6rem">
          <button class="icon-btn" type="button" (click)="shift(-1)" [attr.aria-label]="'agenda.prev' | t"><app-icon name="chevL" /></button>
          <h2 style="margin:0;text-transform:capitalize">{{ monthLabel() }}</h2>
          <button class="icon-btn" type="button" (click)="shift(1)" [attr.aria-label]="'agenda.next' | t"><app-icon name="chevR" /></button>
        </div>
        <div class="cal">
          @for (w of dows(); track $index) {<div class="dow">{{ w }}</div>}
          @for (c of cells(); track $index) {
            @if (c.day) {
              <button type="button" [class.today]="c.iso === todayIso" [class.sel]="c.iso === sel()" [class.dot]="c.has" (click)="pick(c.iso)">{{ c.day }}</button>
            } @else {<span class="blank"></span>}
          }
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <h2 style="text-transform:capitalize">{{ dayLabel() }}</h2>
          @if (dayRows().length) {
            <ul class="list">
              @for (e of dayRows(); track e.id) {
                <li class="item">
                  <span class="pill">{{ e.time || '—' }}</span>
                  <div class="grow"><div class="t">{{ e.title }}</div>@if (e.note) {<div class="s">{{ e.note }}</div>}</div>
                  @if (data.canEdit('AGENDA')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>}
                </li>
              }
            </ul>
          } @else {<div class="empty">{{ 'agenda.none' | t }}</div>}
        </div>
        @if (data.canEdit('AGENDA')) {
        <form class="card" (ngSubmit)="add()">
          <h2>{{ 'agenda.add' | t }}</h2>
          <div class="form">
            <label class="f wide">{{ 'c.title' | t }}<input name="title" [(ngModel)]="title" required></label>
            <label class="f">{{ 'c.time' | t }}<input name="time" type="time" [(ngModel)]="time"></label>
            <label class="f wide">{{ 'c.note' | t }}<input name="note" [(ngModel)]="note"></label>
            <button class="btn wide" type="submit" [disabled]="!title.trim()">{{ 'c.add' | t }}</button>
          </div>
        </form>
        }
      </div>
    </div>
    }
  `,
})
export class AgendaPage {
  data = inject(DataService);
  private i18n = inject(I18n);
  todayIso = today();
  sel = signal(today());
  cursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  title = ''; time = ''; note = '';

  monthLabel = computed(() => { this.i18n.lang(); return this.cursor().toLocaleDateString(this.i18n.locale(), { month: 'long', year: 'numeric' }); });
  dows = computed(() => {
    this.i18n.lang();
    const base = new Date(2024, 0, 1); // lundi
    return Array.from({ length: 7 }, (_, i) => new Date(base.getFullYear(), 0, 1 + i).toLocaleDateString(this.i18n.locale(), { weekday: 'narrow' }));
  });
  datesWithEvents = computed(() => new Set(this.data.list('AGENDA').map((e) => e.date)));
  cells = computed(() => {
    const c = this.cursor();
    const first = new Date(c.getFullYear(), c.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
    const out: { day: number; iso: string; has: boolean }[] = [];
    for (let i = 0; i < lead; i++) out.push({ day: 0, iso: '', has: false });
    for (let d = 1; d <= days; d++) { const k = iso(new Date(c.getFullYear(), c.getMonth(), d)); out.push({ day: d, iso: k, has: this.datesWithEvents().has(k) }); }
    return out;
  });
  dayRows = computed(() => this.data.list('AGENDA').filter((e) => e.date === this.sel()).sort((a, b) => (a.time || '').localeCompare(b.time || '')));
  dayLabel = computed(() => fmtDate(this.i18n, this.sel(), { weekday: 'long', day: 'numeric', month: 'long' }));

  shift(n: number) { const c = this.cursor(); this.cursor.set(new Date(c.getFullYear(), c.getMonth() + n, 1)); }
  pick(k: string) { this.sel.set(k); }

  add() {
    this.data.create({ module: 'AGENDA', title: this.title.trim(), date: this.sel(), time: this.time || null, note: this.note.trim() || null }, () => { this.title = ''; this.time = ''; this.note = ''; });
  }
}
