import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { FamilyView, MODULES, MemberView, Module } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errCode, initials } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'fam.title' | t }}</h1><p>{{ 'fam.intro' | t }}</p></div></div>
    @if (error()) {<div class="err" role="alert" style="margin-bottom:1rem">{{ 'err.' + error() | t }}</div>}

    @if (!fam()) {
      <h2>{{ 'fam.none' | t }}</h2>
      <div class="grid two">
        <form class="card" (ngSubmit)="create()">
          <h3>{{ 'fam.createTitle' | t }}</h3><p class="muted small">{{ 'fam.createHint' | t }}</p>
          <div class="form"><label class="f wide">{{ 'fam.name' | t }}<input name="fname" [(ngModel)]="famName" required></label>
            <button class="btn wide" type="submit" [disabled]="!famName.trim()">{{ 'fam.create' | t }}</button></div>
        </form>
        <form class="card" (ngSubmit)="join()">
          <h3>{{ 'fam.joinTitle' | t }}</h3><p class="muted small">{{ 'fam.joinHint' | t }}</p>
          <div class="form"><label class="f wide">{{ 'fam.code' | t }}<input name="code" [(ngModel)]="code" placeholder="F-XXXXXX" required></label>
            <button class="btn wide" type="submit" [disabled]="!code.trim()">{{ 'fam.join' | t }}</button></div>
        </form>
      </div>
    } @else {
      <div class="card hero-card" style="margin-bottom:1rem">
        <h2>{{ fam()!.name }}</h2>
        <p class="muted">{{ 'fam.codeHelp' | t }}</p>
        <div class="row"><span class="code">{{ fam()!.inviteCode }}</span>
          <button class="btn ghost small" style="color:#fff;border-color:var(--sage)" type="button" (click)="copy()">{{ 'c.copy' | t }}</button></div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>{{ 'fam.members' | t }}</h2>
          <ul class="list">
            @for (m of fam()!.members; track m.userId) {
              <li class="item">
                <div class="avatar">{{ ini(m.name) }}</div>
                <div class="grow"><div class="t">{{ m.name }} @if (m.userId === me()) {<span class="muted">({{ 'fam.you' | t }})</span>}</div>
                  <div class="s">{{ 'fam.role.' + m.role | t }}</div></div>
                @if (isAdmin() && m.userId !== me()) {
                  <button class="btn ghost small" type="button" (click)="role(m)">{{ (m.role === 'ADMIN' ? 'fam.makeMember' : 'fam.makeAdmin') | t }}</button>
                  <button class="btn danger small" type="button" (click)="remove(m)">{{ 'fam.remove' | t }}</button>
                }
              </li>
            }
          </ul>
          <button class="btn danger small" type="button" (click)="leave()" style="margin-top:.8rem">{{ 'fam.leave' | t }}</button>
        </div>

        <div class="card">
          <h2>{{ 'fam.offersTitle' | t }}</h2>
          <p class="muted small">{{ 'fam.offersHint' | t }}</p>
          <ul class="list">
            @for (mod of modules; track mod) {
              <li class="item"><input class="check" type="checkbox" [id]="'o' + mod" [checked]="offered().includes(mod)" (change)="toggleOffer(mod)">
                <label class="grow t" [for]="'o' + mod">{{ 'mod.' + mod | t }}</label></li>
            }
          </ul>
        </div>
      </div>

      @if (viewables().length) {
        <div class="card" style="margin-top:1rem">
          <h2>{{ 'fam.sharedWithMe' | t }}</h2>
          <ul class="list">
            @for (v of viewables(); track v.ownerId) {
              <li class="item"><div class="avatar">{{ ini(v.name) }}</div>
                <div class="grow"><div class="t">{{ v.name }}</div>
                  <div class="s">@for (k of keys(v.modules); track k) {<span class="pill" style="margin-right:.3rem">{{ 'mod.' + k | t }} · {{ 'level.' + v.modules[k] | t }}</span>}</div></div>
                <button class="btn small" type="button" (click)="open(v.ownerId)">{{ 'fam.open' | t }}</button></li>
            }
          </ul>
        </div>
      }

      @if (isAdmin()) {
        <h2 style="margin-top:1.4rem">{{ 'fam.accessTitle' | t }}</h2>
        <p class="muted small">{{ 'fam.accessHint' | t }}</p>
        <div class="stack">
          @for (owner of fam()!.members; track owner.userId) {
            <div class="card">
              <h3>{{ 'fam.dataOf' | t }} {{ owner.name }}</h3>
              @if (!owner.offered.length) {<p class="muted">{{ 'fam.nothingShared' | t }}</p>}
              @else if (others(owner).length === 0) {<p class="muted">—</p>}
              @else {
                <div class="scroll-x">
                  <table class="matrix">
                    <thead><tr><th>{{ 'fam.shownTo' | t }}</th>@for (mod of owner.offered; track mod) {<th>{{ 'mod.' + mod | t }}</th>}</tr></thead>
                    <tbody>
                      @for (g of others(owner); track g.userId) {
                        <tr><td>{{ g.name }}</td>
                          @for (mod of owner.offered; track mod) {
                            <td><select [value]="levelOf(owner.userId, g.userId, mod)" (change)="setLevel(owner, g, mod, $any($event.target).value)" [attr.aria-label]="g.name + ' ' + mod">
                              <option value="">{{ 'level.NONE' | t }}</option><option value="VIEW">{{ 'level.VIEW' | t }}</option><option value="EDIT">{{ 'level.EDIT' | t }}</option></select></td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
        </div>
      }
    }
  `,
})
export class FamilyPage {
  private api = inject(Api);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private i18n = inject(I18n);
  private router = inject(Router);
  data = inject(DataService);
  modules = MODULES;
  famName = ''; code = '';
  error = signal('');

  fam = this.data.family;
  viewables = this.data.viewables;
  me = computed(() => this.auth.user()?.id ?? -1);
  isAdmin = computed(() => this.fam()?.myRole === 'ADMIN');
  offered = computed<Module[]>(() => this.fam()?.members.find((m) => m.userId === this.me())?.offered ?? []);

  ini(n: string) { return initials(n); }
  keys(o: Record<string, string>) { return Object.keys(o); }
  others(owner: MemberView) { return (this.fam()?.members ?? []).filter((m) => m.userId !== owner.userId); }
  levelOf(ownerId: number, granteeId: number, mod: string): string {
    return this.fam()?.grants.find((g) => g.ownerId === ownerId && g.granteeId === granteeId && g.module === mod)?.level ?? '';
  }

  private run(req: any, okMsg = true) {
    this.error.set('');
    req.subscribe({
      next: (f: any) => { this.data.applyFamily(f); if (okMsg) this.toast.show(this.i18n.t('fam.saved')); },
      error: (e: any) => { this.error.set(errCode(e)); this.data.loadFamily(); },
    });
  }

  create() { this.run(this.api.post<FamilyView>('/family', { name: this.famName.trim() })); }
  join() { this.run(this.api.post<FamilyView>('/family/join', { code: this.code.trim().toUpperCase() })); }

  toggleOffer(mod: Module) {
    const cur = this.offered();
    const next = cur.includes(mod) ? cur.filter((x) => x !== mod) : [...cur, mod];
    this.run(this.api.put<FamilyView>('/family/offers', { modules: next }));
  }

  setLevel(owner: MemberView, grantee: MemberView, mod: string, level: string) {
    const mods: Record<string, string> = {};
    for (const m of owner.offered) {
      const v = m === mod ? level : this.levelOf(owner.userId, grantee.userId, m);
      if (v) mods[m] = v;
    }
    this.run(this.api.put<FamilyView>('/family/grants', { ownerId: owner.userId, granteeId: grantee.userId, modules: mods }));
  }

  role(m: MemberView) { this.run(this.api.put<FamilyView>('/family/members/' + m.userId + '/role', { role: m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' })); }

  remove(m: MemberView) {
    if (confirm(this.i18n.t('fam.confirmRemove'))) this.run(this.api.del<FamilyView>('/family/members/' + m.userId));
  }

  leave() {
    if (confirm(this.i18n.t('fam.confirmLeave'))) this.run(this.api.del<FamilyView>('/family/members/' + this.me()));
  }

  open(ownerId: number) {
    this.data.select(ownerId);
    const v = this.viewables().find((x) => x.ownerId === ownerId);
    const first = (v ? Object.keys(v.modules) : [])[0];
    const path: Record<string, string> = { BUDGET: 'budget', BILLS: 'factures', AGENDA: 'agenda', DOCUMENTS: 'documents', SHOPPING: 'courses', TASKS: 'taches' };
    this.router.navigate(['/' + (path[first] || 'famille')]);
  }

  copy() {
    const c = this.fam()?.inviteCode ?? '';
    try { navigator.clipboard.writeText(c); this.toast.show(this.i18n.t('c.copied')); } catch { /* ignore */ }
  }
}
