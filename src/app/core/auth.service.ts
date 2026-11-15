import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, Role, User } from './models';

const TOKEN_KEY = 'pg.token';
const USER_KEY = 'pg.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(this.readUser());
  readonly loggedIn = computed(() => !!this.user());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  homeRoute(): string {
    switch (this.role()) {
      case 'OWNER':
        return '/owner/dashboard';
      case 'SUPPORT':
        return '/support';
      default:
        return '/';
    }
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
