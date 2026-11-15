import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.loggedIn()) {
      return router.createUrlTree(['/signin'], { queryParams: { returnUrl: state.url } });
    }
    if (roles.length && !roles.includes(auth.role()!)) {
      return router.createUrlTree([auth.homeRoute()]);
    }
    return true;
  };
}
