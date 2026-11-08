import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18n, LANGS, TPipe } from '../core/i18n.service';
import { errCode } from '../core/util';
import { LogoComponent } from '../shared/logo.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, LogoComponent],
  template: `
    <div class="auth">
      <section class="auth-art">
        <app-logo [light]="true" [size]="52" />
        <h1>{{ 'app.name' | t }}</h1>
        <p>{{ 'app.hero' | t }}</p>
      </section>
      <section class="auth-form">
        <form class="auth-box" (ngSubmit)="submit()" #f="ngForm">
          <div class="lang-switch" style="max-width:260px">
            @for (l of langs; track l.code) {<button type="button" style="color:var(--forest);border-color:var(--sage)" [style.background]="i18n.lang() === l.code ? 'var(--sage)' : 'transparent'" (click)="i18n.set(l.code)">{{ l.code }}</button>}
          </div>
          <div>
            <h2>{{ (register ? 'auth.join' : 'auth.welcome') | t }}</h2>
            <p class="muted">{{ 'app.tagline' | t }}</p>
          </div>
          @if (register) {
            <label class="f">{{ 'auth.name' | t }}<input name="name" [(ngModel)]="name" required autocomplete="name"></label>
            <label class="f">{{ 'auth.phone' | t }}<input name="phone" [(ngModel)]="phone" type="tel" autocomplete="tel"></label>
          }
          <label class="f">{{ 'auth.email' | t }}<input name="email" [(ngModel)]="email" type="email" required autocomplete="email"></label>
          <label class="f">{{ 'auth.password' | t }}<input name="pw" [(ngModel)]="password" type="password" required minlength="8" [attr.autocomplete]="register ? 'new-password' : 'current-password'">
            @if (register) {<span class="muted small" style="font-weight:400">{{ 'auth.passwordHint' | t }}</span>}
          </label>
          @if (error()) {<div class="err" role="alert">{{ ('err.' + error()) | t }}</div>}
          <button class="btn" type="submit" [disabled]="busy() || f.invalid">{{ (register ? 'auth.register' : 'auth.login') | t }}</button>
          <p class="muted small">
            {{ (register ? 'auth.hasaccount' : 'auth.noaccount') | t }}
            <a [routerLink]="register ? '/connexion' : '/inscription'">{{ (register ? 'auth.login' : 'auth.register') | t }}</a>
          </p>
        </form>
      </section>
    </div>`,
})
export class AuthPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  i18n = inject(I18n);
  langs = LANGS;
  register = inject(ActivatedRoute).snapshot.data['mode'] === 'register';
  name = ''; phone = ''; email = ''; password = '';
  busy = signal(false);
  error = signal('');

  submit() {
    this.busy.set(true);
    this.error.set('');
    const req = this.register
      ? this.auth.register({ name: this.name.trim(), email: this.email.trim(), password: this.password, phone: this.phone.trim() || undefined, lang: this.i18n.lang() })
      : this.auth.login(this.email.trim(), this.password);
    req.subscribe({
      next: () => { this.busy.set(false); this.router.navigate(['/accueil']); },
      error: (e) => { this.busy.set(false); this.error.set(errCode(e)); },
    });
  }
}
