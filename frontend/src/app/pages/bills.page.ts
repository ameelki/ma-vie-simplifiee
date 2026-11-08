import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { Api } from '../core/api.service';
import { compressImage, errCode, fmtDate, money, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

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
        <label class="f wide">{{ 'bills.note' | t }}<input name="note" [(ngModel)]="note"></label>
        <button class="btn" type="submit" [disabled]="!title.trim() || amount === null">{{ 'c.add' | t }}</button>
      </div>
    </form>
    }
    <div class="tabs" style="margin-bottom:1rem">
      <button class="tab" type="button" [class.on]="tab() === 'PENDING'" (click)="tab.set('PENDING')">{{ 'bills.upcoming' | t }}</button>
      <button class="tab" type="button" [class.on]="tab() === 'PAID'" (click)="tab.set('PAID')">{{ 'bills.paid' | t }}</button>
    </div>
    <div class="card">
      @if (rows().length) {
        <ul class="list">
          @for (e of rows(); track e.id) {
            <li class="item">
              <div class="grow"><div class="t">{{ e.title }}</div>
                <div class="s">{{ 'bills.due' | t }} {{ d(e.date) }} @if (late(e)) {<span class="pill bad">{{ 'bills.late' | t }}</span>}</div></div>
              <div class="amount">{{ m(e.amount) }}</div>
              @if (data.canEdit('BILLS')) {
                @if (e.status !== 'PAID') {<button class="btn small" type="button" (click)="data.update(e, { status: 'PAID' })">{{ 'bills.markPaid' | t }}</button>}
                <button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>
              }
            </li>
          }
        </ul>
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
  rows = computed(() => this.all().filter((e) => (e.status === 'PAID') === (this.tab() === 'PAID')).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
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
      this.api.upload<{ title?: string | null; amount?: number | null; dueDate?: string | null; note?: string | null }>('/ai/bill', blob, name).subscribe({
        next: (r) => {
          if (r.title) this.title = r.title;
          if (r.amount !== null && r.amount !== undefined) this.amount = r.amount;
          if (r.dueDate) this.date = r.dueDate;
          if (r.note) this.note = r.note;
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
    this.data.create({ module: 'BILLS', title: this.title.trim(), amount: Number(this.amount), date: this.date, note: this.note.trim() || null, status: 'PENDING' }, () => { this.title = ''; this.amount = null; this.note = ''; this.aiDone.set(false); });
  }
}
