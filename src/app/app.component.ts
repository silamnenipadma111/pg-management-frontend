import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';
import { I18nService, LANGUAGES, Lang, TranslatePipe } from './core/i18n.service';
import { WelcomeComponent } from './shared/welcome.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, WelcomeComponent],
  template: `
    @if (!i18n.chosen()) {
      <app-welcome />
    }
    <header class="topbar">
      <div class="container topbar-inner">
        <a routerLink="/" class="brand"><span class="logo">🏠</span> {{ 'app.name' | t }}</a>
        <button class="menu-toggle" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">☰</button>
        <nav [class.open]="menuOpen()" (click)="menuOpen.set(false)">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ 'nav.home' | t }}</a>
          @switch (auth.role()) {
            @case ('OWNER') {
              <a routerLink="/owner/register-pg" routerLinkActive="active">{{ 'nav.registerPg' | t }}</a>
              <a routerLink="/owner/dashboard" routerLinkActive="active">{{ 'nav.dashboards' | t }}</a>
            }
            @case ('CUSTOMER') {
              <a routerLink="/my-rents" routerLinkActive="active">{{ 'nav.myRents' | t }}</a>
            }
            @case ('SUPPORT') {
              <a routerLink="/support" routerLinkActive="active">{{ 'nav.support' | t }}</a>
            }
          }
          <a routerLink="/customer-care" routerLinkActive="active">{{ 'nav.customerCare' | t }}</a>
          <a routerLink="/faq" routerLinkActive="active">{{ 'nav.faq' | t }}</a>
          @if (auth.loggedIn()) {
            <a routerLink="/notifications" routerLinkActive="active" class="bell" [attr.aria-label]="'nav.notifications' | t">
              🔔 @if (unread() > 0) { <span class="badge">{{ unread() }}</span> }
            </a>
            <span class="user-chip" [title]="auth.user()?.email">{{ auth.user()?.name }} · {{ auth.role() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="logout()">{{ 'nav.logout' | t }}</button>
          } @else {
            <a routerLink="/signin" routerLinkActive="active">{{ 'nav.signin' | t }}</a>
            <a routerLink="/signup" class="btn btn-primary btn-sm">{{ 'nav.signup' | t }}</a>
          }
        </nav>
        <select class="lang" (change)="setLang($any($event.target).value)" [attr.aria-label]="'nav.language' | t">
          @for (l of languages; track l.code) {
            <option [value]="l.code" [selected]="l.code === i18n.lang()">{{ l.label }}</option>
          }
        </select>
      </div>
    </header>
    <main class="container page">
      <router-outlet />
    </main>
    <footer class="footer">
      <div class="container">© {{ year }} {{ 'app.name' | t }} · {{ 'app.tagline' | t }}</div>
    </footer>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  i18n = inject(I18nService);
  private api = inject(ApiService);
  private router = inject(Router);
  languages = LANGUAGES;
  menuOpen = signal(false);
  unread = signal(0);
  year = new Date().getFullYear();
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      if (this.auth.loggedIn()) {
        this.refreshUnread();
      } else {
        this.unread.set(0);
      }
    });
  }

  ngOnInit(): void {
    document.documentElement.lang = this.i18n.lang();
    this.timer = setInterval(() => this.refreshUnread(), 30000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  refreshUnread(): void {
    if (!this.auth.loggedIn()) {
      return;
    }
    this.api.notifications().subscribe({ next: r => this.unread.set(r.unread), error: () => undefined });
  }

  setLang(l: Lang): void {
    this.i18n.setLang(l);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
