import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-customer-care',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <h1>{{ 'care.title' | t }}</h1>
    <div class="two-col">
      <div class="card pad">
        <h3>📞 {{ 'care.callUs' | t }}</h3>
        <p class="big"><a [href]="'tel:' + phone">{{ phone }}</a></p>
        <p class="muted">{{ 'care.hours' | t }}</p>
        <p>✉️ <a [href]="'mailto:' + email">{{ email }}</a></p>
        <p class="alert info">{{ 'care.registerHelp' | t }}</p>
      </div>
      <form class="card pad" (ngSubmit)="submit()" #form="ngForm">
        <h3>{{ 'care.callback' | t }}</h3>
        @if (sent()) { <p class="alert success">{{ 'care.sent' | t }}</p> }
        <label>{{ 'care.type' | t }}
          <select name="type" [(ngModel)]="m.requestType">
            <option value="CALLBACK">{{ 'care.CALLBACK' | t }}</option>
            <option value="REGISTER_PG">{{ 'care.REGISTER_PG' | t }}</option>
            <option value="GENERAL">{{ 'care.GENERAL' | t }}</option>
          </select>
        </label>
        <label>{{ 'auth.name' | t }}<input name="name" [(ngModel)]="m.name" required /></label>
        <label>{{ 'auth.phone' | t }}<input name="phone" [(ngModel)]="m.phone" required pattern="^[0-9+ -]{10,15}$" /></label>
        <label>{{ 'auth.email' | t }}<input type="email" name="email" [(ngModel)]="m.email" email /></label>
        <label>{{ 'care.message' | t }}<textarea name="message" [(ngModel)]="m.message" rows="3" maxlength="2000"></textarea></label>
        @if (error()) { <p class="alert error">{{ error() }}</p> }
        <button class="btn btn-primary block" [disabled]="form.invalid || busy()">{{ 'common.submit' | t }}</button>
      </form>
    </div>
  `
})
export class CustomerCareComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  phone = environment.supportPhone;
  email = environment.supportEmail;
  m = {
    requestType: this.auth.role() === 'OWNER' ? 'REGISTER_PG' : 'CALLBACK',
    name: this.auth.user()?.name ?? '', phone: this.auth.user()?.phone ?? '', email: this.auth.user()?.email ?? '', message: ''
  };
  busy = signal(false);
  sent = signal(false);
  error = signal('');

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.createSupportRequest({ ...this.m, email: this.m.email || undefined }).subscribe({
      next: () => {
        this.sent.set(true);
        this.busy.set(false);
        this.m.message = '';
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }
}
