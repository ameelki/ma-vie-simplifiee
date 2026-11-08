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

/** Réduit une photo (côté le plus long : 1600 px) et la convertit en JPEG avant envoi à l'IA. */
export function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

const normTxt = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const stemWord = (w: string) => (w.length > 4 && /[sx]$/.test(w) ? w.slice(0, -1) : w);

/** Offres dont le nom contient tous les mots de l'article (accents et pluriels ignorés). */
export function matchOffers<T extends { product: string }>(item: string, offers: T[]): T[] {
  const words = normTxt(item).split(' ').filter((w) => w.length >= 3).map(stemWord);
  if (!words.length) return [];
  return offers.filter((o) => { const p = ' ' + normTxt(o.product) + ' '; return words.every((w) => p.includes(w)); });
}

const BILL_TO_BUDGET: Record<string, string> = { HOUSING: 'HOUSING', ENERGY: 'HOUSING', WATER: 'HOUSING', INTERNET: 'HOUSING', PHONE: 'HOUSING', HEALTH: 'HEALTH' };

/** Une facture payée compte comme une dépense du budget (catégorie ramenée à celles du budget). */
export function billsAsExpenses<T extends { status?: string | null; category?: string | null; kind?: string | null }>(bills: T[]): T[] {
  return bills.filter((b) => b.status === 'PAID').map((b) => ({ ...b, kind: 'EXPENSE', category: BILL_TO_BUDGET[b.category || ''] || 'OTHER' }));
}
