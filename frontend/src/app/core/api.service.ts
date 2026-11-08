import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(url: string, params?: Record<string, string>) { return this.http.get<T>(this.base + url, { params }); }
  post<T>(url: string, body?: unknown) { return this.http.post<T>(this.base + url, body ?? {}); }
  put<T>(url: string, body?: unknown) { return this.http.put<T>(this.base + url, body ?? {}); }
  upload<T>(url: string, file: Blob, filename: string) {
    const form = new FormData();
    form.append('file', file, filename);
    return this.http.post<T>(this.base + url, form);
  }
  del<T>(url: string) { return this.http.delete<T>(this.base + url); }
}
