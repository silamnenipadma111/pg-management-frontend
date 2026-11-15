import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Booking, Payment } from '../../core/models';

@Component({
  selector: 'app-my-rents',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <h1>{{ 'nav.myRents' | t }}</h1>
    <div class="tabs">
      <button [class.active]="tab() === 'bookings'" (click)="tab.set('bookings')">{{ 'rents.tabBookings' | t }} ({{ bookings().length }})</button>
      <button [class.active]="tab() === 'upcoming'" (click)="tab.set('upcoming')">{{ 'rents.tabUpcoming' | t }} ({{ upcoming().length }})</button>
      <button [class.active]="tab() === 'history'" (click)="tab.set('history')">{{ 'rents.tabHistory' | t }} ({{ history().length }})</button>
    </div>
    @if (msg()) { <p class="alert info">{{ msg() }}</p> }

    @switch (tab()) {
      @case ('bookings') {
        @for (b of bookings(); track b.id) {
          <div class="card pad list-item">
            <div class="row-between">
              <div>
                <h3><a [routerLink]="['/pgs', b.pgId]">{{ b.pgName }}</a></h3>
                <p class="muted">{{ b.pgArea }}, {{ b.pgCity }} · {{ 'common.room' | t }} {{ b.roomNumber }} · {{ 'common.bed' | t }} {{ b.bedLabel }} · {{ 'common.sharing' | t: { n: b.sharingType } }}</p>
                <p>{{ 'bookingType.' + b.bookingType | t }} × {{ b.duration }} · {{ b.startDate | date: 'mediumDate' }} → {{ b.endDate | date: 'mediumDate' }} · ₹{{ b.totalAmount | number }}</p>
                @if (b.totalInstallments) { <p class="muted small">{{ b.paidInstallments }}/{{ b.totalInstallments }} {{ 'pay.PAID' | t }}</p> }
                @if (b.ownerNote) { <p class="muted small">💬 {{ b.ownerNote }}</p> }
              </div>
              <div class="right">
                <span class="status s-{{ b.status.toLowerCase() }}">{{ 'status.' + b.status | t }}</span>
                @if (b.status === 'REQUESTED' || b.status === 'APPROVED') {
                  <button class="btn btn-ghost btn-sm" (click)="cancel(b)">{{ 'rents.cancel' | t }}</button>
                }
                @if (b.status === 'APPROVED') {
                  <button class="btn btn-primary btn-sm" (click)="tab.set('upcoming')">{{ 'rents.payNow' | t }}</button>
                }
              </div>
            </div>
          </div>
        } @empty { <p class="empty">{{ 'rents.empty' | t }}</p> }
      }
      @case ('upcoming') {
        @for (p of upcoming(); track p.id) {
          <div class="card pad list-item" [class.overdue]="p.overdue">
            <div class="row-between">
              <div>
                <h3>{{ p.pgName }} · {{ 'common.room' | t }} {{ p.roomNumber }}-{{ p.bedLabel }}</h3>
                <p class="muted">{{ 'rents.installment' | t: { n: p.installmentNo, t: p.totalInstallments } }} · {{ 'rents.period' | t }}: {{ p.periodStart | date: 'mediumDate' }} – {{ p.periodEnd | date: 'mediumDate' }}</p>
                <p>{{ 'rents.due' | t }}: <b>{{ p.dueDate | date: 'mediumDate' }}</b> @if (p.overdue) { <span class="status s-rejected">{{ 'rents.overdue' | t }}</span> }</p>
                @if (p.ownerNote) { <p class="muted small">💬 {{ p.ownerNote }}</p> }
              </div>
              <div class="right">
                <p class="price">₹{{ p.amount | number }}</p>
                @if (p.status === 'DUE') {
                  @if (paying()?.id === p.id) {
                    <div class="pay-form">
                      <select [(ngModel)]="method">
                        <option value="UPI">UPI</option><option value="CARD">Card</option><option value="NET_BANKING">Net banking</option><option value="CASH">Cash</option>
                      </select>
                      <input [(ngModel)]="txn" [placeholder]="'rents.txn' | t" />
                      <button class="btn btn-primary btn-sm" (click)="pay(p)" [disabled]="busy()">{{ 'common.submit' | t }}</button>
                      <button class="btn btn-ghost btn-sm" (click)="paying.set(null)">{{ 'common.cancel' | t }}</button>
                    </div>
                  } @else {
                    <button class="btn btn-primary btn-sm" (click)="paying.set(p)">{{ 'rents.payNow' | t }}</button>
                  }
                } @else {
                  <span class="status s-requested">{{ 'pay.' + p.status | t }}</span>
                }
              </div>
            </div>
          </div>
        } @empty { <p class="empty">{{ 'rents.empty' | t }}</p> }
      }
      @case ('history') {
        <div class="card table-wrap">
          <table>
            <thead><tr><th>{{ 'rents.invoice' | t }}</th><th>PG</th><th>{{ 'rents.period' | t }}</th><th>{{ 'common.amount' | t }}</th><th>{{ 'rents.method' | t }}</th><th>{{ 'rents.paidOn' | t }}</th><th></th></tr></thead>
            <tbody>
              @for (p of history(); track p.id) {
                <tr><td>{{ p.invoiceNumber }}</td><td>{{ p.pgName }} ({{ p.roomNumber }}-{{ p.bedLabel }})</td>
                  <td>{{ p.periodStart | date: 'mediumDate' }} – {{ p.periodEnd | date: 'mediumDate' }}</td><td>₹{{ p.amount | number }}</td>
                  <td>{{ p.paymentMethod }}</td><td>{{ p.paidAt | date: 'medium' }}</td>
                  <td><a class="btn btn-outline btn-sm" [routerLink]="['/invoice', p.id]">{{ 'rents.invoice' | t }}</a></td></tr>
              } @empty { <tr><td colspan="7" class="empty">{{ 'rents.empty' | t }}</td></tr> }
            </tbody>
          </table>
        </div>
      }
    }
  `
})
export class MyRentsComponent implements OnInit {
  private api = inject(ApiService);
  tab = signal<'bookings' | 'upcoming' | 'history'>('bookings');
  bookings = signal<Booking[]>([]);
  upcoming = signal<Payment[]>([]);
  history = signal<Payment[]>([]);
  paying = signal<Payment | null>(null);
  busy = signal(false);
  msg = signal('');
  method = 'UPI';
  txn = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.myBookings().subscribe(b => this.bookings.set(b));
    this.api.myPayments('upcoming').subscribe(p => this.upcoming.set(p));
    this.api.myPayments('history').subscribe(p => this.history.set(p));
  }

  pay(p: Payment): void {
    this.busy.set(true);
    this.api.pay(p.id, this.method, this.txn || undefined).subscribe({
      next: () => {
        this.msg.set('Payment submitted. The owner will accept it and your invoice will appear in Payment history.');
        this.paying.set(null);
        this.txn = '';
        this.busy.set(false);
        this.load();
      },
      error: err => {
        this.msg.set(errorMessage(err));
        this.busy.set(false);
      }
    });
  }

  cancel(b: Booking): void {
    if (!confirm('Cancel this booking request?')) {
      return;
    }
    this.api.cancelBooking(b.id).subscribe({ next: () => this.load(), error: err => this.msg.set(errorMessage(err)) });
  }
}
