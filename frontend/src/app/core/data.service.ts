import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from './api.service';
import { Entry, FamilyView, Level, Module, Viewable } from './models';

/** Données de l'espace affiché : le mien, ou celui d'un membre de ma famille qui m'a ouvert des menus. */
@Injectable({ providedIn: 'root' })
export class DataService {
  private api = inject(Api);
  readonly entries = signal<Entry[]>([]);
  readonly loading = signal(false);
  readonly viewables = signal<Viewable[]>([]);
  readonly family = signal<FamilyView | null>(null);
  /** null = mon propre espace. */
  readonly ownerId = signal<number | null>(null);
  readonly viewedName = computed(() => this.viewables().find((v) => v.ownerId === this.ownerId())?.name ?? '');

  /** Niveau d'accès par menu sur l'espace affiché. */
  can(m: Module): Level | null {
    const o = this.ownerId();
    if (o === null) return 'EDIT';
    return (this.viewables().find((v) => v.ownerId === o)?.modules[m] as Level) ?? null;
  }
  canEdit(m: Module): boolean { return this.can(m) === 'EDIT'; }

  list(m: Module): Entry[] { return this.entries().filter((e) => e.module === m); }

  bootstrap() {
    this.ownerId.set(null);
    this.loadAccess();
    this.loadFamily();
    this.load();
  }

  clear() {
    this.entries.set([]);
    this.viewables.set([]);
    this.family.set(null);
    this.ownerId.set(null);
  }

  load() {
    this.loading.set(true);
    const o = this.ownerId();
    this.api.get<Entry[]>('/entries', o === null ? undefined : { ownerId: String(o) }).subscribe({
      next: (list) => { this.entries.set(list); this.loading.set(false); },
      error: () => { this.entries.set([]); this.loading.set(false); },
    });
  }

  loadAccess() {
    this.api.get<Viewable[]>('/me/access').subscribe({ next: (v) => this.viewables.set(v), error: () => this.viewables.set([]) });
  }

  loadFamily() {
    this.api.get<FamilyView | Record<string, never>>('/family').subscribe({
      next: (f) => this.family.set((f as FamilyView).id ? (f as FamilyView) : null),
      error: () => this.family.set(null),
    });
  }

  applyFamily(f: any) {
    this.family.set(f && f.id ? (f as FamilyView) : null);
    this.loadAccess();
  }

  select(ownerId: number | null) {
    this.ownerId.set(ownerId);
    this.load();
  }

  create(body: Partial<Entry> & { module: Module; title: string }, done?: () => void) {
    const o = this.ownerId();
    this.api.post<Entry>('/entries', { ...body, ownerId: o }).subscribe({
      next: (e) => { this.entries.set([...this.entries(), e]); done?.(); },
    });
  }

  update(e: Entry, patch: Partial<Entry>) {
    const body = { ...e, ...patch };
    this.api.put<Entry>('/entries/' + e.id, body).subscribe({
      next: (x) => this.entries.set(this.entries().map((y) => (y.id === x.id ? x : y))),
    });
  }

  remove(e: Entry) {
    this.api.del<void>('/entries/' + e.id).subscribe({ next: () => this.entries.set(this.entries().filter((y) => y.id !== e.id)) });
  }

  loadDemo() {
    this.api.post<Entry[]>('/entries/demo').subscribe({ next: () => this.load() });
  }
}
