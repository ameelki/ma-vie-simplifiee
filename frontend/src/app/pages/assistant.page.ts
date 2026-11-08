import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { addDays, fmtDate, money, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule, TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'as.title' | t }}</h1><p>{{ 'as.sub' | t }}</p></div></div>
    <div class="card">
      <ul class="list">
        @for (a of advice(); track a.text) {
          <li class="item"><div class="stat" style="flex:1"><div class="ico"><app-icon [name]="a.icon" /></div><div class="t">{{ a.text }}</div></div></li>
        } @empty {<li class="empty">{{ 'as.ok' | t }}</li>}
      </ul>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="stack" style="max-height:340px;overflow-y:auto" aria-live="polite">
        @for (m of chat(); track $index) {
          <div [style.text-align]="m.me ? 'right' : 'left'">
            <span style="display:inline-block;max-width:85%;padding:.6rem .9rem;border-radius:16px;text-align:left"
              [style.background]="m.me ? 'var(--forest)' : 'var(--sand)'" [style.color]="m.me ? '#fff' : 'var(--ink)'">{{ m.text }}</span>
          </div>
        }
      </div>
      <form class="row" style="margin-top:.8rem;flex-wrap:nowrap" (ngSubmit)="ask()">
        <input class="in grow" name="q" [(ngModel)]="question" [placeholder]="'chat.placeholder' | t" autocomplete="off">
        <button class="btn" type="submit" [disabled]="!question.trim()">{{ 'chat.send' | t }}</button>
      </form>
    </div>
  `,
})
export class AssistantPage implements OnInit {
  data = inject(DataService);
  private i18n = inject(I18n);
  private auth = inject(AuthService);
  question = '';
  chat = signal<{ me: boolean; text: string }[]>([]);

  ngOnInit() {
    if (this.data.ownerId() !== null) this.data.select(null);
    this.chat.set([{ me: false, text: this.i18n.t('chat.hello', { name: (this.auth.user()?.name || '').split(' ')[0] }) }]);
  }

  ask() {
    const q = this.question.trim();
    if (!q) return;
    this.question = '';
    this.chat.set([...this.chat(), { me: true, text: q }, { me: false, text: this.answer(q.toLowerCase()) }]);
  }

  /** Réponses calculées à partir des données (sans service externe), en français, anglais, allemand ou portugais. */
  private answer(q: string): string {
    const t = today();
    const parts: string[] = [];
    const m = (v: number) => money(this.i18n, v);
    if (/factur|bill|rechnung|fatura/.test(q)) {
      const bills = this.data.list('BILLS').filter((e) => e.status !== 'PAID');
      parts.push(this.i18n.t('chat.bills', { n: bills.length, total: m(bills.reduce((s, e) => s + Number(e.amount || 0), 0)) }));
    }
    if (/budget|solde|saldo|orçamento|orcamento|argent|money|geld|dépens|depens|expens|ausgab|despes|receit|revenu|income/.test(q)) {
      const month = t.substring(0, 7);
      const rows = this.data.list('BUDGET').filter((e) => (e.date || '').startsWith(month));
      const inc = rows.filter((e) => e.kind === 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0);
      const exp = rows.filter((e) => e.kind !== 'INCOME').reduce((s, e) => s + Number(e.amount || 0), 0);
      parts.push(this.i18n.t('chat.budget', { inc: m(inc), exp: m(exp), bal: m(inc - exp) }));
    }
    if (/rendez|agenda|calendar|kalender|termin|compromiss|reuni/.test(q)) {
      const ev = this.data.list('AGENDA').filter((e) => (e.date || '') >= t).sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')));
      parts.push(ev.length ? this.i18n.t('chat.agenda', { n: ev.length, next: ev[0].title + ' (' + fmtDate(this.i18n, ev[0].date) + (ev[0].time ? ' ' + ev[0].time : '') + ')' }) : this.i18n.t('chat.agendaNone'));
    }
    if (/tâche|tache|task|aufgabe|tarefa/.test(q)) parts.push(this.i18n.t('chat.tasks', { n: this.data.list('TASKS').filter((e) => e.status !== 'DONE').length }));
    if (/document|dokument|documento/.test(q)) parts.push(this.i18n.t('chat.docs', { n: this.data.list('DOCUMENTS').filter((e) => e.date && e.date <= addDays(t, 60)).length }));
    if (/course|shopping|einkauf|compra|repas|meal|liste|list/.test(q)) parts.push(this.i18n.t('chat.shopping', { n: this.data.list('SHOPPING').filter((e) => e.kind !== 'MEAL' && !e.done).length }));
    return parts.length ? parts.join(' ') : this.i18n.t('chat.unknown');
  }

  advice = computed(() => {
    this.i18n.lang();
    const t = today(), week = addDays(t, 7), soonDocs = addDays(t, 60);
    const out: { icon: string; text: string }[] = [];
    const bills = this.data.list('BILLS').filter((e) => e.status !== 'PAID');
    const late = bills.filter((e) => (e.date || '') < t).length;
    const soon = bills.filter((e) => (e.date || '') >= t && (e.date || '') <= week).length;
    const events = this.data.list('AGENDA').filter((e) => e.date === t).length;
    const tasks = this.data.list('TASKS').filter((e) => e.status !== 'DONE').length;
    const docs = this.data.list('DOCUMENTS').filter((e) => e.date && e.date <= soonDocs).length;
    const month = t.substring(0, 7);
    const net = this.data.list('BUDGET').filter((e) => (e.date || '').startsWith(month)).reduce((s, e) => s + (e.kind === 'INCOME' ? 1 : -1) * Number(e.amount || 0), 0);
    const buy = this.data.list('SHOPPING').filter((e) => e.kind !== 'MEAL' && !e.done).length;
    if (late) out.push({ icon: 'bills', text: this.i18n.t('as.late', { n: late }) });
    if (soon) out.push({ icon: 'bills', text: this.i18n.t('as.soon', { n: soon }) });
    if (events) out.push({ icon: 'agenda', text: this.i18n.t('as.events', { n: events }) });
    if (tasks) out.push({ icon: 'tasks', text: this.i18n.t('as.tasks', { n: tasks }) });
    if (docs) out.push({ icon: 'documents', text: this.i18n.t('as.docs', { n: docs }) });
    if (net < 0) out.push({ icon: 'budget', text: this.i18n.t('as.deficit') });
    if (buy) out.push({ icon: 'shopping', text: this.i18n.t('as.shopping', { n: buy }) });
    return out;
  });
}
