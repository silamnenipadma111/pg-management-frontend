import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../environments/environment';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService, LANGUAGES, Lang, TranslatePipe } from '../core/i18n.service';
import { UiService } from '../core/ui.service';
import { BrandComponent } from './brand.component';
import { IconComponent } from './icon.component';
import { UserMenuComponent } from './user-menu.component';

const UNREAD_POLL_MS = 30000;

/** Sticky site header with the brand, main navigation, account menu and the slide-over menu for small screens. */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, BrandComponent, IconComponent, UserMenuComponent],
  host: { '(document:keydown.escape)': 'ui.navOpen.set(false)' },
  template: `
    <header class="site-header no-print">
      <div class="container header-inner">
        <a routerLink="/" class="brand-link" aria-label="PG-STAY home"><app-brand /></a>

        <nav class="main-nav" [attr.aria-label]="'nav.main' | t">
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
          <button type="button" class="nav-button" (click)="ui.assistantOpen.set(true)">{{ 'nav.assistant' | t }}</button>
        </nav>

        <div class="header-actions">
          <label class="lang-select">
            <app-icon name="globe" [size]="16" />
            <span class="sr-only">{{ 'nav.language' | t }}</span>
            <select (change)="setLang($any($event.target).value)">
              @for (l of languages; track l.code) {
                <option [value]="l.code" [selected]="l.code === i18n.lang()">{{ l.label }}</option>
              }
            </select>
          </label>
          @if (auth.loggedIn()) {
            <button type="button" class="icon-tile" (click)="openNotifications()" [attr.aria-label]="'nav.notifications' | t">
              <app-icon name="bell" [size]="18" />
              @if (unread() > 0) { <span class="count-dot">{{ unread() > 9 ? '9+' : unread() }}</span> }
            </button>
            <app-user-menu />
          } @else {
            <a routerLink="/signin" class="nav-signin">{{ 'nav.signin' | t }}</a>
            <a routerLink="/signup" class="btn btn-primary btn-compact">{{ 'nav.signup' | t }}</a>
          }
          <button type="button" class="icon-tile menu-toggle" (click)="ui.navOpen.set(true)" [attr.aria-label]="'nav.openMenu' | t">
            <app-icon name="menu" [size]="20" />
          </button>
        </div>
      </div>
    </header>

    @if (ui.navOpen()) {
      <div class="drawer-layer no-print">
        <button type="button" class="drawer-backdrop" (click)="ui.navOpen.set(false)" [attr.aria-label]="'common.close' | t"></button>
        <aside class="drawer drawer-right nav-drawer" role="dialog" aria-modal="true" [attr.aria-label]="'nav.main' | t">
          <div class="drawer-head">
            <app-brand />
            <button type="button" class="icon-btn" (click)="ui.navOpen.set(false)" [attr.aria-label]="'common.close' | t">
              <app-icon name="x" [size]="18" />
            </button>
          </div>
          <nav class="drawer-nav">
            <a routerLink="/" (click)="ui.navOpen.set(false)">{{ 'nav.home' | t }}</a>
            @switch (auth.role()) {
              @case ('OWNER') {
                <a routerLink="/owner/register-pg" (click)="ui.navOpen.set(false)">{{ 'nav.registerPg' | t }}</a>
                <a routerLink="/owner/dashboard" (click)="ui.navOpen.set(false)">{{ 'nav.dashboards' | t }}</a>
              }
              @case ('CUSTOMER') {
                <a routerLink="/my-rents" (click)="ui.navOpen.set(false)">{{ 'nav.myRents' | t }}</a>
              }
              @case ('SUPPORT') {
                <a routerLink="/support" (click)="ui.navOpen.set(false)">{{ 'nav.support' | t }}</a>
              }
            }
            <a routerLink="/customer-care" (click)="ui.navOpen.set(false)">{{ 'nav.customerCare' | t }}</a>
            <button type="button" (click)="openAssistant()">{{ 'nav.assistant' | t }}</button>
            @if (!auth.loggedIn()) {
              <a routerLink="/signin" (click)="ui.navOpen.set(false)">{{ 'nav.signin' | t }}</a>
            }
          </nav>
          <div class="drawer-foot">
            <p class="eyebrow">{{ 'footer.contact' | t }}</p>
            <p class="muted small"><a [href]="'mailto:' + supportEmail">{{ supportEmail }}</a> · {{ supportPhone }}</p>
            @if (!auth.loggedIn()) {
              <a routerLink="/signup" class="btn btn-primary block" (click)="ui.navOpen.set(false)">{{ 'nav.signup' | t }}</a>
            }
          </div>
        </aside>
      </div>
    }
  `
})
export class SiteHeaderComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly ui = inject(UiService);
  private readonly api = inject(ApiService);

  readonly languages = LANGUAGES;
  readonly supportEmail = environment.supportEmail;
  readonly supportPhone = environment.supportPhone;
  readonly unread = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      // refresh the badge after signing in / out and whenever the notification drawer is closed again
      if (this.auth.loggedIn() && !this.ui.notificationsOpen()) {
        this.refreshUnread();
      } else if (!this.auth.loggedIn()) {
        this.unread.set(0);
      }
    });
  }

  ngOnInit(): void {
    this.timer = setInterval(() => this.refreshUnread(), UNREAD_POLL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  openNotifications(): void {
    this.ui.notificationsOpen.set(true);
  }

  openAssistant(): void {
    this.ui.navOpen.set(false);
    this.ui.assistantOpen.set(true);
  }

  private refreshUnread(): void {
    if (!this.auth.loggedIn()) {
      return;
    }
    this.api.notifications().subscribe({ next: r => this.unread.set(r.unread), error: () => this.unread.set(0) });
  }
}
