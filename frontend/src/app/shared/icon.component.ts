import { Component, Input } from '@angular/core';

const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  budget: 'M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2',
  bills: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  agenda: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  documents: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  shopping: 'M3 4h3l2 12h10l2-9H7M10 20h.01M17 20h.01',
  tasks: 'M4 12l5 5L20 6',
  assistant: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z',
  family: 'M8 11a3 3 0 100-6 3 3 0 000 6zM17 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 15c3 0 6 1.5 6 5',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-7 8-7s8 3 8 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  plus: 'M12 5v14M5 12h14',
  chevL: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  logout: 'M10 4H4v16h6M14 8l5 4-5 4M19 12H9',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d" /></svg>`,
})
export class IconComponent {
  @Input() name = 'home';
  @Input() size = 22;
  get d(): string { return PATHS[this.name] || ''; }
}
