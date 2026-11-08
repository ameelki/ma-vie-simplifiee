import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18n, TPipe } from '../core/i18n.service';
import { User } from '../core/models';
import { LogoComponent } from '../shared/logo.component';

/** Deuxième page, juste après l'inscription : solde actuel et salaire mensuel net (modifiables ensuite dans le profil). */
@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule, TPipe, LogoComponent],
  template: `
    <div class="auth-form" style="min-height:100vh;min-height:100dvh">
      <div class="auth-box">
        <app-logo [size]="44" />
        <h1>{{ 'setup.title' | t }}</h1>
        <p class="muted">{{ 'setup.sub' | t }}</p>
        <form class="stack" (ngSubmit)="save()">
          <label class="f">{{ 'bp.balance' | t }}
            <input name="balance" type="number" step="0.01" inputmode="decimal" [(ngModel)]="balance" placeholder="0.00"></label>
          <label class="f">{{ 'setup.salary' | t }}
            <input name="salary" type="number" step="0.01" min="0" inputmode="decimal" [(ngModel)]="salary" placeholder="0.00"></label>
          <p class="muted small">{{ 'setup.hint' | t }}</p>
          @if (error()) {<div class="err">{{ 'err.ERR_NETWORK' | t }}</div>}
          <button class="btn" type="submit" [disabled]="busy()">{{ 'setup.go' | t }}</button>
          <button class="btn ghost" type="button" (click)="skip()">{{ 'setup.later' | t }}</button>
        </form>
      </div>
    </div>
  `,
})
export class SetupPage {
  private api = inject(Api);
  private auth = inject(AuthService);
  private router = inject(Router);
  i18n = inject(I18n);
  balance: number | null = this.auth.user()?.openingBalance ?? null;
  salary: number | null = this.auth.user()?.monthlyIncome ?? null;
  busy = signal(false);
  error = signal(false);

  private num(v: unknown): number | null { return v === null || v === undefined || (v as string) === '' ? null : Number(v); }

  save() {
    this.busy.set(true);
    this.error.set(false);
    this.api.put<User>('/me/setup', { openingBalance: this.num(this.balance), monthlyIncome: this.num(this.salary) }).subscribe({
      next: (u) => { this.auth.setUser(u); this.skip(); },
      error: () => { this.busy.set(false); this.error.set(true); },
    });
  }

  skip() {
    try { localStorage.setItem('vie_setup_done', '1'); } catch { /* ignore */ }
    this.router.navigate(['/accueil']);
  }
}
