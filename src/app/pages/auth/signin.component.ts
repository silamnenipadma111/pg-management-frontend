import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiService, errorCode, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Role } from '../../core/models';
import { EMAIL_PATTERN } from '../../core/validators';
import { IconComponent } from '../../shared/icon.component';

const REASONS: Record<string, string> = {
  login: 'auth.loginRequired',
  signup: 'auth.signupDone',
  expired: 'auth.sessionExpired',
  verified: 'auth.emailVerified',
  reset: 'auth.passwordChanged'
};
const ROLES: Role[] = ['CUSTOMER', 'OWNER', 'SUPPORT'];
const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent],
  template: `
    <div class="container auth-page">
      <div class="auth-card">
        <span class="medallion medallion-lg"><app-icon name="lotus" [size]="26" [stroke]="1.5" /></span>
        <p class="eyebrow">{{ 'auth.welcome' | t }}</p>
        <h1 class="display">{{ 'auth.signinTitle' | t }}</h1>
        @if (info()) { <p class="alert info">{{ info() | t }}</p> }

        <p class="field-label">{{ 'auth.signinAs' | t }}</p>
        <div class="role-switch" role="group" [attr.aria-label]="'auth.signinAs' | t">
          <button type="button" [class.active]="role === 'CUSTOMER'" (click)="role = 'CUSTOMER'">{{ 'auth.customer' | t }}</button>
          <button type="button" [class.active]="role === 'OWNER'" (click)="role = 'OWNER'">{{ 'auth.owner' | t }}</button>
          <button type="button" [class.active]="role === 'SUPPORT'" (click)="role = 'SUPPORT'">{{ 'auth.support' | t }}</button>
        </div>

        <form (ngSubmit)="submit()" #form="ngForm" novalidate>
          <label>{{ 'auth.email' | t }}
            <input type="email" name="email" [(ngModel)]="email" required email [pattern]="emailPattern" maxlength="150"
                   autocomplete="username" inputmode="email" #emailField="ngModel" />
          </label>
          @if (emailField.invalid && emailField.touched) { <p class="field-error">{{ 'auth.emailInvalid' | t }}</p> }

          <label>{{ 'auth.password' | t }}
            <span class="password-wrap">
              <input [type]="showPassword() ? 'text' : 'password'" name="password" [(ngModel)]="password" required maxlength="128"
                     autocomplete="current-password" #passwordField="ngModel" />
              <button type="button" class="reveal-btn" (click)="showPassword.set(!showPassword())"
                      [attr.aria-label]="(showPassword() ? 'auth.hidePassword' : 'auth.showPassword') | t">
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
              </button>
            </span>
          </label>
          @if (passwordField.invalid && passwordField.touched) { <p class="field-error">{{ 'auth.passwordRequired' | t }}</p> }

          <p class="form-aside"><a routerLink="/forgot-password">{{ 'auth.forgot' | t }}</a></p>

          @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
          @if (unverified()) {
            <button type="button" class="btn btn-outline block" (click)="resend()" [disabled]="resending()">
              {{ 'auth.resend' | t }}
            </button>
          }
          @if (notice()) { <p class="alert success">{{ notice() }}</p> }

          <button class="btn btn-primary block" [disabled]="form.invalid || busy()">
            {{ 'auth.signinTitle' | t }} <app-icon name="arrow-right" [size]="14" />
          </button>
        </form>

        <p class="muted center">{{ 'auth.noAccount' | t }}
          <a routerLink="/signup" [queryParams]="{ role: role === 'SUPPORT' ? 'CUSTOMER' : role }">{{ 'nav.signup' | t }}</a>
        </p>

        @if (showDemoAccounts) {
          <details class="demo">
            <summary>{{ 'auth.demo' | t }}</summary>
            <p class="muted small">{{ 'auth.demoHint' | t }}</p>
            <button type="button" class="link-btn" (click)="demo('customer@pgstay.in', 'CUSTOMER')">customer&#64;pgstay.in</button>
            <button type="button" class="link-btn" (click)="demo('owner@pgstay.in', 'OWNER')">owner&#64;pgstay.in</button>
            <button type="button" class="link-btn" (click)="demo('support@pgstay.in', 'SUPPORT')">support&#64;pgstay.in</button>
          </details>
        }
      </div>
    </div>
  `
})
export class SigninComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Demo accounts exist only in the development data set; they are never offered in a production build. */
  readonly showDemoAccounts = !environment.production;
  readonly emailPattern = EMAIL_PATTERN;
  role: Role = roleFrom(this.route.snapshot.queryParamMap.get('role'));
  email = '';
  password = '';
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly resending = signal(false);
  readonly unverified = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly info = signal(REASONS[this.route.snapshot.queryParamMap.get('reason') ?? ''] ?? '');

  /** Fills the email and role of a demo account; the demo password is shown next to the list. */
  demo(email: string, role: Role): void {
    this.email = email;
    this.role = role;
  }

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.unverified.set(false);
    this.api.signin({ email: this.email.trim(), password: this.password, role: this.role }).subscribe({
      next: session => {
        this.auth.start(session);
        void this.router.navigateByUrl(this.destination(session.user.role));
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.unverified.set(errorCode(err) === EMAIL_NOT_VERIFIED);
        this.password = '';
        this.busy.set(false);
      }
    });
  }

  resend(): void {
    this.resending.set(true);
    this.api.resendVerification(this.email.trim()).subscribe({
      next: res => {
        this.notice.set(res.message);
        this.error.set('');
        this.resending.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.resending.set(false);
      }
    });
  }

  /** Only paths of this website are accepted as a return address (never another site). */
  private destination(role: Role): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const local = !!returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//');
    const bookingByNonCustomer = !!returnUrl && returnUrl.includes('/book') && role !== 'CUSTOMER';
    return local && !bookingByNonCustomer ? returnUrl : this.auth.homeRoute();
  }
}

function roleFrom(value: string | null): Role {
  return ROLES.find(role => role === value) ?? 'CUSTOMER';
}
