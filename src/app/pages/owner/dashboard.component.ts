import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Bed, Booking, OwnerDashboard, Payment, PgDetail, PgStats } from '../../core/models';

type Tab = 'availability' | 'approvals' | 'rents' | 'bookings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="row-between">
      <h1>{{ 'dash.title' | t }}</h1>
      <a routerLink="/owner/register-pg" class="btn btn-primary btn-sm">+ {{ 'nav.registerPg' | t }}</a>
    </div>
    @if (msg()) { <p class="alert info">{{ msg() }}</p> }
    @if (dash(); as d) {
      @if (!d.pgs.length) {
        <p class="empty">{{ 'dash.noPgs' | t }} <a routerLink="/owner/register-pg">{{ 'nav.registerPg' | t }}</a></p>
      } @else {
        <div class="pg-tabs">
          <button [class.active]="pgId() === null" (click)="selectPg(null)">{{ 'dash.allPgs' | t }} ({{ d.pgs.length }})</button>
          @for (p of d.pgs; track p.pgId) {
            <button [class.active]="pgId() === p.pgId" (click)="selectPg(p.pgId)">{{ p.pgName }}
              @if (p.pendingApprovals + p.pendingPaymentConfirmations > 0) { <span class="badge">{{ p.pendingApprovals + p.pendingPaymentConfirmations }}</span> }
            </button>
          }
        </div>

        @if (stats(); as s) {
          <div class="stats">
            <div class="stat"><span>{{ 'dash.totalBeds' | t }}</span><b>{{ s.totalBeds }}</b></div>
            <div class="stat green"><span>{{ 'bed.AVAILABLE' | t }}</span><b>{{ s.availableBeds }}</b></div>
            <div class="stat amber"><span>{{ 'bed.BLOCKED' | t }}</span><b>{{ s.blockedBeds }}</b></div>
            <div class="stat red"><span>{{ 'bed.BOOKED' | t }}</span><b>{{ s.bookedBeds }}</b></div>
            <div class="stat"><span>{{ 'dash.occupancy' | t }}</span><b>{{ s.occupancyPercent }}%</b></div>
            <div class="stat blue"><span>{{ 'dash.pendingApprovals' | t }}</span><b>{{ s.pendingApprovals }}</b></div>
            <div class="stat blue"><span>{{ 'dash.paymentConfirmations' | t }}</span><b>{{ s.pendingPaymentConfirmations }}</b></div>
            <div class="stat"><span>{{ 'dash.pendingRent' | t }}</span><b>₹{{ s.pendingRentAmount | number }}</b></div>
            <div class="stat red"><span>{{ 'dash.overdue' | t }}</span><b>{{ s.overdueCount }}</b></div>
          </div>
        }

        <div class="tabs">
          <button [class.active]="tab() === 'availability'" (click)="tab.set('availability')">{{ 'dash.availability' | t }}</button>
          <button [class.active]="tab() === 'approvals'" (click)="tab.set('approvals')">{{ 'dash.approvals' | t }} ({{ requests().length + submitted().length }})</button>
          <button [class.active]="tab() === 'rents'" (click)="tab.set('rents')">{{ 'dash.rents' | t }} ({{ pendingRents().length }})</button>
          <button [class.active]="tab() === 'bookings'" (click)="tab.set('bookings')">{{ 'rents.tabBookings' | t }}</button>
        </div>

        @switch (tab()) {
          @case ('availability') {
            @if (pgId() === null) {
              <div class="card table-wrap">
                <table>
                  <thead><tr><th>PG</th><th>{{ 'dash.totalBeds' | t }}</th><th>{{ 'bed.AVAILABLE' | t }}</th><th>{{ 'bed.BLOCKED' | t }}</th><th>{{ 'bed.BOOKED' | t }}</th><th>{{ 'bed.UNAVAILABLE' | t }}</th><th>{{ 'dash.occupancy' | t }}</th></tr></thead>
                  <tbody>
                    @for (p of d.pgs; track p.pgId) {
                      <tr class="clickable" (click)="selectPg(p.pgId)"><td><b>{{ p.pgName }}</b><br /><small class="muted">{{ p.area }}, {{ p.city }}</small></td>
                        <td>{{ p.totalBeds }}</td><td>{{ p.availableBeds }}</td><td>{{ p.blockedBeds }}</td><td>{{ p.bookedBeds }}</td><td>{{ p.unavailableBeds }}</td>
                        <td><div class="bar"><i [style.width.%]="p.occupancyPercent"></i></div>{{ p.occupancyPercent }}%</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              @if (pg(); as p) {
              <div class="legend">
                @for (st of ['AVAILABLE', 'BLOCKED', 'BOOKED', 'UNAVAILABLE']; track st) { <span><i class="bed-dot {{ st.toLowerCase() }}"></i>{{ 'bed.' + st | t }}</span> }
                <a class="btn btn-outline btn-sm" [routerLink]="['/owner/pgs', p.id, 'edit']">✎ Edit PG</a>
              </div>
              <p class="muted small">{{ 'owner.bedsHint' | t }}</p>
              @for (fl of p.floors; track fl.floorNumber) {
                <section class="floor card">
                  <h3>{{ fl.floorNumber === 0 ? ('common.ground' | t) : ('common.floor' | t) + ' ' + fl.floorNumber }}</h3>
                  <div class="rooms">
                    @for (r of fl.rooms; track r.id) {
                      <div class="room">
                        <div class="room-head"><b>{{ r.roomNumber }}</b><span>{{ 'common.sharing' | t: { n: r.sharingType } }} · ₹{{ r.monthlyRent | number }}</span></div>
                        <div class="beds">
                          @for (b of r.beds; track b.id) {
                            <button class="bed {{ b.status.toLowerCase() }}" (click)="toggleBed(b)" [disabled]="b.status === 'BOOKED' || b.status === 'BLOCKED'" [title]="'bed.' + b.status | t">🛏 {{ b.bedLabel }}</button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </section>
              }
              }
            }
          }
          @case ('approvals') {
            <h3>{{ 'dash.pendingApprovals' | t }}</h3>
            @for (b of requests(); track b.id) {
              <div class="card pad list-item">
                <div class="row-between">
                  <div>
                    <b>{{ b.pgName }}</b> · {{ 'common.room' | t }} {{ b.roomNumber }} · {{ 'common.bed' | t }} {{ b.bedLabel }} ({{ 'common.sharing' | t: { n: b.sharingType } }})
                    <p>{{ 'bookingType.' + b.bookingType | t }} × {{ b.duration }} · {{ b.startDate | date: 'mediumDate' }} → {{ b.endDate | date: 'mediumDate' }} · ₹{{ b.totalAmount | number }}
                      @if (b.paymentPlan === 'MONTHLY') { <small class="muted">(monthly)</small> }</p>
                    <p class="customer">👤 {{ b.customer.name }} · 📞 <a [href]="'tel:' + b.customer.phone">{{ b.customer.phone }}</a> · ✉️ {{ b.customer.email }} @if (b.customer.gender) { · {{ b.customer.gender }} }</p>
                    @if (b.customerNote) { <p class="muted small">💬 {{ b.customerNote }}</p> }
                    <small class="muted">{{ b.createdAt | date: 'medium' }}</small>
                  </div>
                  <div class="right">
                    <button class="btn btn-primary btn-sm" (click)="approve(b)">{{ 'dash.approve' | t }}</button>
                    <button class="btn btn-ghost btn-sm" (click)="reject(b)">{{ 'dash.reject' | t }}</button>
                  </div>
                </div>
              </div>
            } @empty { <p class="empty">{{ 'rents.empty' | t }}</p> }
            <h3>{{ 'dash.paymentConfirmations' | t }}</h3>
            @for (p of submitted(); track p.id) {
              <div class="card pad list-item">
                <div class="row-between">
                  <div>
                    <b>{{ p.pgName }}</b> · {{ p.roomNumber }}-{{ p.bedLabel }} · {{ 'rents.installment' | t: { n: p.installmentNo, t: p.totalInstallments } }}
                    <p>👤 {{ p.customer.name }} · 📞 {{ p.customer.phone }} · {{ p.paymentMethod }} @if (p.transactionRef) { · Ref {{ p.transactionRef }} }</p>
                    <small class="muted">{{ p.periodStart | date: 'mediumDate' }} – {{ p.periodEnd | date: 'mediumDate' }} · {{ p.submittedAt | date: 'medium' }}</small>
                  </div>
                  <div class="right">
                    <p class="price">₹{{ p.amount | number }}</p>
                    <button class="btn btn-primary btn-sm" (click)="confirm(p)">{{ 'dash.accept' | t }}</button>
                    <button class="btn btn-ghost btn-sm" (click)="rejectPayment(p)">{{ 'dash.reject' | t }}</button>
                  </div>
                </div>
              </div>
            } @empty { <p class="empty">{{ 'rents.empty' | t }}</p> }
          }
          @case ('rents') {
            <div class="card table-wrap">
              <table>
                <thead><tr><th>PG</th><th>{{ 'dash.customer' | t }}</th><th>{{ 'common.room' | t }}</th><th>{{ 'rents.period' | t }}</th><th>{{ 'rents.due' | t }}</th><th>{{ 'common.amount' | t }}</th><th>{{ 'common.status' | t }}</th></tr></thead>
                <tbody>
                  @for (p of pendingRents(); track p.id) {
                    <tr [class.overdue]="p.overdue"><td>{{ p.pgName }}</td><td>{{ p.customer.name }}<br /><small>📞 {{ p.customer.phone }}</small></td>
                      <td>{{ p.roomNumber }}-{{ p.bedLabel }}</td><td>{{ p.installmentNo }}/{{ p.totalInstallments }} · {{ p.periodStart | date: 'MMM d' }} – {{ p.periodEnd | date: 'MMM d, y' }}</td>
                      <td>{{ p.dueDate | date: 'mediumDate' }} @if (p.overdue) { <span class="status s-rejected">{{ 'rents.overdue' | t }}</span> }</td>
                      <td>₹{{ p.amount | number }}</td><td>{{ 'pay.' + p.status | t }}</td></tr>
                  } @empty { <tr><td colspan="7" class="empty">{{ 'rents.empty' | t }}</td></tr> }
                </tbody>
              </table>
            </div>
          }
          @case ('bookings') {
            <div class="card table-wrap">
              <table>
                <thead><tr><th>PG</th><th>{{ 'dash.customer' | t }}</th><th>{{ 'common.room' | t }}</th><th>{{ 'booking.type' | t }}</th><th>{{ 'booking.startDate' | t }}</th><th>{{ 'common.amount' | t }}</th><th>{{ 'common.status' | t }}</th></tr></thead>
                <tbody>
                  @for (b of bookings(); track b.id) {
                    <tr><td>{{ b.pgName }}</td><td>{{ b.customer.name }}<br /><small>📞 {{ b.customer.phone }}</small></td><td>{{ b.roomNumber }}-{{ b.bedLabel }}</td>
                      <td>{{ 'bookingType.' + b.bookingType | t }} × {{ b.duration }}</td><td>{{ b.startDate | date: 'mediumDate' }}</td><td>₹{{ b.totalAmount | number }}</td>
                      <td><span class="status s-{{ b.status.toLowerCase() }}">{{ b.status }}</span> @if (b.totalInstallments) { <small>{{ b.paidInstallments }}/{{ b.totalInstallments }}</small> }</td></tr>
                  } @empty { <tr><td colspan="7" class="empty">{{ 'rents.empty' | t }}</td></tr> }
                </tbody>
              </table>
            </div>
          }
        }
      }
    } @else { <p class="muted">{{ 'common.loading' | t }}</p> }
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  dash = signal<OwnerDashboard | null>(null);
  pgId = signal<number | null>(null);
  pg = signal<PgDetail | null>(null);
  tab = signal<Tab>('availability');
  bookings = signal<Booking[]>([]);
  payments = signal<Payment[]>([]);
  msg = signal('');

  stats = computed<PgStats | null>(() => {
    const d = this.dash();
    if (!d) {
      return null;
    }
    return this.pgId() === null ? d.totals : d.pgs.find(p => p.pgId === this.pgId()) ?? d.totals;
  });
  requests = computed(() => this.bookings().filter(b => b.status === 'REQUESTED'));
  submitted = computed(() => this.payments().filter(p => p.status === 'SUBMITTED'));
  /** Overdue rents plus everything due in the next 30 days. */
  pendingRents = computed(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const max = limit.toISOString().slice(0, 10);
    return this.payments().filter(p => (p.bookingStatus === 'APPROVED' || p.bookingStatus === 'BOOKED') && (p.overdue || p.dueDate <= max));
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('saved')) {
      this.msg.set('PG saved successfully.');
    }
    const pg = q.get('pg');
    this.selectPg(pg ? +pg : null);
    if (q.get('tab')) {
      this.tab.set(q.get('tab') as Tab);
    }
  }

  selectPg(id: number | null): void {
    this.pgId.set(id);
    this.pg.set(null);
    if (id !== null) {
      this.api.ownerPg(id).subscribe(p => this.pg.set(p));
    }
    this.reload();
  }

  reload(): void {
    const id = this.pgId();
    forkJoin({
      dash: this.api.dashboard(),
      bookings: this.api.ownerBookings(undefined, id),
      payments: this.api.ownerPayments(['DUE', 'SUBMITTED'], id)
    }).subscribe(({ dash, bookings, payments }) => {
      this.dash.set(dash);
      this.bookings.set(bookings);
      this.payments.set(payments);
      if (this.tab() === 'availability' && id === null && (dash.totals.pendingApprovals || dash.totals.pendingPaymentConfirmations) && !this.msg()) {
        this.msg.set(`You have ${dash.totals.pendingApprovals} booking request(s) and ${dash.totals.pendingPaymentConfirmations} payment(s) waiting in Approvals.`);
      }
    });
  }

  private done = (text: string) => ({
    next: () => {
      this.msg.set(text);
      this.reload();
      if (this.pgId() !== null) {
        this.api.ownerPg(this.pgId()!).subscribe(p => this.pg.set(p));
      }
    },
    error: (err: unknown) => this.msg.set(errorMessage(err))
  });

  approve(b: Booking): void {
    const note = prompt('Message to the customer (optional)', 'Welcome! Please pay the first rent to confirm.') ?? undefined;
    this.api.approveBooking(b.id, note).subscribe(this.done(`Booking approved. ${b.customer.name} can now pay the rent.`));
  }

  reject(b: Booking): void {
    const note = prompt('Reason for rejecting (optional)');
    if (note === null) {
      return;
    }
    this.api.rejectBooking(b.id, note).subscribe(this.done('Booking rejected and the bed is available again.'));
  }

  confirm(p: Payment): void {
    this.api.confirmPayment(p.id).subscribe(this.done('Payment accepted. Invoice sent to the customer.'));
  }

  rejectPayment(p: Payment): void {
    const note = prompt('Why is the payment not accepted?', 'Payment not received');
    if (note === null) {
      return;
    }
    this.api.rejectPayment(p.id, note).subscribe(this.done('Payment marked as not received.'));
  }

  toggleBed(b: Bed): void {
    const status = b.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    this.api.setBedStatus(b.id, status).subscribe({
      next: p => {
        this.pg.set(p);
        this.reload();
      },
      error: err => this.msg.set(errorMessage(err))
    });
  }
}
