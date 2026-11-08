import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly msg = signal('');
  private timer: any;

  show(text: string) {
    this.msg.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.msg.set(''), 2800);
  }
}
