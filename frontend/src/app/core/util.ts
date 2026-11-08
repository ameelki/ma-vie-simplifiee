import { I18n } from './i18n.service';

export function iso(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function today(): string { return iso(new Date()); }
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return iso(new Date(y, m - 1, d + n));
}
export function parse(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function money(i18n: I18n, v: number | string | null | undefined): string {
  return new Intl.NumberFormat(i18n.locale(), { style: 'currency', currency: 'EUR' }).format(Number(v ?? 0));
}
export function fmtDate(i18n: I18n, isoDate: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!isoDate) return '';
  return parse(isoDate.substring(0, 10)).toLocaleDateString(i18n.locale(), opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}
export function errCode(e: any): string {
  const m = e?.error?.message;
  if (typeof m === 'string' && m.startsWith('ERR_')) return m;
  return e?.status === 0 ? 'ERR_NETWORK' : 'ERR_SERVER';
}
export function initials(name: string | undefined): string {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
