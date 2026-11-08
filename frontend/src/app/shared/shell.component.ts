import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18n, LANGS, TPipe } from '../core/i18n.service';
import { Api } from '../core/api.service';
import { Module } from '../core/models';
import { IconComponent } from './icon.component';
import { LogoComponent } from './logo.component';

interface NavItem { path: string; key: string; icon: string; module?: Module; personal?: boolean; }

const NAV: NavItem[] = [
  { path: 'accueil', key: 'nav.home', icon: 'home', personal: true },
  { path: 'budget', key: 'nav.budget', icon: 'budget', module: 'BUDGET' },
  { path: 'factures', key: 'nav.bills', icon: 'bills', module: 'BILLS' },
  { path: 'agenda', key: 'nav.agenda', icon: 'agenda', module: 'AGENDA' },
  { path: 'documents', key: 'nav.documents', icon: 'documents', module: 'DOCUMENTS' },
  { path: 'courses', key: 'nav.shopping', icon: 'shopping', module: 'SHOPPING' },
  { path: 'taches', key: 'nav.tasks', icon: 'tasks', module: 'TASKS' },
  { path: 'assistant', key: 'nav.assistant', icon: 'assistant', personal: true },
  { path: 'famille', key: 'nav.family', icon: 'family' },
  { path: 'profil', key: 'nav.profile', icon: 'profile' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, IconComponent, LogoComponent],
  template: `
    <div class="topbar">
      <app-logo [size]="34" [word]="false" />
      @if (data.viewables().length) {
        <select [value]="data.ownerId() ?? ''" (change)="pick($any($event.target).value)" [attr.aria-label]="'c.viewing' | t">
          <option value="">{{ 'c.mine' | t }}</option>
          @for (v of data.viewables(); track v.ownerId) {<option [value]="v.ownerId">{{ v.name }}</option>}
        </select>
      } @else {<strong>{{ 'app.name' | t }}</strong>}
      <select [value]="i18n.lang()" (change)="i18n.set($any($event.target).value)" [attr.aria-label]="'auth.lang' | t">
        @for (l of langs; track l.code) {<option [value]="l.code">{{ l.code.toUpperCase() }}</option>}
      </select>
    </div>

    <div class="app">
      <aside class="side">
        <app-logo [light]="true" />
        @if (data.viewables().length) {
          <label class="view-as">{{ 'c.viewing' | t }}
            <select [value]="data.ownerId() ?? ''" (change)="pick($any($event.target).value)">
              <option value="">{{ 'c.mine' | t }}</option>
              @for (v of data.viewables(); track v.ownerId) {<option [value]="v.ownerId">{{ v.name }}</option>}
            </select>
          </label>
        }
        <nav>
          @for (n of items(); track n.path) {
            <a class="nav-link" [routerLink]="'/' + n.path" routerLinkActive="active"><app-icon [name]="n.icon" />{{ n.key | t }}</a>
          }
        </nav>
        <div class="who">
          <div class="lang-switch">
            @for (l of langs; track l.code) {<button type="button" [class.on]="i18n.lang() === l.code" (click)="i18n.set(l.code)" [title]="l.label">{{ l.code }}</button>}
          </div>
          <span>{{ auth.user()?.name }}</span>
          <button class="btn ghost small" style="color:#fff;border-color:rgba(167,196,180,.5)" type="button" (click)="auth.logout()"><app-icon name="logout" [size]="16" />{{ 'auth.logout' | t }}</button>
        </div>
      </aside>

      <main class="main">
        @if (data.ownerId() !== null) {
          <div class="banner" style="margin-bottom:1rem">
            <app-icon name="family" [size]="18" /> {{ 'c.viewing' | t }} {{ data.viewedName() }}
            <span class="grow"></span>
            <button class="btn ghost small" type="button" (click)="pick('')">{{ 'c.mine' | t }}</button>
          </div>
        }
        <router-outlet />
      </main>
    </div>

    <nav class="tabbar" aria-label="menu">
      @for (n of items(); track n.path) {
        <a [routerLink]="'/' + n.path" routerLinkActive="active"><app-icon [name]="n.icon" [size]="22" /><span>{{ n.key | t }}</span></a>
      }
    </nav>
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  data = inject(DataService);
  i18n = inject(I18n);
  private router = inject(Router);
  private api = inject(Api);
  langs = LANGS;

  items = computed(() => {
    const viewing = this.data.ownerId() !== null;
    return NAV.filter((n) => {
      if (n.personal) return !viewing || n.path === 'famille';
      if (n.module) return this.data.can(n.module) !== null;
      return true;
    });
  });

  ngOnInit() {
    this.data.bootstrap();
    // Si la langue du profil diffère de celle du navigateur, la langue choisie ici a la priorité côté interface.
  }

  pick(value: string) {
    const id = value === '' ? null : Number(value);
    this.data.select(id);
    if (id === null) this.router.navigate(['/accueil']);
    else {
      const first = NAV.find((n) => n.module && this.data.can(n.module) !== null);
      this.router.navigate(['/' + (first ? first.path : 'famille')]);
    }
  }
}
