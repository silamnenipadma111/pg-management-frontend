import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { PgRequest, SupportRequest } from '../../core/models';
import { PgFormComponent } from '../../shared/pg-form.component';

/** Customer-care console: callback requests + registering a PG for an owner who called in. */
@Component({
  selector: 'app-support',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, TranslatePipe, PgFormComponent],
  template: `
    <h1>{{ 'support.title' | t }}</h1>
    <div class="tabs">
      <button [class.active]="tab() === 'requests'" (click)="tab.set('requests')">{{ 'support.requests' | t }} ({{ openCount() }})</button>
      <button [class.active]="tab() === 'register'" (click)="startRegister(null)">{{ 'support.registerForOwner' | t }}</button>
    </div>
    @if (tab() === 'requests') {
      <div class="card table-wrap">
        <table>
          <thead><tr><th>#</th><th>{{ 'care.type' | t }}</th><th>{{ 'auth.name' | t }}</th><th>{{ 'auth.phone' | t }}</th><th>{{ 'care.message' | t }}</th><th>{{ 'common.status' | t }}</th><th></th></tr></thead>
          <tbody>
            @for (r of requests(); track r.id) {
              <tr [class.muted]="r.status === 'RESOLVED'">
                <td>{{ r.id }}<br /><small>{{ r.createdAt | date: 'short' }}</small></td><td>{{ 'care.' + r.requestType | t }}</td>
                <td>{{ r.name }}<br /><small>{{ r.email }}</small></td><td><a [href]="'tel:' + r.phone">{{ r.phone }}</a></td>
                <td class="pre">{{ r.message }}</td><td>{{ r.status }}</td>
                <td>
                  @if (r.status === 'OPEN') {
                    @if (r.requestType === 'REGISTER_PG') { <button class="btn btn-primary btn-sm" (click)="startRegister(r)">{{ 'support.registerForOwner' | t }}</button> }
                    <button class="btn btn-ghost btn-sm" (click)="resolve(r)">{{ 'support.resolve' | t }}</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">{{ 'rents.empty' | t }}</td></tr> }
          </tbody>
        </table>
      </div>
    } @else {
      @if (result(); as res) {
        <div class="alert success">
          <p>{{ 'support.created' | t: { email: res.ownerEmail } }} — <a [routerLink]="['/pgs', res.pgId]">{{ res.pgName }}</a></p>
          @if (res.temporaryPassword) { <p>{{ 'support.tempPassword' | t }}: <code>{{ res.temporaryPassword }}</code></p> }
          <button class="btn btn-outline btn-sm" (click)="startRegister(null)">+ {{ 'support.registerForOwner' | t }}</button>
        </div>
      } @else {
        <section class="card pad">
          <h3>{{ 'support.ownerDetails' | t }} *</h3>
          <div class="grid-3">
            <label>{{ 'auth.name' | t }} *<input [(ngModel)]="owner.ownerName" required /></label>
            <label>{{ 'auth.email' | t }} *<input type="email" [(ngModel)]="owner.ownerEmail" required /></label>
            <label>{{ 'auth.phone' | t }} *<input [(ngModel)]="owner.ownerPhone" required /></label>
          </div>
          @if (linked()) { <p class="muted small">Linked to support request #{{ linked()!.id }}</p> }
        </section>
        <app-pg-form [busy]="busy()" (submitted)="register($event)" submitLabel="support.registerForOwner" />
      }
    }
  `
})
export class SupportComponent implements OnInit {
  private api = inject(ApiService);
  form = viewChild(PgFormComponent);
  tab = signal<'requests' | 'register'>('requests');
  requests = signal<SupportRequest[]>([]);
  openCount = signal(0);
  linked = signal<SupportRequest | null>(null);
  busy = signal(false);
  result = signal<{ ownerEmail: string; temporaryPassword?: string; pgId: number; pgName: string } | null>(null);
  owner = { ownerName: '', ownerEmail: '', ownerPhone: '' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.supportRequests().subscribe(list => {
      this.requests.set(list);
      this.openCount.set(list.filter(r => r.status === 'OPEN').length);
    });
  }

  startRegister(r: SupportRequest | null): void {
    this.result.set(null);
    this.linked.set(r);
    this.owner = { ownerName: r?.name ?? '', ownerEmail: r?.email ?? '', ownerPhone: r?.phone ?? '' };
    this.tab.set('register');
  }

  resolve(r: SupportRequest): void {
    this.api.resolveSupportRequest(r.id).subscribe(() => this.load());
  }

  register(pg: PgRequest): void {
    if (!this.owner.ownerName || !this.owner.ownerEmail || !this.owner.ownerPhone) {
      this.form()?.setError('Please fill in the owner details.');
      return;
    }
    this.busy.set(true);
    this.api.registerPgForOwner({ ...this.owner, supportRequestId: this.linked()?.id ?? null, pg }).subscribe({
      next: res => {
        this.busy.set(false);
        this.result.set({ ownerEmail: res.ownerEmail, temporaryPassword: res.temporaryPassword, pgId: res.pg.id, pgName: res.pg.name });
        this.load();
      },
      error: err => {
        this.busy.set(false);
        this.form()?.setError(errorMessage(err));
      }
    });
  }
}
