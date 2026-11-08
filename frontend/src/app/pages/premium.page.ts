import { Component, OnInit, inject, signal } from '@angular/core';
import { Api } from '../core/api.service';
import { I18n, TPipe } from '../core/i18n.service';
import { SubscriptionView } from '../core/models';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-premium',
  standalone: true,
  imports: [TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'prem.title' | t }}</h1><p>{{ 'prem.sub' | t }}</p></div></div>
    <div class="grid two">
      <div class="card">
        <ul class="list">
          @for (k of feats; track k) {<li class="item"><app-icon name="tasks" [size]="20" /><span class="grow t">{{ k | t }}</span></li>}
        </ul>
        @if (sub(); as s) {
          <p style="margin-top:1rem"><span class="pill ok">{{ 'prem.current' | t }} : {{ ('prem.PLAN.' + s.plan) | t }}</span></p>
          @if (s.trialActive) {<p class="muted small">{{ 'prem.trialActive' | t: { n: s.trialDaysLeft } }}</p>}
        }
        <p class="muted small">{{ 'prem.demo' | t }}</p>
      </div>
      <div class="stack">
        <div class="grid" style="grid-template-columns:1fr 1fr">
          <div class="card" style="text-align:center">
            <div class="muted small">{{ 'prem.monthly' | t }}</div>
            <div class="val" style="font-family:var(--serif);font-size:1.8rem;color:var(--forest)">3,99 €</div>
            <div class="muted small">{{ 'prem.perMonth' | t }}</div>
            <button class="btn small" type="button" style="margin-top:.8rem" (click)="choose('MONTHLY')">{{ 'prem.choose' | t }}</button>
          </div>
          <div class="card hero-card" style="text-align:center">
            <div class="small" style="color:var(--sage)">{{ 'prem.yearly' | t }}</div>
            <div style="font-family:var(--serif);font-size:1.8rem;color:#fff">29,99 €</div>
            <div class="small" style="color:var(--sage)">{{ 'prem.perYear' | t }} {{ 'prem.yearlyHint' | t }}</div>
            <button class="btn small" type="button" style="margin-top:.8rem;background:#fff;color:var(--forest)" (click)="choose('YEARLY')">{{ 'prem.choose' | t }}</button>
          </div>
        </div>
        @if (sub() && !sub()!.trialUsed) {<button class="btn ghost" type="button" (click)="trial()">{{ 'prem.trial' | t }}</button>}
        @if (sub() && sub()!.plan !== 'FREE') {<button class="btn danger small" type="button" (click)="choose('FREE')">{{ 'prem.back' | t }}</button>}
      </div>
    </div>
  `,
})
export class PremiumPage implements OnInit {
  private api = inject(Api);
  private i18n = inject(I18n);
  sub = signal<SubscriptionView | null>(null);
  feats = ['prem.f1', 'prem.f2', 'prem.f3', 'prem.f4', 'prem.f5'];
  ngOnInit() { this.api.get<SubscriptionView>('/subscription').subscribe({ next: (s) => this.sub.set(s) }); }
  choose(plan: string) { this.api.put<SubscriptionView>('/subscription/plan', { plan }).subscribe({ next: (s) => this.sub.set(s) }); }
  trial() { this.api.post<SubscriptionView>('/subscription/trial').subscribe({ next: (s) => this.sub.set(s) }); }
}
