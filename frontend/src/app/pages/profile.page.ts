import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18n, LANGS, TPipe } from '../core/i18n.service';
import { User } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errCode, initials } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'pr.title' | t }}</h1></div></div>
    <div class="grid two">
      <form class="card" (ngSubmit)="save()">
        <div class="row" style="margin-bottom:1rem"><div class="avatar">{{ ini() }}</div><div><div class="t">{{ auth.user()?.name }}</div><div class="s muted">{{ auth.user()?.email }}</div></div></div>
        <div class="form">
          <label class="f wide">{{ 'auth.name' | t }}<input name="name" [(ngModel)]="name" required></label>
          <label class="f wide">{{ 'auth.phone' | t }}<input name="phone" type="tel" [(ngModel)]="phone"></label>
          <label class="f wide">{{ 'auth.lang' | t }}
            <select name="lang" [(ngModel)]="lang" (ngModelChange)="i18n.set($event)">@for (l of langs; track l.code) {<option [value]="l.code">{{ l.label }}</option>}</select></label>
          @if (error()) {<div class="err wide">{{ 'err.' + error() | t }}</div>}
          <button class="btn wide" type="submit" [disabled]="!name.trim()">{{ 'c.save' | t }}</button>
        </div>
      </form>
      <form class="card" (ngSubmit)="saveSetup()">
        <h2>{{ 'setup.cardTitle' | t }}</h2>
        <div class="form">
          <label class="f wide">{{ 'bp.balance' | t }}<input name="balance" type="number" step="0.01" inputmode="decimal" [(ngModel)]="balance" placeholder="0.00"></label>
          <label class="f wide">{{ 'setup.salary' | t }}<input name="salary" type="number" step="0.01" min="0" inputmode="decimal" [(ngModel)]="salary" placeholder="0.00"></label>
          <button class="btn wide" type="submit">{{ 'c.save' | t }}</button>
        </div>
      </form>
      <div class="card stack">
        <a class="btn ghost" routerLink="/premium">{{ 'pr.subscription' | t }}</a>
        <a class="btn ghost" routerLink="/notifications">{{ 'pr.notifications' | t }}</a>
      </div>
      <form class="card" (ngSubmit)="changePw()">
        <h2>{{ 'pr.security' | t }}</h2>
        <div class="form">
          <label class="f wide">{{ 'pr.pwCurrent' | t }}<input name="pc" type="password" [(ngModel)]="pwCurrent" autocomplete="current-password" required></label>
          <label class="f wide">{{ 'pr.pwNew' | t }}<input name="pn" type="password" [(ngModel)]="pwNew" autocomplete="new-password" minlength="8" required>
            <span class="muted small" style="font-weight:400">{{ 'auth.passwordHint' | t }}</span></label>
          @if (pwError()) {<div class="err wide">{{ 'err.' + pwError() | t }}</div>}
          <button class="btn wide" type="submit" [disabled]="!pwCurrent || pwNew.length < 8">{{ 'pr.pwChange' | t }}</button>
        </div>
      </form>
      <div class="card stack">
        <h2>{{ 'pr.data' | t }}</h2>
        <button class="btn ghost" type="button" (click)="demo()">{{ 'pr.demo' | t }}</button>
        <button class="btn danger" type="button" (click)="auth.logout()"><app-icon name="logout" [size]="18" />{{ 'auth.logout' | t }}</button>
      </div>
    </div>
  `,
})
export class ProfilePage {
  auth = inject(AuthService);
  i18n = inject(I18n);
  private api = inject(Api);
  private data = inject(DataService);
  private toast = inject(ToastService);
  langs = LANGS;
  name = this.auth.user()?.name || '';
  phone = this.auth.user()?.phone || '';
  lang = this.i18n.lang() as string;
  error = signal('');
  pwCurrent = ''; pwNew = '';
  pwError = signal('');
  ini() { return initials(this.auth.user()?.name); }

  save() {
    this.error.set('');
    this.api.put<User>('/me', { name: this.name.trim(), phone: this.phone.trim() || null, lang: this.lang }).subscribe({
      next: (u) => { this.auth.setUser(u); this.toast.show(this.i18n.t('pr.saved')); },
      error: (e) => this.error.set(errCode(e)),
    });
  }

  changePw() {
    this.pwError.set('');
    this.api.put<void>('/me/password', { current: this.pwCurrent, password: this.pwNew }).subscribe({
      next: () => { this.pwCurrent = ''; this.pwNew = ''; this.toast.show(this.i18n.t('pr.pwChanged')); },
      error: (e) => this.pwError.set(errCode(e)),
    });
  }

  balance: number | null = this.auth.user()?.openingBalance ?? null;
  salary: number | null = this.auth.user()?.monthlyIncome ?? null;
  private num(v: unknown): number | null { return v === null || v === undefined || (v as string) === '' ? null : Number(v); }
  saveSetup() {
    this.api.put<User>('/me/setup', { openingBalance: this.num(this.balance), monthlyIncome: this.num(this.salary) }).subscribe({
      next: (u) => { this.auth.setUser(u); this.toast.show(this.i18n.t('pr.saved')); },
    });
  }

  demo() {
    this.data.select(null);
    this.data.loadDemo();
    this.toast.show(this.i18n.t('fam.saved'));
  }
}
