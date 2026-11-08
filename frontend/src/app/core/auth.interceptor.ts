import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const isAuthCall = req.url.includes('/auth/');
  const authReq = token && !isAuthCall ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req;
  return next(authReq).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && !isAuthCall && token) {
        auth.forget();
        router.navigate(['/connexion']);
      }
      return throwError(() => e);
    }),
  );
};
