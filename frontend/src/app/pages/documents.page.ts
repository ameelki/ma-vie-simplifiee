import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { addDays, fmtDate, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.documents' | t }}</h1><p>{{ 'docs.hint' | t }}</p></div>
      @if (!data.canEdit('DOCUMENTS')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('DOCUMENTS')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    @if (data.canEdit('DOCUMENTS')) {
    <form class="card" (ngSubmit)="add()" style="margin-bottom:1rem">
      <h2>{{ 'docs.add' | t }}</h2>
      <div class="form">
        <label class="f wide">{{ 'c.title' | t }}<input name="title" [(ngModel)]="title" required></label>
        <label class="f">{{ 'c.category' | t }}
          <select name="cat" [(ngModel)]="cat"><option value="ADMIN">{{ 'docs.ADMIN' | t }}</option><option value="FINANCE">{{ 'docs.FINANCE' | t }}</option></select></label>
        <label class="f">{{ 'docs.valid' | t }}<input name="date" type="date" [(ngModel)]="date"></label>
        <label class="f wide">{{ 'c.note' | t }}<input name="note" [(ngModel)]="note"></label>
        <button class="btn wide" type="submit" [disabled]="!title.trim()">{{ 'c.add' | t }}</button>
      </div>
    </form>
    }
    <div class="tabs" style="margin-bottom:1rem">
      <button class="tab" type="button" [class.on]="tab() === ''" (click)="tab.set('')">{{ 'c.all' | t }}</button>
      <button class="tab" type="button" [class.on]="tab() === 'ADMIN'" (click)="tab.set('ADMIN')">{{ 'docs.ADMIN' | t }}</button>
      <button class="tab" type="button" [class.on]="tab() === 'FINANCE'" (click)="tab.set('FINANCE')">{{ 'docs.FINANCE' | t }}</button>
    </div>
    <div class="card">
      @if (rows().length) {
        <ul class="list">
          @for (e of rows(); track e.id) {
            <li class="item">
              <div class="stat" style="flex:1;min-width:0"><div class="ico"><app-icon name="documents" /></div>
                <div class="grow"><div class="t">{{ e.title }}</div>
                  <div class="s">{{ 'docs.' + (e.category || 'ADMIN') | t }}@if (e.date) { · {{ 'docs.valid' | t }} {{ d(e.date) }}}@if (e.note) { · {{ e.note }}}</div></div></div>
              @if (state(e.date) === 'bad') {<span class="pill bad">{{ 'docs.expired' | t }}</span>}
              @if (state(e.date) === 'warn') {<span class="pill warn">{{ 'docs.soon' | t }}</span>}
              @if (data.canEdit('DOCUMENTS')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>}
            </li>
          }
        </ul>
      } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
    </div>
    }
  `,
})
export class DocumentsPage {
  data = inject(DataService);
  private i18n = inject(I18n);
  tab = signal('');
  title = ''; cat = 'ADMIN'; date = ''; note = '';
  rows = computed(() => this.data.list('DOCUMENTS').filter((e) => !this.tab() || e.category === this.tab()));
  d(v: string | null | undefined) { return fmtDate(this.i18n, v); }
  state(v: string | null | undefined): '' | 'bad' | 'warn' {
    if (!v) return '';
    if (v < today()) return 'bad';
    return v <= addDays(today(), 60) ? 'warn' : '';
  }
  add() {
    this.data.create({ module: 'DOCUMENTS', title: this.title.trim(), category: this.cat, date: this.date || null, note: this.note.trim() || null }, () => { this.title = ''; this.date = ''; this.note = ''; });
  }
}
