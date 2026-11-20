import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { Booking, Payment } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { DashLayoutComponent, DashTab } from '../../shared/dash-layout.component';
import { IconComponent } from '../../shared/icon.component';
import { PaymentDialogComponent } from '../../shared/payment-dialog.component';

type Tab = 'bookings' | 'upcoming' | 'history';
const TABS: Tab[] = ['bookings', 'upcoming', 'history'];
const DAY_MS = 86_400_000;

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(isoDate + 'T00:00:00').getTime() - today.getTime()) / DAY_MS);
}

@Component({
  selector: 'app-my-rents',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, DatePipe, RouterLink, PaymentDialogComponent, DashLayoutComponent, IconComponent],
  template: `
    <app-dash-layout [badge]="'role.CUSTOMER' | t" [name]="auth.user()?.name ?? ''" [sub]="auth.user()?.email ?? ''"
                     [tabs]="tabs()" [active]="tab()" (tabChange)="setTab($event)">
      <section class="card greeting">
        <div>
          <p class="eyebrow">{{ 'nav.myRents' | t }}</p>
          <h1 class="display">{{ 'rents.greeting' | t: { name: firstName() } }}</h1>
          <p class="muted">{{ 'rents.subtitle' | t }}</p>
        </div>
        <a routerLink="/" class="btn btn-primary">{{ 'footer.findPg' | t }} <app-icon name="arrow-right" [size]="14" /></a>
      </section>

      <div class="kpi-grid">
        <div class="card kpi">
          <span class="medallion"><app-icon name="home" [size]="18" /></span>
          <p class="kpi-label">{{ 'rents.kpiActive' | t }}</p>
          <p class="kpi-value">{{ activeStays() }}</p>
          <p class="kpi-sub">{{ 'rents.kpiActiveSub' | t: { n: waiting() } }}</p>
        </div>
        <div class="card kpi">
          <span class="medallion"><app-icon name="calendar" [size]="18" /></span>
          <p class="kpi-label">{{ 'rents.kpiNext' | t }}</p>
          @if (nextDue(); as next) {
            <p class="kpi-value">₹{{ next.amount | number }}</p>
            <p class="kpi-sub" [class.late]="next.overdue">{{ dueText(next) }}</p>
          } @else {
            <p class="kpi-value">—</p>
            <p class="kpi-sub">{{ 'rents.noDues' | t }}</p>
          }
        </div>
        <div class="card kpi">
          <span class="medallion"><app-icon name="receipt" [size]="18" /></span>
          <p class="kpi-label">{{ 'rents.kpiPaid' | t }}</p>
          <p class="kpi-value">₹{{ totalPaid() | number }}</p>
          <p class="kpi-sub">{{ 'rents.kpiPaidSub' | t: { n: history().length } }}</p>
        </div>
      </div>

      @switch (tab()) {
        @case ('bookings') {
          @for (b of bookings(); track b.id) {
            <article class="card stay">
              <div class="stay-main">
                <div class="stay-head">
                  <h2 class="display"><a [routerLink]="['/pgs', b.pgId]">{{ b.pgName }}</a></h2>
                  <span class="status-pill" [attr.data-status]="b.status">{{ 'status.' + b.status | t }}</span>
                </div>
                <p class="muted"><app-icon name="map-pin" [size]="14" /> {{ b.pgArea }}, {{ b.pgCity }} ·
                  {{ 'common.room' | t }} {{ b.roomNumber }} · {{ 'common.bed' | t }} {{ b.bedLabel }} ·
                  {{ 'common.sharing' | t: { n: b.sharingType } }}</p>
                <p>{{ 'bookingType.' + b.bookingType | t }} × {{ b.duration }} ·
                  {{ b.startDate | date: 'd MMM y' }} – {{ b.endDate | date: 'd MMM y' }} · <b>₹{{ b.totalAmount | number }}</b></p>
                @if (b.totalInstallments) {
                  <div class="meter-line">
                    <div class="meter" role="img"
                         [attr.aria-label]="('rents.paidOf' | t: { n: b.paidInstallments, t: b.totalInstallments })">
                      <i [style.width.%]="(100 * b.paidInstallments) / b.totalInstallments"></i>
                    </div>
                    <small class="muted">{{ 'rents.paidOf' | t: { n: b.paidInstallments, t: b.totalInstallments } }}</small>
                  </div>
                }
                @if (b.ownerNote) { <p class="note"><app-icon name="chat" [size]="14" /> {{ b.ownerNote }}</p> }
              </div>
              <div class="stay-actions">
                @if (b.status === 'APPROVED' && nextFor(b.id); as next) {
                  @if (next.status === 'DUE') {
                    <button type="button" class="btn btn-primary btn-sm" (click)="paying.set(next)">
                      {{ 'rents.payNow' | t }} ₹{{ next.amount | number }}
                    </button>
                  } @else {
                    <span class="status-pill" data-status="SUBMITTED">{{ 'pay.SUBMITTED' | t }}</span>
                  }
                }
                @if (b.status === 'REQUESTED' || b.status === 'APPROVED') {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="cancel(b)">{{ 'rents.cancel' | t }}</button>
                }
                @if (b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'REJECTED') {
                  <a class="btn btn-outline btn-sm" [routerLink]="['/pgs', b.pgId, 'book']">{{ 'rents.bookAgain' | t }}</a>
                }
              </div>
            </article>
          } @empty {
            <div class="card empty-state">
              <span class="medallion medallion-lg"><app-icon name="bed" [size]="26" [stroke]="1.5" /></span>
              <p>{{ 'rents.empty' | t }}</p>
              <a routerLink="/" class="btn btn-primary">{{ 'footer.findPg' | t }}</a>
            </div>
          }
        }
        @case ('upcoming') {
          <p class="alert info"><app-icon name="bell" [size]="15" /> {{ 'rents.reminderInfo' | t }}</p>
          <div class="due-grid">
            @for (p of upcoming(); track p.id) {
              <article class="card due-card" [class.overdue]="p.overdue">
                <div class="due-date">
                  <span class="month">{{ p.dueDate | date: 'MMM' }}</span>
                  <span class="day">{{ p.dueDate | date: 'd' }}</span>
                  <span class="year">{{ p.dueDate | date: 'y' }}</span>
                </div>
                <div class="due-body">
                  <h2 class="display">{{ p.pgName }}</h2>
                  <p class="muted small">{{ 'common.room' | t }} {{ p.roomNumber }}-{{ p.bedLabel }} ·
                    {{ 'rents.installment' | t: { n: p.installmentNo, t: p.totalInstallments } }}</p>
                  <p class="muted small">{{ 'rents.period' | t }}: {{ p.periodStart | date: 'd MMM y' }} – {{ p.periodEnd | date: 'd MMM y' }}</p>
                  <p class="due-when" [class.late]="p.overdue">{{ dueText(p) }}</p>
                  @if (p.ownerNote) { <p class="note"><app-icon name="chat" [size]="14" /> {{ p.ownerNote }}</p> }
                  @if (p.status === 'SUBMITTED' && p.paymentDetails) { <p class="muted small">{{ p.paymentDetails }}</p> }
                  <div class="due-foot">
                    <span class="price">₹{{ p.amount | number }}</span>
                    @if (p.status === 'DUE') {
                      <button type="button" class="btn btn-primary btn-sm" (click)="paying.set(p)">{{ 'rents.payNow' | t }}</button>
                    } @else {
                      <span class="status-pill" data-status="SUBMITTED">{{ 'pay.SUBMITTED' | t }}</span>
                    }
                  </div>
                </div>
              </article>
            } @empty {
              <div class="card empty-state"><p>{{ 'rents.noDues' | t }}</p></div>
            }
          </div>
        }
        @case ('history') {
          <section class="card ledger">
            <div class="ledger-head">
              <p class="eyebrow">{{ 'rents.ledgerEyebrow' | t }}</p>
              <h2 class="display">{{ 'rents.tabHistory' | t }}</h2>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'rents.invoice' | t }}</th><th>{{ 'common.pg' | t }}</th><th>{{ 'rents.period' | t }}</th>
                    <th>{{ 'common.amount' | t }}</th><th>{{ 'rents.method' | t }}</th><th>{{ 'rents.paidOn' | t }}</th>
                    <th><span class="sr-only">{{ 'common.actions' | t }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of history(); track p.id) {
                    <tr>
                      <td><b>{{ p.invoiceNumber }}</b></td>
                      <td>{{ p.pgName }}<br /><small class="muted">{{ p.roomNumber }}-{{ p.bedLabel }}</small></td>
                      <td>{{ p.periodStart | date: 'd MMM' }} – {{ p.periodEnd | date: 'd MMM y' }}</td>
                      <td><b>₹{{ p.amount | number }}</b></td>
                      <td>{{ 'pay.m.' + p.paymentMethod | t }}<br /><small class="muted">{{ p.paymentDetails }}</small></td>
                      <td>{{ p.paidAt | date: 'd MMM y, h:mm a' }}</td>
                      <td><a class="btn btn-outline btn-sm" [routerLink]="['/invoice', p.id]">
                        <app-icon name="receipt" [size]="14" /> {{ 'rents.invoice' | t }}</a></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="center muted">{{ 'rents.empty' | t }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </app-dash-layout>

    @if (paying(); as p) {
      <app-payment-dialog [payment]="p" (closed)="onDialogClosed($event)" />
    }
  `
})
export class MyRentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly ui = inject(UiService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly tab = signal<Tab>('bookings');
  readonly bookings = signal<Booking[]>([]);
  readonly upcoming = signal<Payment[]>([]);
  readonly history = signal<Payment[]>([]);
  readonly paying = signal<Payment | null>(null);

  readonly firstName = computed(() => (this.auth.user()?.name ?? '').split(' ')[0]);
  readonly activeStays = computed(() => this.bookings().filter(b => b.status === 'BOOKED').length);
  readonly waiting = computed(() => this.bookings().filter(b => b.status === 'REQUESTED' || b.status === 'APPROVED').length);
  readonly nextDue = computed(() =>
    this.upcoming().filter(p => p.status === 'DUE').reduce<Payment | null>((a, p) => (!a || p.dueDate < a.dueDate ? p : a), null));
  readonly totalPaid = computed(() => this.history().reduce((sum, p) => sum + p.amount, 0));
  readonly tabs = computed<DashTab[]>(() => [
    { key: 'bookings', label: 'rents.tabBookings', icon: 'home', count: this.bookings().length },
    { key: 'upcoming', label: 'rents.tabUpcoming', icon: 'calendar', count: this.upcoming().length },
    { key: 'history', label: 'rents.tabHistory', icon: 'receipt', count: this.history().length }
  ]);

  ngOnInit(): void {
    this.setTab(this.route.snapshot.queryParamMap.get('tab') ?? 'bookings');
    this.load();
  }

  setTab(key: string): void {
    this.tab.set(TABS.find(t => t === key) ?? 'bookings');
  }

  load(): void {
    const failed = (err: unknown) => this.ui.error(errorMessage(err));
    this.api.myBookings().subscribe({ next: b => this.bookings.set(b), error: failed });
    this.api.myPayments('upcoming').subscribe({ next: p => this.upcoming.set(p), error: failed });
    this.api.myPayments('history').subscribe({ next: p => this.history.set(p), error: failed });
  }

  /** The next rent of a booking (the API returns only one per booking). */
  nextFor(bookingId: number): Payment | undefined {
    return this.upcoming().find(p => p.bookingId === bookingId);
  }

  dueText(p: Payment): string {
    const days = daysUntil(p.dueDate);
    if (days < 0) {
      return this.i18n.t('rents.overdueBy', { n: -days });
    }
    if (days === 0) {
      return this.i18n.t('rents.dueToday');
    }
    return days === 1 ? this.i18n.t('rents.dueTomorrow') : this.i18n.t('rents.dueIn', { n: days });
  }

  onDialogClosed(changed: boolean): void {
    this.paying.set(null);
    if (changed) {
      this.load();
    }
  }

  async cancel(b: Booking): Promise<void> {
    const ok = await this.ui.confirm({
      title: this.i18n.t('rents.cancelTitle'),
      message: this.i18n.t('rents.cancelText', { pg: b.pgName }),
      confirmLabel: this.i18n.t('rents.cancel'),
      cancelLabel: this.i18n.t('rents.keep'),
      danger: true
    });
    if (!ok) {
      return;
    }
    this.api.cancelBooking(b.id).subscribe({
      next: () => {
        this.ui.success(this.i18n.t('rents.cancelled'));
        this.load();
      },
      error: err => this.ui.error(errorMessage(err))
    });
  }
}
