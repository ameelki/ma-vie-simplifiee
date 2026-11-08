import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { TPipe } from '../core/i18n.service';
import { IconComponent } from '../shared/icon.component';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'nav.shopping' | t }}</h1></div>
      <a class="btn ghost" routerLink="/prix">{{ 'px.open' | t }}</a>
      @if (!data.canEdit('SHOPPING')) {<span class="pill">{{ 'c.viewonly' | t }}</span>}</div>
    @if (!data.can('SHOPPING')) {<div class="card empty">{{ 'c.noAccess' | t }}</div>} @else {
    <div class="grid two">
      <div class="card">
        <h2>{{ 'shop.list' | t }}</h2>
        @if (data.canEdit('SHOPPING')) {
          <form class="row" (ngSubmit)="addItem()" style="margin-bottom:.6rem;flex-wrap:nowrap">
            <input class="in grow" name="item" [(ngModel)]="item" [placeholder]="'shop.item' | t">
            <button class="btn" type="submit" [disabled]="!item.trim()"><app-icon name="plus" [size]="18" /></button>
          </form>
        }
        @if (items().length) {
          <ul class="list">
            @for (e of items(); track e.id) {
              <li class="item">
                <input class="check" type="checkbox" [checked]="!!e.done" [disabled]="!data.canEdit('SHOPPING')" (change)="data.update(e, { done: !e.done })">
                <div class="grow t" [style.text-decoration]="e.done ? 'line-through' : 'none'" [style.opacity]="e.done ? .55 : 1">{{ e.title }}</div>
                @if (data.canEdit('SHOPPING')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="18" /></button>}
              </li>
            }
          </ul>
        } @else {<div class="empty">{{ 'c.empty' | t }}</div>}
      </div>

      <div class="card">
        <h2>{{ 'shop.meals' | t }}</h2>
        <ul class="list">
          @for (d of days; track d) {
            <li class="item" style="align-items:flex-start">
              <strong style="width:5.5rem;flex:none;color:var(--forest)">{{ 'day.' + d | t }}</strong>
              <div class="grow">
                @for (e of meals(d); track e.id) {
                  <div class="row" style="flex-wrap:nowrap"><span class="grow">{{ e.title }}</span>
                    @if (data.canEdit('SHOPPING')) {<button class="icon-btn" type="button" (click)="data.remove(e)" [attr.aria-label]="'c.delete' | t"><app-icon name="trash" [size]="16" /></button>}</div>
                } @empty {<span class="muted">—</span>}
                @if (data.canEdit('SHOPPING')) {
                  <form class="row" style="flex-wrap:nowrap;margin-top:.3rem" (ngSubmit)="addMeal(d)">
                    <input class="in grow" [name]="'m' + d" [(ngModel)]="mealText[d]" [placeholder]="'shop.addMeal' | t">
                    <button class="btn ghost small" type="submit" [disabled]="!(mealText[d] || '').trim()"><app-icon name="plus" [size]="16" /></button>
                  </form>
                }
              </div>
            </li>
          }
        </ul>
      </div>
    </div>
    }
  `,
})
export class ShoppingPage {
  data = inject(DataService);
  days = DAYS;
  item = '';
  mealText: Record<string, string> = {};
  items = computed(() => this.data.list('SHOPPING').filter((e) => e.kind !== 'MEAL').sort((a, b) => Number(!!a.done) - Number(!!b.done) || a.id - b.id));
  meals(day: string) { return this.data.list('SHOPPING').filter((e) => e.kind === 'MEAL' && e.category === day); }
  addItem() { this.data.create({ module: 'SHOPPING', title: this.item.trim(), kind: 'LIST', done: false }, () => (this.item = '')); }
  addMeal(day: string) { this.data.create({ module: 'SHOPPING', title: (this.mealText[day] || '').trim(), kind: 'MEAL', category: day }, () => (this.mealText[day] = '')); }
}
