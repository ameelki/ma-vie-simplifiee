import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { DICT } from './i18n.dict';

export type Lang = 'fr' | 'en' | 'de' | 'pt';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }, { code: 'pt', label: 'Português' },
];
const KEY = 'vie_lang';
const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', pt: 'pt-PT' };

function initial(): Lang {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'fr' || s === 'en' || s === 'de' || s === 'pt') return s;
  } catch { /* ignore */ }
  const n = (typeof navigator !== 'undefined' ? navigator.language : 'fr').slice(0, 2).toLowerCase();
  return n === 'de' || n === 'en' || n === 'pt' ? n : 'fr';
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(initial());

  constructor() { this.apply(this.lang()); }

  set(l: string) {
    const lang: Lang = l === 'de' || l === 'en' || l === 'pt' ? l : 'fr';
    this.lang.set(lang);
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
    this.apply(lang);
  }

  private apply(l: Lang) {
    if (typeof document !== 'undefined') document.documentElement.lang = l;
  }

  locale(): string { return LOCALE[this.lang()]; }

  /** Traduit une clé ; {nom} dans le texte est remplacé par la valeur de params. */
  t(key: string, params?: Record<string, string | number>): string {
    const row = DICT[key];
    let s = row ? row[this.lang()] || row.fr : key;
    if (params) for (const k of Object.keys(params)) s = s.split('{' + k + '}').join(String(params[k]));
    return s;
  }
}

@Pipe({ name: 't', standalone: true, pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(I18n);
  transform(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }
}
