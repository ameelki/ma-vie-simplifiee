import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const loggedIn: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user() && auth.token ? true : inject(Router).createUrlTree(['/connexion']);
};
