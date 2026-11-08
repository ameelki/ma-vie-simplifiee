import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18n, LANGS, TPipe } from '../core/i18n.service';
import { LogoComponent } from '../shared/logo.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, TPipe, LogoComponent],
  template: `
    <div class="auth">
      <section class="auth-art">
        <app-logo [light]="true" [size]="64" />
        <h1>{{ 'app.name' | t }}</h1>
        <p>{{ 'app.hero' | t }}</p>
      </section>
      <section class="auth-form">
        <div class="auth-box" style="text-align:center">
          <div class="lang-switch" style="max-width:260px;margin-inline:auto">
            @for (l of langs; track l.code) {<button type="button" style="color:var(--forest);border-color:var(--sage)" [style.background]="i18n.lang() === l.code ? 'var(--sage)' : 'transparent'" (click)="i18n.set(l.code)">{{ l.code }}</button>}
          </div>
          <h2>{{ 'wel.tagline' | t }}</h2>
          <p class="muted">{{ 'app.tagline' | t }}</p>
          <a class="btn" routerLink="/inscription">{{ 'wel.start' | t }}</a>
          <p class="muted small">{{ 'auth.hasaccount' | t }} <a routerLink="/connexion">{{ 'auth.login' | t }}</a></p>
        </div>
      </section>
    </div>`,
})
export class WelcomePage {
  i18n = inject(I18n);
  langs = LANGS;
  constructor() {
    if (inject(AuthService).token) inject(Router).navigate(['/accueil']);
  }
}
