import { Component, Input } from '@angular/core';

/** Logo « Ma Vie Simplifiée » : une feuille traversée d'une coche (la simplicité) abritant trois points (la famille). */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <span class="logo" [class.light]="light">
      <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 64 64" role="img" aria-label="Ma Vie Simplifiée">
        <rect width="64" height="64" rx="16" fill="#173F38" />
        <path d="M14 42C14 26 25 14 49 13c1 24-9 38-26 38-3 0-6-.6-9-2z" fill="#2E7D64" />
        <path d="M24 33l7 7 12-14" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="17" cy="52" r="3.2" fill="#A7C4B4" />
        <circle cx="26" cy="54.5" r="2.4" fill="#A7C4B4" />
        <circle cx="34" cy="55" r="1.7" fill="#A7C4B4" />
      </svg>
      @if (word) {<span class="w">Ma Vie <b>Simplifiée</b></span>}
    </span>`,
  styles: [`
    .logo { display: inline-flex; align-items: center; gap: .6rem; }
    .w { font-family: var(--serif); font-size: 1.15rem; color: var(--forest); font-weight: 500; line-height: 1.05; }
    .w b { display: block; font-weight: 700; }
    .light .w { color: #fff; }
  `],
})
export class LogoComponent {
  @Input() size = 40;
  @Input() word = true;
  @Input() light = false;
}
