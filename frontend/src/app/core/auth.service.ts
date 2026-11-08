import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Api } from './api.service';
import { I18n } from './i18n.service';
import { AuthResponse, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(Api);
  private router = inject(Router);
  private i18n = inject(I18n);
  readonly user = signal<User | null>(this.readUser());

  get token(): string | null {
    try { return localStorage.getItem('vie_token'); } catch { return null; }
  }

  private readUser(): User | null {
    try { const raw = localStorage.getItem('vie_user'); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  private store(r: AuthResponse) {
    try { localStorage.setItem('vie_token', r.token); localStorage.setItem('vie_user', JSON.stringify(r.user)); } catch { /* ignore */ }
    this.user.set(r.user);
    if (r.user.lang) this.i18n.set(r.user.lang);
  }

  setUser(u: User) {
    try { localStorage.setItem('vie_user', JSON.stringify(u)); } catch { /* ignore */ }
    this.user.set(u);
  }

  login(email: string, password: string) {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(tap((r) => this.store(r)));
  }

  register(body: { name: string; email: string; password: string; phone?: string; lang: string }) {
    return this.api.post<AuthResponse>('/auth/register', body).pipe(tap((r) => this.store(r)));
  }

  forget() {
    try { localStorage.removeItem('vie_token'); localStorage.removeItem('vie_user'); } catch { /* ignore */ }
    this.user.set(null);
  }

  logout() {
    this.forget();
    this.router.navigate(['/connexion']);
  }
}
