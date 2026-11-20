import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { EMAIL_PATTERN } from '../../core/validators';
import { IconComponent } from '../../shared/icon.component';

type State = 'checking' | 'verified' | 'failed';

/** Landing page of the "verify your email" link: /verify-email?token=... */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent],
  template: `
    <div class="container auth-page">
      <div class="auth-card">
        @switch (state()) {
          @case ('checking') {
            <div class="spinner"></div>
            <p class="muted center">{{ 'auth.verifying' | t }}</p>
          }
          @case ('verified') {
            <span class="medallion medallion-lg"><app-icon name="check" [size]="26" /></span>
            <p class="eyebrow">{{ 'auth.allSet' | t }}</p>
            <h1 class="display">{{ 'auth.emailVerified' | t }}</h1>
            <p class="muted center">{{ message() }}</p>
            <a routerLink="/signin" [queryParams]="{ reason: 'verified' }" class="btn btn-primary block">
              {{ 'auth.goSignin' | t }} <app-icon name="arrow-right" [size]="14" />
            </a>
          }
          @case ('failed') {
            <span class="medallion medallion-lg"><app-icon name="mail" [size]="26" /></span>
            <p class="eyebrow">{{ 'auth.verifyEyebrow' | t }}</p>
            <h1 class="display">{{ 'auth.linkExpired' | t }}</h1>
            <p class="alert error" role="alert">{{ message() || ('auth.linkIncomplete' | t) }}</p>
            @if (notice()) { <p class="alert success">{{ notice() }}</p> }
            <form (ngSubmit)="resend()" #form="ngForm" novalidate>
              <label>{{ 'auth.email' | t }}
                <input type="email" name="email" [(ngModel)]="email" required email [pattern]="emailPattern" maxlength="150"
                       autocomplete="email" />
              </label>
              <button class="btn btn-primary block" [disabled]="form.invalid || busy()">{{ 'auth.resend' | t }}</button>
            </form>
            <p class="muted center"><a routerLink="/signin">{{ 'auth.goSignin' | t }}</a></p>
          }
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  /** Bound from the query string. */
  readonly token = input<string>();
  private readonly api = inject(ApiService);

  readonly emailPattern = EMAIL_PATTERN;
  readonly state = signal<State>('checking');
  readonly message = signal('');
  readonly notice = signal('');
  readonly busy = signal(false);
  email = '';

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.state.set('failed');
      return;
    }
    this.api.verifyEmail(token).subscribe({
      next: res => {
        this.message.set(res.message);
        this.state.set('verified');
      },
      error: err => {
        this.message.set(errorMessage(err));
        this.state.set('failed');
      }
    });
  }

  resend(): void {
    this.busy.set(true);
    this.api.resendVerification(this.email.trim()).subscribe({
      next: res => {
        this.notice.set(res.message);
        this.busy.set(false);
      },
      error: err => {
        this.message.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }
}
