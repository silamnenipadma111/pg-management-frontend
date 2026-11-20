import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { EMAIL_PATTERN } from '../../core/validators';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent],
  template: `
    <div class="container auth-page">
      <div class="auth-card">
        <span class="medallion medallion-lg"><app-icon name="key" [size]="26" [stroke]="1.5" /></span>
        <p class="eyebrow">{{ 'auth.accountHelp' | t }}</p>
        <h1 class="display">{{ 'auth.forgotTitle' | t }}</h1>

        @if (notice()) {
          <p class="alert success">{{ notice() }}</p>
          <a routerLink="/signin" class="btn btn-primary block">{{ 'auth.goSignin' | t }}</a>
        } @else {
          <p class="muted center">{{ 'auth.forgotText' | t }}</p>
          <form (ngSubmit)="submit()" #form="ngForm" novalidate>
            <label>{{ 'auth.email' | t }}
              <input type="email" name="email" [(ngModel)]="email" required email [pattern]="emailPattern" maxlength="150"
                     autocomplete="email" inputmode="email" #emailField="ngModel" />
            </label>
            @if (emailField.invalid && emailField.touched) { <p class="field-error">{{ 'auth.emailInvalid' | t }}</p> }
            @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
            <button class="btn btn-primary block" [disabled]="form.invalid || busy()">{{ 'auth.sendResetLink' | t }}</button>
          </form>
          <p class="muted center"><a routerLink="/signin">{{ 'auth.backToSignin' | t }}</a></p>
        }
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);

  readonly emailPattern = EMAIL_PATTERN;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  email = '';

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.forgotPassword(this.email.trim()).subscribe({
      next: res => {
        this.notice.set(res.message);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }
}
