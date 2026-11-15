import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Role } from '../../core/models';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-box card">
      <h2>{{ 'auth.signupTitle' | t }}</h2>
      <p class="label">{{ 'auth.signupAs' | t }}</p>
      <div class="role-tabs">
        <button type="button" [class.active]="role === 'CUSTOMER'" (click)="role = 'CUSTOMER'">👤 {{ 'auth.customer' | t }}</button>
        <button type="button" [class.active]="role === 'OWNER'" (click)="role = 'OWNER'">🏠 {{ 'auth.owner' | t }}</button>
      </div>
      <form (ngSubmit)="submit()" #form="ngForm">
        <label>{{ 'auth.name' | t }}<input name="name" [(ngModel)]="m.name" required maxlength="100" /></label>
        <label>{{ 'auth.email' | t }}<input type="email" name="email" [(ngModel)]="m.email" required email /></label>
        <label>{{ 'auth.phone' | t }}<input type="tel" name="phone" [(ngModel)]="m.phone" required pattern="^[0-9+ -]{10,15}$" /></label>
        @if (role === 'CUSTOMER') {
          <label>{{ 'auth.gender' | t }}
            <select name="gender" [(ngModel)]="m.gender">
              <option [ngValue]="null">-</option>
              <option value="MALE">{{ 'gender.MALE' | t }}</option>
              <option value="FEMALE">{{ 'gender.FEMALE' | t }}</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        }
        <label>{{ 'auth.password' | t }}<input type="password" name="password" [(ngModel)]="m.password" required minlength="6" autocomplete="new-password" /></label>
        @if (error()) { <p class="alert error">{{ error() }}</p> }
        <button class="btn btn-primary block" [disabled]="form.invalid || busy()">{{ 'nav.signup' | t }}</button>
      </form>
      <p class="muted center">{{ 'auth.haveAccount' | t }} <a routerLink="/signin" [queryParams]="{ role }">{{ 'nav.signin' | t }}</a></p>
    </div>
  `
})
export class SignupComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  role: Role = this.route.snapshot.queryParamMap.get('role') === 'OWNER' ? 'OWNER' : 'CUSTOMER';
  m = { name: '', email: '', phone: '', password: '', gender: null as string | null };
  busy = signal(false);
  error = signal('');

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.signup({ ...this.m, role: this.role, gender: this.role === 'CUSTOMER' ? this.m.gender : null }).subscribe({
      next: () => this.router.navigate(['/signin'], { queryParams: { role: this.role, reason: 'signup' } }),
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }
}
