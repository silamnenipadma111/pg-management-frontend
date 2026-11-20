import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from './api.service';
import { AuthService } from './auth.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const UNAUTHORIZED = 401;
const CSRF_HEADER = 'X-CSRF-Token';

/**
 * Sends the session cookie (and, for state changing requests, the CSRF token) with calls to our own API only -
 * never to another host - and returns the user to the sign-in page when the session has ended.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE + '/')) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const csrf = auth.csrfToken;
  const request = req.clone({
    withCredentials: true,
    setHeaders: csrf && !SAFE_METHODS.has(req.method) ? { [CSRF_HEADER]: csrf } : {}
  });
  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === UNAUTHORIZED && auth.loggedIn()) {
        auth.clear();
        void router.navigate(['/signin'], { queryParams: { returnUrl: router.url, reason: 'expired' } });
      }
      return throwError(() => err);
    })
  );
};
