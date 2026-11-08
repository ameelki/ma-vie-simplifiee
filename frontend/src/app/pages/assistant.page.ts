import { Component, OnInit, computed, inject } from '@angular/core';
import { DataService } from '../core/data.service';
import { I18n, TPipe } from '../core/i18n.service';
import { addDays, today } from '../core/util';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [TPipe, IconComponent],
  template: `
    <div class="page-head"><div><h1>{{ 'as.title' | t }}</h1><p>{{ 'as.sub' | t }}</p></div></div>
    <div class="card">
      <ul class="list">
        @for (a of advice(); track a.text) {
          <li class="item"><div class="stat" style="flex:1"><div class="ico"><app-icon [name]="a.icon" /></div><div class="t">{{ a.text }}</div></div></li>
        } @empty {<li class="empty">{{ 'as.ok' | t }}</li>}
      </ul>
    </div>
  `,
})
export class AssistantPage implements OnInit {
  data = inject(DataService);
  private i18n = inject(I18n);
  ngOnInit() { if (this.data.ownerId() !== null) this.data.select(null); }

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
