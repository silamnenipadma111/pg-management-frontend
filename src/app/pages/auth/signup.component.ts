import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Role } from '../../core/models';
import { EMAIL_PATTERN, MOBILE_PATTERN, NAME_PATTERN, PASSWORD_MAX, checkPassword } from '../../core/validators';
import { IconComponent } from '../../shared/icon.component';
import { PasswordChecklistComponent } from '../../shared/password-checklist.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent, PasswordChecklistComponent],
  template: `
    <div class="container auth-page">
      <div class="auth-card auth-card-wide">
        <span class="medallion medallion-lg"><app-icon name="lotus" [size]="26" [stroke]="1.5" /></span>

        @if (sentTo()) {
          <p class="eyebrow">{{ 'auth.almostThere' | t }}</p>
          <h1 class="display">{{ 'auth.checkInbox' | t }}</h1>
          <p class="muted center">{{ 'auth.verifySent' | t: { email: sentTo() } }}</p>
          @if (notice()) { <p class="alert success">{{ notice() }}</p> }
          @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
          <button type="button" class="btn btn-outline block" (click)="resend()" [disabled]="busy()">{{ 'auth.resend' | t }}</button>
          <a routerLink="/signin" [queryParams]="{ role }" class="btn btn-primary block">{{ 'auth.goSignin' | t }}</a>
          <p class="muted center small">{{ 'auth.verifyHelp' | t }} <a [href]="'mailto:' + supportEmail">{{ supportEmail }}</a></p>
        } @else {
          <p class="eyebrow">{{ 'auth.joinUs' | t }}</p>
          <h1 class="display">{{ 'auth.signupTitle' | t }}</h1>

          <p class="field-label">{{ 'auth.signupAs' | t }}</p>
          <div class="role-switch" role="group" [attr.aria-label]="'auth.signupAs' | t">
            <button type="button" [class.active]="role === 'CUSTOMER'" (click)="role = 'CUSTOMER'">{{ 'auth.customer' | t }}</button>
            <button type="button" [class.active]="role === 'OWNER'" (click)="role = 'OWNER'">{{ 'auth.owner' | t }}</button>
          </div>

          <form (ngSubmit)="submit()" #form="ngForm" novalidate>
            <label>{{ 'auth.name' | t }}
              <input name="name" [ngModel]="m().name" (ngModelChange)="set('name', $event)" required [pattern]="namePattern"
                     maxlength="100" autocomplete="name" #nameField="ngModel" />
            </label>
            @if (nameField.invalid && nameField.touched) { <p class="field-error">{{ 'auth.nameInvalid' | t }}</p> }

            <div class="grid-2">
              <div>
                <label>{{ 'auth.email' | t }}
                  <input type="email" name="email" [ngModel]="m().email" (ngModelChange)="set('email', $event)" required email
                         [pattern]="emailPattern" maxlength="150" autocomplete="email" inputmode="email" #emailField="ngModel" />
                </label>
                @if (emailField.invalid && emailField.touched) { <p class="field-error">{{ 'auth.emailInvalid' | t }}</p> }
              </div>
              <div>
                <label>{{ 'auth.phone' | t }}
                  <input type="tel" name="phone" [ngModel]="m().phone" (ngModelChange)="set('phone', $event)" required
                         [pattern]="mobilePattern" maxlength="14" autocomplete="tel" inputmode="tel" placeholder="98765 43210"
                         #phoneField="ngModel" />
                </label>
                @if (phoneField.invalid && phoneField.touched) { <p class="field-error">{{ 'auth.phoneInvalid' | t }}</p> }
              </div>
            </div>

            @if (role === 'CUSTOMER') {
              <label>{{ 'auth.gender' | t }}
                <select name="gender" [ngModel]="m().gender" (ngModelChange)="set('gender', $event)">
                  <option [ngValue]="null">{{ 'auth.preferNotToSay' | t }}</option>
                  <option value="MALE">{{ 'gender.MALE' | t }}</option>
                  <option value="FEMALE">{{ 'gender.FEMALE' | t }}</option>
                  <option value="OTHER">{{ 'auth.genderOther' | t }}</option>
                </select>
              </label>
            }

            <div class="grid-2">
              <label>{{ 'auth.password' | t }}
                <span class="password-wrap">
                  <input [type]="showPassword() ? 'text' : 'password'" name="password" [ngModel]="m().password"
                         (ngModelChange)="set('password', $event)" required [maxlength]="passwordMax" autocomplete="new-password"
                         aria-describedby="password-rules" />
                  <button type="button" class="reveal-btn" (click)="showPassword.set(!showPassword())"
                          [attr.aria-label]="(showPassword() ? 'auth.hidePassword' : 'auth.showPassword') | t">
                    <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
                  </button>
                </span>
              </label>
              <label>{{ 'auth.confirmPassword' | t }}
                <input [type]="showPassword() ? 'text' : 'password'" name="confirm" [ngModel]="m().confirm"
                       (ngModelChange)="set('confirm', $event)" required [maxlength]="passwordMax" autocomplete="new-password"
                       #confirmField="ngModel" />
              </label>
            </div>
            @if (confirmField.touched && !matches()) { <p class="field-error">{{ 'auth.passwordMismatch' | t }}</p> }
            <div id="password-rules"><app-password-checklist [check]="check()" /></div>

            @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
            <button class="btn btn-primary block" [disabled]="form.invalid || !check().valid || !matches() || busy()">
              {{ 'auth.createAccount' | t }} <app-icon name="arrow-right" [size]="14" />
            </button>
          </form>
          <p class="muted center">{{ 'auth.haveAccount' | t }} <a routerLink="/signin" [queryParams]="{ role }">{{ 'nav.signin' | t }}</a></p>
        }
      </div>
    </div>
  `
})
export class SignupComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly emailPattern = EMAIL_PATTERN;
  readonly mobilePattern = MOBILE_PATTERN;
  readonly namePattern = NAME_PATTERN;
  readonly passwordMax = PASSWORD_MAX;
  readonly supportEmail = environment.supportEmail;
  role: Role = this.route.snapshot.queryParamMap.get('role') === 'OWNER' ? 'OWNER' : 'CUSTOMER';
  readonly m = signal({ name: '', email: '', phone: '', password: '', confirm: '', gender: null as string | null });
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  /** Set once the account exists and a verification email was sent to this address. */
  readonly sentTo = signal('');
  readonly check = computed(() => checkPassword(this.m().password, [this.m().name, this.m().email]));
  readonly matches = computed(() => this.m().password === this.m().confirm);

  set(field: 'name' | 'email' | 'phone' | 'password' | 'confirm' | 'gender', value: string | null): void {
    this.m.update(model => ({ ...model, [field]: value }));
  }

  submit(): void {
    const { name, email, phone, password, gender } = this.m();
    this.busy.set(true);
    this.error.set('');
    this.api.signup({
      name: name.trim(), email: email.trim(), phone: phone.trim(), password, role: this.role,
      gender: this.role === 'CUSTOMER' ? gender : null
    }).subscribe({
      next: res => {
        this.busy.set(false);
        if (res.verificationRequired) {
          this.sentTo.set(res.email);
        } else {
          void this.router.navigate(['/signin'], { queryParams: { role: this.role, reason: 'signup' } });
        }
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }

  resend(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.resendVerification(this.sentTo()).subscribe({
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
