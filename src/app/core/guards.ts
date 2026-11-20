import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Requires a signed-in user, optionally with one of the given roles. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();
    if (!role) {
      return router.createUrlTree(['/signin'], { queryParams: { returnUrl: state.url, reason: 'login' } });
    }
    if (roles.length && !roles.includes(role)) {
      return router.createUrlTree([auth.homeRoute()]);
    }
    return true;
  };
}

/** Sign-in / sign-up pages are for visitors; a signed-in user is sent to their home page instead. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.loggedIn() ? inject(Router).createUrlTree([auth.homeRoute()]) : true;
};
