import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { PASSWORD_MAX, checkPassword } from '../../core/validators';
import { IconComponent } from '../../shared/icon.component';
import { PasswordChecklistComponent } from '../../shared/password-checklist.component';

/** Landing page of the "reset your password" link: /reset-password?token=... */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent, PasswordChecklistComponent],
  template: `
    <div class="container auth-page">
      <div class="auth-card">
        <span class="medallion medallion-lg"><app-icon name="lock" [size]="26" [stroke]="1.5" /></span>
        <p class="eyebrow">{{ 'auth.accountHelp' | t }}</p>
        <h1 class="display">{{ 'auth.resetTitle' | t }}</h1>

        @if (!token()) {
          <p class="alert error" role="alert">{{ 'auth.linkIncomplete' | t }}</p>
          <a routerLink="/forgot-password" class="btn btn-primary block">{{ 'auth.sendResetLink' | t }}</a>
        } @else {
          <form (ngSubmit)="submit()" #form="ngForm" novalidate>
            <label>{{ 'auth.newPassword' | t }}
              <span class="password-wrap">
                <input [type]="showPassword() ? 'text' : 'password'" name="password" [ngModel]="password()"
                       (ngModelChange)="password.set($event)" required [maxlength]="passwordMax" autocomplete="new-password"
                       aria-describedby="password-rules" />
                <button type="button" class="reveal-btn" (click)="showPassword.set(!showPassword())"
                        [attr.aria-label]="(showPassword() ? 'auth.hidePassword' : 'auth.showPassword') | t">
                  <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
                </button>
              </span>
            </label>
            <label>{{ 'auth.confirmPassword' | t }}
              <input [type]="showPassword() ? 'text' : 'password'" name="confirm" [ngModel]="confirm()"
                     (ngModelChange)="confirm.set($event)" required [maxlength]="passwordMax" autocomplete="new-password"
                     #confirmField="ngModel" />
            </label>
            @if (confirmField.touched && !matches()) { <p class="field-error">{{ 'auth.passwordMismatch' | t }}</p> }
            <div id="password-rules"><app-password-checklist [check]="check()" /></div>

            @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
            <button class="btn btn-primary block" [disabled]="form.invalid || !check().valid || !matches() || busy()">
              {{ 'auth.savePassword' | t }}
            </button>
          </form>
          <p class="muted center"><a routerLink="/signin">{{ 'auth.backToSignin' | t }}</a></p>
        }
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  /** Bound from the query string. */
  readonly token = input<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly passwordMax = PASSWORD_MAX;
  readonly password = signal('');
  readonly confirm = signal('');
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly check = computed(() => checkPassword(this.password(), []));
  readonly matches = computed(() => this.password() === this.confirm());

  submit(): void {
    const token = this.token();
    if (!token) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.resetPassword(token, this.password()).subscribe({
      next: () => void this.router.navigate(['/signin'], { queryParams: { reason: 'reset' } }),
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }
}
