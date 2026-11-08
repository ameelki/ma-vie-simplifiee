import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { fmtDate } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.tasks' | t }}</h1></div>
      @if (!data.canEdit('TASKS')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('TASKS')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    @if (data.canEdit('TASKS')) {
    <form class="card" (ngSubmit)="add()" style="margin-bottom:1rem">
      <h2>{{ 'task.add' | t }}</h2>
      <div class="form">
        <label class="f wide">{{ 'c.title' | t }}<input name="title" [(ngModel)]="title" required></label>
        <label class="f">{{ 'c.date' | t }}<input name="date" type="date" [(ngModel)]="date"></label>
        <button class="btn" type="submit" [disabled]="!title.trim()">{{ 'c.add' | t }}</button>
      </div>
    </form>
    }
    <div class="tabs" style="margin-bottom:1rem">
      @for (s of states; track s) {<button class="tab" type="button" [class.on]="tab() === s" (click)="tab.set(s)">{{ 'task.' + s | t }} ({{ count(s) }})</button>}
    </div>
    <div class="card">
      @if (rows().length) {
        <ul class="list">
          @for (e of rows(); track e.id) {
            <li class="item">
              <div class="grow"><div class="t">{{ e.title }}</div>@if (e.date) {<div class="s">{{ d(e.date) }}</div>}</div>
              @if (data.canEdit('TASKS')) {
                @if (e.status === 'TODO') {<button class="btn ghost small" type="button" (click)="data.update(e, { status: 'DOING' })">{{ 'task.start' | t }}</button>}
                @if (e.status !== 'DONE') {<button class="btn small" type="button" (click)="data.update(e, { status: 'DONE', done: true })">{{ 'task.finish' | t }}</button>}
                @if (e.status === 'DONE') {<button class="btn ghost small" type="button" (click)="data.update(e, { status: 'TODO', done: false })">{{ 'task.reopen' | t }}</button>}
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
export class TasksPage {
  data = inject(DataService);
  private i18n = inject(I18n);
  states = ['TODO', 'DOING', 'DONE'];
  tab = signal('TODO');
  title = ''; date = '';
  rows = computed(() => this.data.list('TASKS').filter((e) => (e.status || 'TODO') === this.tab()));
  count(s: string) { return this.data.list('TASKS').filter((e) => (e.status || 'TODO') === s).length; }
  d(v: string | null | undefined) { return fmtDate(this.i18n, v); }
  add() { this.data.create({ module: 'TASKS', title: this.title.trim(), status: 'TODO', done: false, date: this.date || null }, () => { this.title = ''; this.date = ''; }); }
}
