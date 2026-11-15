import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Role } from '../../core/models';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-box card">
      <h2>{{ 'auth.signinTitle' | t }}</h2>
      @if (info()) { <p class="alert info">{{ info() | t }}</p> }
      <p class="label">{{ 'auth.signinAs' | t }}</p>
      <div class="role-tabs">
        <button type="button" [class.active]="role === 'CUSTOMER'" (click)="role = 'CUSTOMER'">👤 {{ 'auth.customer' | t }}</button>
        <button type="button" [class.active]="role === 'OWNER'" (click)="role = 'OWNER'">🏠 {{ 'auth.owner' | t }}</button>
        <button type="button" [class.active]="role === 'SUPPORT'" (click)="role = 'SUPPORT'">🎧 {{ 'auth.support' | t }}</button>
      </div>
      <form (ngSubmit)="submit()" #form="ngForm">
        <label>{{ 'auth.email' | t }}<input type="email" name="email" [(ngModel)]="email" required email autocomplete="username" /></label>
        <label>{{ 'auth.password' | t }}<input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" /></label>
        @if (error()) { <p class="alert error">{{ error() }}</p> }
        <button class="btn btn-primary block" [disabled]="form.invalid || busy()">{{ 'auth.signinTitle' | t }}</button>
      </form>
      <p class="muted center">{{ 'auth.noAccount' | t }} <a routerLink="/signup" [queryParams]="{ role: role === 'SUPPORT' ? 'CUSTOMER' : role }">{{ 'nav.signup' | t }}</a></p>
      <details class="demo">
        <summary>{{ 'auth.demo' | t }}</summary>
        <button type="button" class="link" (click)="demo('customer@pgstay.in', 'CUSTOMER')">customer&#64;pgstay.in</button>
        <button type="button" class="link" (click)="demo('owner@pgstay.in', 'OWNER')">owner&#64;pgstay.in</button>
        <button type="button" class="link" (click)="demo('support@pgstay.in', 'SUPPORT')">support&#64;pgstay.in</button>
      </details>
    </div>
  `
})
export class SigninComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  role: Role = (this.route.snapshot.queryParamMap.get('role') as Role) || 'CUSTOMER';
  email = '';
  password = '';
  busy = signal(false);
  error = signal('');
  info = signal(this.route.snapshot.queryParamMap.get('reason') === 'login' ? 'auth.loginRequired'
    : this.route.snapshot.queryParamMap.get('reason') === 'signup' ? 'auth.signupDone' : '');

  demo(email: string, role: Role): void {
    this.email = email;
    this.password = 'Password@123';
    this.role = role;
  }

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.signin({ email: this.email, password: this.password, role: this.role }).subscribe({
      next: res => {
        this.auth.setSession(res);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const allowed = returnUrl && !(returnUrl.includes('/book') && res.user.role !== 'CUSTOMER');
        this.router.navigateByUrl(allowed ? returnUrl : this.auth.homeRoute());
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }
}
