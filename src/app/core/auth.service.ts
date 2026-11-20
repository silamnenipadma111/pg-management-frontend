import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, tap, timeout } from 'rxjs';
import { ApiService } from './api.service';
import { Role, SessionResponse, User } from './models';

/**
 * Only a flag ("this browser has signed in") is kept in web storage. The session token itself lives in an
 * HttpOnly cookie that scripts cannot read, and the user details are loaded from the server.
 */
const SESSION_HINT = 'pg.session';
const RESTORE_TIMEOUT_MS = 8000;
const UNAUTHORIZED = 401;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private csrf: string | null = null;

  readonly user = signal<User | null>(null);
  readonly loggedIn = computed(() => !!this.user());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  constructor() {
    // keep every open tab in step: signing out (or in) elsewhere is reflected here
    window.addEventListener('storage', event => {
      if (event.key !== SESSION_HINT) {
        return;
      }
      if (event.newValue) {
        void this.restore();
      } else {
        this.clear();
      }
    });
  }

  /** Sent in the X-CSRF-Token header of state changing requests; held in memory only. */
  get csrfToken(): string | null {
    return this.csrf;
  }

  /** Runs before the application renders: restores the signed-in user from the session cookie. */
  restore(): Promise<void> {
    if (!localStorage.getItem(SESSION_HINT)) {
      return Promise.resolve();
    }
    return firstValueFrom(
      this.api.session().pipe(
        timeout(RESTORE_TIMEOUT_MS),
        map(session => this.apply(session)),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === UNAUTHORIZED) {
            this.clear();
          }
          return of(undefined);
        })
      )
    );
  }

  /** Call with the response of a successful sign-in. */
  start(session: SessionResponse): void {
    this.apply(session);
    localStorage.setItem(SESSION_HINT, '1');
  }

  /** Ends the session on the server (it cannot be used again) and forgets it locally. */
  signout(): Observable<void> {
    return this.api.signout().pipe(
      catchError(() => of(undefined)),
      tap(() => this.clear())
    );
  }

  /** Forgets the local session state, e.g. after the server reports that the session expired. */
  clear(): void {
    this.csrf = null;
    this.user.set(null);
    localStorage.removeItem(SESSION_HINT);
  }

  homeRoute(): string {
    return this.role() === 'SUPPORT' ? '/support' : '/';
  }

  private apply(session: SessionResponse): void {
    this.csrf = session.csrfToken;
    this.user.set(session.user);
  }
}
