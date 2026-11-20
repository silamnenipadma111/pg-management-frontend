import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { Bed, BedStatus, Booking, OwnerDashboard, Payment, PgDetail, PgStats } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { DashLayoutComponent, DashTab } from '../../shared/dash-layout.component';
import { IconComponent } from '../../shared/icon.component';

type Tab = 'availability' | 'approvals' | 'rents' | 'bookings';
const TABS: Tab[] = ['availability', 'approvals', 'rents', 'bookings'];
const BED_STATUSES: BedStatus[] = ['AVAILABLE', 'BLOCKED', 'BOOKED', 'UNAVAILABLE'];
const UPCOMING_DAYS = 30;
const NOTE_MAX = 500;

interface StatusShare {
  status: BedStatus;
  count: number;
  percent: number;
}

function bedCount(stats: PgStats, status: BedStatus): number {
  switch (status) {
    case 'AVAILABLE': return stats.availableBeds;
    case 'BLOCKED': return stats.blockedBeds;
    case 'BOOKED': return stats.bookedBeds;
    default: return stats.unavailableBeds;
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, DatePipe, RouterLink, DashLayoutComponent, IconComponent],
  template: `
    <app-dash-layout [badge]="'role.OWNER' | t" [name]="auth.user()?.name ?? ''" [sub]="auth.user()?.email ?? ''"
                     [tabs]="tabs()" [active]="tab()" (tabChange)="setTab($event)">
      <section class="card greeting">
        <div>
          <p class="eyebrow">{{ 'dash.title' | t }}</p>
          <h1 class="display">{{ 'home.welcomeBack' | t }}, {{ firstName() }}</h1>
          <p class="muted">
            @if (attention() > 0) { {{ 'dash.attention' | t: { n: attention() } }} } @else { {{ 'dash.allClear' | t }} }
          </p>
        </div>
        <a routerLink="/owner/register-pg" class="btn btn-primary"><app-icon name="plus" [size]="14" /> {{ 'nav.registerPg' | t }}</a>
      </section>

      @if (dash(); as d) {
        @if (!d.pgs.length) {
          <div class="card empty-state">
            <span class="medallion medallion-lg"><app-icon name="building" [size]="26" [stroke]="1.5" /></span>
            <p>{{ 'dash.noPgs' | t }}</p>
            <a routerLink="/owner/register-pg" class="btn btn-primary">{{ 'nav.registerPg' | t }}</a>
          </div>
        } @else {
          <div class="pill-row no-print" role="group" [attr.aria-label]="'dash.choosePg' | t">
            <button type="button" class="filter-pill" [class.active]="pgId() === null" (click)="selectPg(null)">
              {{ 'dash.allPgs' | t }} ({{ d.pgs.length }})
            </button>
            @for (p of d.pgs; track p.pgId) {
              <button type="button" class="filter-pill" [class.active]="pgId() === p.pgId" (click)="selectPg(p.pgId)">
                {{ p.pgName }}
                @if (p.pendingApprovals + p.pendingPaymentConfirmations > 0) {
                  <span class="count">{{ p.pendingApprovals + p.pendingPaymentConfirmations }}</span>
                }
              </button>
            }
          </div>

          @if (stats(); as s) {
            <div class="kpi-grid kpi-grid-4">
              <div class="card kpi">
                <span class="medallion"><app-icon name="bed" [size]="18" /></span>
                <p class="kpi-label">{{ 'dash.occupancy' | t }}</p>
                <p class="kpi-value">{{ s.occupancyPercent }}%</p>
                <p class="kpi-sub">{{ 'dash.bedsOf' | t: { n: s.bookedBeds, t: s.totalBeds } }}</p>
              </div>
              <div class="card kpi">
                <span class="medallion"><app-icon name="check-circle" [size]="18" /></span>
                <p class="kpi-label">{{ 'bed.AVAILABLE' | t }}</p>
                <p class="kpi-value">{{ s.availableBeds }}</p>
                <p class="kpi-sub">{{ 'dash.blockedSub' | t: { n: s.blockedBeds } }}</p>
              </div>
              <div class="card kpi">
                <span class="medallion"><app-icon name="users" [size]="18" /></span>
                <p class="kpi-label">{{ 'dash.pendingApprovals' | t }}</p>
                <p class="kpi-value">{{ s.pendingApprovals }}</p>
                <p class="kpi-sub">{{ 'dash.cashSub' | t: { n: s.pendingPaymentConfirmations } }}</p>
              </div>
              <div class="card kpi">
                <span class="medallion"><app-icon name="wallet" [size]="18" /></span>
                <p class="kpi-label">{{ 'dash.pendingRent' | t }}</p>
                <p class="kpi-value">₹{{ s.pendingRentAmount | number }}</p>
                <p class="kpi-sub" [class.late]="s.overdueCount > 0">{{ 'dash.overdueSub' | t: { n: s.overdueCount } }}</p>
              </div>
            </div>

            <section class="card pad">
              <p class="eyebrow">{{ 'dash.bedStatus' | t }}</p>
              <div class="status-meter" role="img" [attr.aria-label]="'dash.bedStatus' | t">
                @for (share of shares(); track share.status) {
                  @if (share.count > 0) { <i [attr.data-status]="share.status" [style.flex-grow]="share.count"></i> }
                }
              </div>
              <ul class="status-legend">
                @for (share of shares(); track share.status) {
                  <li><i class="bed-dot" [attr.data-status]="share.status"></i>{{ 'bed.' + share.status | t }}
                    <b>{{ share.count }}</b> <span class="muted">({{ share.percent }}%)</span></li>
                }
              </ul>
            </section>
          }

          @switch (tab()) {
            @case ('availability') {
              @if (pgId() === null) {
                <section class="card ledger">
                  <div class="ledger-head">
                    <p class="eyebrow">{{ 'dash.availability' | t }}</p>
                    <h2 class="display">{{ 'nav.myPgs' | t }}</h2>
                  </div>
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{{ 'common.pg' | t }}</th><th>{{ 'dash.totalBeds' | t }}</th><th>{{ 'bed.AVAILABLE' | t }}</th>
                          <th>{{ 'bed.BLOCKED' | t }}</th><th>{{ 'bed.BOOKED' | t }}</th><th>{{ 'bed.UNAVAILABLE' | t }}</th>
                          <th>{{ 'dash.occupancy' | t }}</th><th><span class="sr-only">{{ 'common.actions' | t }}</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (p of d.pgs; track p.pgId) {
                          <tr>
                            <td><b>{{ p.pgName }}</b><br /><small class="muted">{{ p.area }}, {{ p.city }}</small></td>
                            <td>{{ p.totalBeds }}</td><td>{{ p.availableBeds }}</td><td>{{ p.blockedBeds }}</td>
                            <td>{{ p.bookedBeds }}</td><td>{{ p.unavailableBeds }}</td>
                            <td>
                              <div class="meter-line">
                                <div class="meter"><i [style.width.%]="p.occupancyPercent"></i></div>
                                <small>{{ p.occupancyPercent }}%</small>
                              </div>
                            </td>
                            <td><button type="button" class="btn btn-outline btn-sm" (click)="selectPg(p.pgId)">{{ 'dash.manageBeds' | t }}</button></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </section>
              } @else {
                @if (pg(); as p) {
                <div class="section-bar">
                  <p class="muted small">{{ 'owner.bedsHint' | t }}</p>
                  <a class="btn btn-outline btn-sm" [routerLink]="['/owner/pgs', p.id, 'edit']">
                    <app-icon name="edit" [size]="14" /> {{ 'card.edit' | t }}
                  </a>
                </div>
                @for (fl of p.floors; track fl.floorNumber) {
                  <section class="card floor">
                    <h2 class="floor-title">
                      {{ fl.floorNumber === 0 ? ('common.ground' | t) : ('common.floor' | t) + ' ' + fl.floorNumber }}
                    </h2>
                    <div class="rooms">
                      @for (r of fl.rooms; track r.id) {
                        <div class="room">
                          <div class="room-head">
                            <b>{{ 'common.room' | t }} {{ r.roomNumber }}</b>
                            <span>{{ 'common.sharing' | t: { n: r.sharingType } }} · ₹{{ r.monthlyRent | number }}</span>
                          </div>
                          <div class="beds">
                            @for (b of r.beds; track b.id) {
                              <button type="button" class="bed" [attr.data-status]="b.status" (click)="toggleBed(b)"
                                      [disabled]="b.status === 'BOOKED' || b.status === 'BLOCKED'"
                                      [attr.aria-label]="('common.bed' | t) + ' ' + b.bedLabel + ' - ' + (('bed.' + b.status) | t)">
                                <app-icon name="bed" [size]="18" /> {{ b.bedLabel }}
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </section>
                }
                } @else {
                  <div class="skeleton skeleton-block"></div>
                }
              }
            }
            @case ('approvals') {
              <h2 class="display section-title">{{ 'dash.pendingApprovals' | t }}</h2>
              @for (b of requests(); track b.id) {
                <article class="card stay">
                  <div class="stay-main">
                    <div class="stay-head">
                      <h3 class="display">{{ b.customer.name }}</h3>
                      <span class="status-pill" data-status="REQUESTED">{{ b.createdAt | date: 'd MMM, h:mm a' }}</span>
                    </div>
                    <p class="muted">{{ b.pgName }} · {{ 'common.room' | t }} {{ b.roomNumber }} · {{ 'common.bed' | t }} {{ b.bedLabel }} ·
                      {{ 'common.sharing' | t: { n: b.sharingType } }}</p>
                    <p>{{ 'bookingType.' + b.bookingType | t }} × {{ b.duration }} · {{ b.startDate | date: 'd MMM y' }} –
                      {{ b.endDate | date: 'd MMM y' }} · <b>₹{{ b.totalAmount | number }}</b>
                      @if (b.paymentPlan === 'MONTHLY') { <small class="muted">({{ 'booking.planMonthly' | t }})</small> }</p>
                    <p class="contact-line">
                      <a [href]="'tel:' + b.customer.phone"><app-icon name="phone" [size]="14" /> {{ b.customer.phone }}</a>
                      <a [href]="'mailto:' + b.customer.email"><app-icon name="mail" [size]="14" /> {{ b.customer.email }}</a>
                    </p>
                    @if (b.customerNote) { <p class="note"><app-icon name="chat" [size]="14" /> {{ b.customerNote }}</p> }
                  </div>
                  <div class="stay-actions">
                    <button type="button" class="btn btn-primary btn-sm" (click)="approve(b)">{{ 'dash.approve' | t }}</button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="reject(b)">{{ 'dash.reject' | t }}</button>
                  </div>
                </article>
              } @empty {
                <div class="card empty-state"><p>{{ 'dash.noRequests' | t }}</p></div>
              }

              <h2 class="display section-title">{{ 'dash.paymentConfirmations' | t }}</h2>
              @for (p of submitted(); track p.id) {
                <article class="card stay">
                  <div class="stay-main">
                    <div class="stay-head">
                      <h3 class="display">{{ p.customer.name }}</h3>
                      <span class="price">₹{{ p.amount | number }}</span>
                    </div>
                    <p class="muted">{{ p.pgName }} · {{ p.roomNumber }}-{{ p.bedLabel }} ·
                      {{ 'rents.installment' | t: { n: p.installmentNo, t: p.totalInstallments } }}</p>
                    <p>{{ 'pay.m.' + p.paymentMethod | t }} @if (p.paymentDetails) { · {{ p.paymentDetails }} }</p>
                    <p class="muted small">{{ p.periodStart | date: 'd MMM' }} – {{ p.periodEnd | date: 'd MMM y' }} ·
                      {{ p.submittedAt | date: 'd MMM, h:mm a' }}</p>
                    <p class="contact-line">
                      <a [href]="'tel:' + p.customer.phone"><app-icon name="phone" [size]="14" /> {{ p.customer.phone }}</a>
                    </p>
                  </div>
                  <div class="stay-actions">
                    <button type="button" class="btn btn-primary btn-sm" (click)="acceptCash(p)">{{ 'dash.accept' | t }}</button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="rejectPayment(p)">{{ 'dash.reject' | t }}</button>
                  </div>
                </article>
              } @empty {
                <div class="card empty-state"><p>{{ 'dash.noCash' | t }}</p></div>
              }
            }
            @case ('rents') {
              <section class="card ledger">
                <div class="ledger-head">
                  <p class="eyebrow">{{ 'dash.rentsEyebrow' | t: { n: upcomingDays } }}</p>
                  <h2 class="display">{{ 'dash.rents' | t }}</h2>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{{ 'dash.customer' | t }}</th><th>{{ 'common.pg' | t }}</th><th>{{ 'rents.period' | t }}</th>
                        <th>{{ 'rents.due' | t }}</th><th>{{ 'common.amount' | t }}</th><th>{{ 'common.status' | t }}</th>
                        <th>{{ 'dash.reminder' | t }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of pendingRents(); track p.id) {
                        <tr>
                          <td><b>{{ p.customer.name }}</b><br /><small class="muted">{{ p.customer.phone }}</small></td>
                          <td>{{ p.pgName }}<br /><small class="muted">{{ p.roomNumber }}-{{ p.bedLabel }}</small></td>
                          <td>{{ p.installmentNo }}/{{ p.totalInstallments }} · {{ p.periodStart | date: 'd MMM' }} – {{ p.periodEnd | date: 'd MMM y' }}</td>
                          <td>{{ p.dueDate | date: 'd MMM y' }}</td>
                          <td><b>₹{{ p.amount | number }}</b></td>
                          <td>
                            @if (p.overdue) {
                              <span class="status-pill" data-status="OVERDUE">{{ 'rents.overdue' | t }}</span>
                            } @else {
                              <span class="status-pill" [attr.data-status]="p.status">{{ 'pay.' + p.status | t }}</span>
                            }
                          </td>
                          <td>
                            @if (p.status === 'DUE') {
                              <button type="button" class="btn btn-outline btn-sm" (click)="remind(p)">
                                <app-icon name="bell" [size]="14" /> {{ 'dash.sendReminder' | t }}
                              </button>
                              @if (p.lastReminderOn) {
                                <br /><small class="muted">{{ 'dash.lastReminder' | t }} {{ p.lastReminderOn | date: 'd MMM' }}</small>
                              }
                            }
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="7" class="center muted">{{ 'rents.empty' | t }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }
            @case ('bookings') {
              <section class="card ledger">
                <div class="ledger-head">
                  <p class="eyebrow">{{ 'dash.bookingsEyebrow' | t }}</p>
                  <h2 class="display">{{ 'dash.bookings' | t }}</h2>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{{ 'dash.customer' | t }}</th><th>{{ 'common.pg' | t }}</th><th>{{ 'booking.type' | t }}</th>
                        <th>{{ 'booking.startDate' | t }}</th><th>{{ 'common.amount' | t }}</th><th>{{ 'common.status' | t }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (b of bookings(); track b.id) {
                        <tr>
                          <td><b>{{ b.customer.name }}</b><br /><small class="muted">{{ b.customer.phone }}</small></td>
                          <td>{{ b.pgName }}<br /><small class="muted">{{ b.roomNumber }}-{{ b.bedLabel }}</small></td>
                          <td>{{ 'bookingType.' + b.bookingType | t }} × {{ b.duration }}</td>
                          <td>{{ b.startDate | date: 'd MMM y' }}</td>
                          <td><b>₹{{ b.totalAmount | number }}</b></td>
                          <td><span class="status-pill" [attr.data-status]="b.status">{{ 'status.' + b.status | t }}</span>
                            @if (b.totalInstallments) {
                              <br /><small class="muted">{{ 'rents.paidOf' | t: { n: b.paidInstallments, t: b.totalInstallments } }}</small>
                            }
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="6" class="center muted">{{ 'rents.empty' | t }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }
          }
        }
      } @else if (loadError()) {
        <p class="alert error" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="skeleton skeleton-block"></div>
      }
    </app-dash-layout>
  `
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly ui = inject(UiService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly upcomingDays = UPCOMING_DAYS;
  readonly dash = signal<OwnerDashboard | null>(null);
  readonly pgId = signal<number | null>(null);
  readonly pg = signal<PgDetail | null>(null);
  readonly tab = signal<Tab>('availability');
  readonly bookings = signal<Booking[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly loadError = signal('');

  readonly firstName = computed(() => (this.auth.user()?.name ?? '').split(' ')[0]);
  readonly stats = computed<PgStats | null>(() => {
    const d = this.dash();
    if (!d) {
      return null;
    }
    return d.pgs.find(p => p.pgId === this.pgId()) ?? d.totals;
  });
  readonly shares = computed<StatusShare[]>(() => {
    const s = this.stats();
    if (!s) {
      return [];
    }
    return BED_STATUSES.map(status => {
      const count = bedCount(s, status);
      return { status, count, percent: s.totalBeds ? Math.round((100 * count) / s.totalBeds) : 0 };
    });
  });
  readonly requests = computed(() => this.bookings().filter(b => b.status === 'REQUESTED'));
  readonly submitted = computed(() => this.payments().filter(p => p.status === 'SUBMITTED'));
  readonly attention = computed(() => this.requests().length + this.submitted().length);
  /** Overdue rents plus everything due in the next 30 days. */
  readonly pendingRents = computed(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + UPCOMING_DAYS);
    const max = limit.toISOString().slice(0, 10);
    return this.payments().filter(p =>
      (p.bookingStatus === 'APPROVED' || p.bookingStatus === 'BOOKED') && (p.overdue || p.dueDate <= max));
  });
  readonly tabs = computed<DashTab[]>(() => [
    { key: 'availability', label: 'dash.availability', icon: 'bed' },
    { key: 'approvals', label: 'dash.approvals', icon: 'check-circle', count: this.attention() },
    { key: 'rents', label: 'dash.rents', icon: 'wallet', count: this.pendingRents().length },
    { key: 'bookings', label: 'dash.bookings', icon: 'calendar', count: this.bookings().length }
  ]);

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    if (query.get('saved')) {
      this.ui.success(this.i18n.t('owner.saved'));
    }
    this.setTab(query.get('tab') ?? 'availability');
    const pg = Number(query.get('pg'));
    this.selectPg(Number.isInteger(pg) && pg > 0 ? pg : null);
  }

  setTab(key: string): void {
    this.tab.set(TABS.find(t => t === key) ?? 'availability');
  }

  selectPg(id: number | null): void {
    this.pgId.set(id);
    this.pg.set(null);
    this.reload();
  }

  reload(): void {
    const id = this.pgId();
    if (id !== null) {
      this.api.ownerPg(id).subscribe({ next: p => this.pg.set(p), error: err => this.ui.error(errorMessage(err)) });
    }
    forkJoin({
      dash: this.api.dashboard(),
      bookings: this.api.ownerBookings(undefined, id),
      payments: this.api.ownerPayments(['DUE', 'SUBMITTED'], id)
    }).subscribe({
      next: ({ dash, bookings, payments }) => {
        this.dash.set(dash);
        this.bookings.set(bookings);
        this.payments.set(payments);
      },
      error: err => this.loadError.set(errorMessage(err))
    });
  }

  async approve(b: Booking): Promise<void> {
    const note = await this.ui.prompt({
      title: this.i18n.t('dash.approveTitle', { name: b.customer.name }),
      message: this.i18n.t('dash.approveText'),
      label: this.i18n.t('dash.noteToCustomer'),
      value: this.i18n.t('dash.approveDefault'),
      confirmLabel: this.i18n.t('dash.approve'),
      maxLength: NOTE_MAX
    });
    if (note === null) {
      return;
    }
    this.api.approveBooking(b.id, note.trim() || undefined)
      .subscribe(this.done(this.i18n.t('dash.approved', { name: b.customer.name })));
  }

  async reject(b: Booking): Promise<void> {
    const note = await this.ui.prompt({
      title: this.i18n.t('dash.rejectTitle', { name: b.customer.name }),
      label: this.i18n.t('dash.rejectReason'),
      confirmLabel: this.i18n.t('dash.reject'),
      danger: true,
      maxLength: NOTE_MAX
    });
    if (note === null) {
      return;
    }
    this.api.rejectBooking(b.id, note.trim() || undefined).subscribe(this.done(this.i18n.t('dash.rejected')));
  }

  async acceptCash(p: Payment): Promise<void> {
    const ok = await this.ui.confirm({
      title: this.i18n.t('dash.acceptTitle'),
      message: this.i18n.t('dash.acceptText', { amount: p.amount.toLocaleString('en-IN'), name: p.customer.name }),
      confirmLabel: this.i18n.t('dash.accept')
    });
    if (ok) {
      this.api.confirmPayment(p.id).subscribe(this.done(this.i18n.t('dash.accepted', { name: p.customer.name })));
    }
  }

  async rejectPayment(p: Payment): Promise<void> {
    const note = await this.ui.prompt({
      title: this.i18n.t('dash.rejectCashTitle'),
      label: this.i18n.t('dash.rejectReason'),
      value: this.i18n.t('dash.cashNotReceived'),
      confirmLabel: this.i18n.t('dash.reject'),
      danger: true,
      maxLength: NOTE_MAX
    });
    if (note === null) {
      return;
    }
    this.api.rejectPayment(p.id, note.trim() || undefined).subscribe(this.done(this.i18n.t('dash.cashRejected')));
  }

  remind(p: Payment): void {
    this.api.remindPayment(p.id).subscribe({
      next: r => {
        this.ui.success(this.i18n.t('dash.reminded', { name: p.customer.name, channels: r.channels.join(', ') }));
        this.reload();
      },
      error: err => this.ui.error(errorMessage(err))
    });
  }

  toggleBed(b: Bed): void {
    const status: BedStatus = b.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    this.api.setBedStatus(b.id, status).subscribe({
      next: p => {
        this.pg.set(p);
        this.reload();
      },
      error: err => this.ui.error(errorMessage(err))
    });
  }

  private done(text: string) {
    return {
      next: () => {
        this.ui.success(text);
        this.reload();
      },
      error: (err: unknown) => this.ui.error(errorMessage(err))
    };
  }
}
