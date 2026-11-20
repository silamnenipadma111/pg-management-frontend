import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Bed, BedStatus, Booking, BookingType, Floor, PaymentPlan, PgDetail, Room } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

interface Selection {
  room: Room;
  bed: Bed;
}

interface BedFilters {
  sharing: number | null;
  ac: boolean | null;
  availableOnly: boolean;
}

interface StayForm {
  bookingType: BookingType;
  duration: number;
  paymentPlan: PaymentPlan;
}

const AVAILABLE: BedStatus = 'AVAILABLE';
/** Longest stay per booking type; the server enforces the same limits. */
const MAX_DURATION: Record<BookingType, number> = { DAILY: 90, WEEKLY: 52, MONTHLY: 36, YEARLY: 5 };
const MONTHS_IN_YEAR = 12;

function unitRent(room: Room, type: BookingType): number {
  switch (type) {
    case 'DAILY': return room.dailyRent;
    case 'WEEKLY': return room.weeklyRent;
    case 'YEARLY': return room.monthlyRent * MONTHS_IN_YEAR;
    default: return room.monthlyRent;
  }
}

function defaultPlan(type: BookingType): PaymentPlan {
  return type === 'MONTHLY' || type === 'YEARLY' ? 'MONTHLY' : 'FULL';
}

function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, RouterLink, TranslatePipe, IconComponent],
  template: `
    <div class="container page">
      @if (pg(); as p) {
        <a [routerLink]="['/pgs', p.id]" class="back-link"><app-icon name="arrow-left" [size]="14" /> {{ p.name }}</a>
        <header class="page-head">
          <p class="eyebrow">{{ 'booking.eyebrow' | t }}</p>
          <h1 class="display">{{ 'booking.title' | t }}</h1>
          <p class="muted">{{ p.area }}, {{ p.city }}</p>
        </header>

        <div class="toolbar card no-print">
          <label class="toolbar-field">{{ 'filters.sharing' | t }}
            <select [ngModel]="filters().sharing" (ngModelChange)="setFilter('sharing', $event)">
              <option [ngValue]="null">{{ 'filters.any' | t }}</option>
              @for (s of p.sharingTypes; track s) { <option [ngValue]="s">{{ 'common.sharing' | t: { n: s } }}</option> }
            </select>
          </label>
          <label class="toolbar-field">{{ 'filters.ac' | t }}
            <select [ngModel]="filters().ac" (ngModelChange)="setFilter('ac', $event)">
              <option [ngValue]="null">{{ 'filters.any' | t }}</option>
              <option [ngValue]="true">{{ 'common.ac' | t }}</option>
              <option [ngValue]="false">{{ 'common.nonAc' | t }}</option>
            </select>
          </label>
          <label class="check">
            <input type="checkbox" [ngModel]="filters().availableOnly" (ngModelChange)="setFilter('availableOnly', $event)" />
            {{ 'filters.availableOnly' | t }}
          </label>
          <div class="seg" role="group" [attr.aria-label]="'booking.view' | t">
            <button type="button" [class.active]="view() === 'visual'" (click)="view.set('visual')">
              <app-icon name="grid" [size]="15" /> {{ 'booking.visual' | t }}
            </button>
            <button type="button" [class.active]="view() === 'list'" (click)="view.set('list')">
              <app-icon name="list" [size]="15" /> {{ 'booking.list' | t }}
            </button>
          </div>
        </div>

        <div class="legend">
          @for (s of statuses; track s) { <span><i class="bed-dot" [attr.data-status]="s"></i>{{ 'bed.' + s | t }}</span> }
        </div>

        <div class="booking-layout">
          <div class="booking-beds">
            @if (view() === 'visual') {
              @for (fl of floors(); track fl.floorNumber) {
                <section class="card floor">
                  <h2 class="floor-title">
                    {{ fl.floorNumber === 0 ? ('common.ground' | t) : ('common.floor' | t) + ' ' + fl.floorNumber }}
                  </h2>
                  <div class="rooms">
                    @for (r of fl.rooms; track r.id) {
                      <div class="room">
                        <div class="room-head">
                          <b>{{ 'common.room' | t }} {{ r.roomNumber }}</b>
                          <span>{{ 'common.sharing' | t: { n: r.sharingType } }} · {{ (r.ac ? 'common.ac' : 'common.nonAc') | t }}</span>
                        </div>
                        <div class="beds">
                          @for (b of r.beds; track b.id) {
                            <button type="button" class="bed" [attr.data-status]="b.status" [class.selected]="sel()?.bed?.id === b.id"
                                    [disabled]="b.status !== available" (click)="select(r, b)"
                                    [attr.aria-label]="('common.bed' | t) + ' ' + b.bedLabel + ' - ' + (('bed.' + b.status) | t)"
                                    [attr.aria-pressed]="sel()?.bed?.id === b.id">
                              <app-icon name="bed" [size]="18" /> {{ b.bedLabel }}
                            </button>
                          }
                        </div>
                        <div class="room-rent">₹{{ r.monthlyRent | number }}<small>{{ 'common.perMonth' | t }}</small></div>
                      </div>
                    }
                  </div>
                </section>
              } @empty {
                <div class="empty-state card"><p>{{ 'booking.noBeds' | t }}</p></div>
              }
            } @else {
              <div class="card ledger">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{{ 'common.floor' | t }}</th><th>{{ 'common.room' | t }}</th><th>{{ 'common.bed' | t }}</th>
                        <th>{{ 'filters.sharing' | t }}</th><th>{{ 'common.ac' | t }}</th><th>{{ 'owner.monthlyRent' | t }}</th>
                        <th>{{ 'common.status' | t }}</th><th><span class="sr-only">{{ 'common.actions' | t }}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (fl of floors(); track fl.floorNumber) {
                        @for (r of fl.rooms; track r.id) {
                          @for (b of r.beds; track b.id) {
                            <tr [class.selected-row]="sel()?.bed?.id === b.id">
                              <td>{{ fl.floorNumber === 0 ? ('common.ground' | t) : fl.floorNumber }}</td>
                              <td>{{ r.roomNumber }}</td><td>{{ b.bedLabel }}</td>
                              <td>{{ 'common.sharing' | t: { n: r.sharingType } }}</td>
                              <td>{{ (r.ac ? 'common.ac' : 'common.nonAc') | t }}</td>
                              <td>₹{{ r.monthlyRent | number }}</td>
                              <td><span class="status-pill" [attr.data-status]="b.status">{{ 'bed.' + b.status | t }}</span></td>
                              <td>
                                <button type="button" class="btn btn-sm btn-outline" [disabled]="b.status !== available"
                                        (click)="select(r, b)">{{ 'booking.choose' | t }}</button>
                              </td>
                            </tr>
                          }
                        }
                      } @empty {
                        <tr><td colspan="8" class="center muted">{{ 'booking.noBeds' | t }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>

          <aside class="card reserve-panel" aria-live="polite">
            @if (confirmed(); as c) {
              <span class="medallion medallion-lg"><app-icon name="check" [size]="26" /></span>
              <p class="eyebrow">{{ 'booking.sentEyebrow' | t }}</p>
              <h2 class="display">{{ 'booking.sentTitle' | t }}</h2>
              <p class="muted center">{{ 'booking.sent' | t }}</p>
              <dl class="summary">
                <div><dt>{{ 'booking.reference' | t }}</dt><dd>#{{ c.id }}</dd></div>
                <div><dt>{{ 'common.room' | t }} / {{ 'common.bed' | t }}</dt><dd>{{ c.roomNumber }} / {{ c.bedLabel }}</dd></div>
                <div><dt>{{ 'booking.stay' | t }}</dt><dd>{{ c.startDate | date: 'd MMM y' }} – {{ c.endDate | date: 'd MMM y' }}</dd></div>
                <div class="summary-total"><dt>{{ 'booking.total' | t }}</dt><dd>₹{{ c.totalAmount | number }}</dd></div>
              </dl>
              <p class="fine-print">{{ 'booking.emailNote' | t }}</p>
              <a routerLink="/my-rents" class="btn btn-primary block">{{ 'nav.myRents' | t }}</a>
            } @else {
              @if (sel(); as s) {
              <p class="eyebrow">{{ 'booking.reserve' | t }}</p>
              <h2 class="display">{{ 'common.room' | t }} {{ s.room.roomNumber }} · {{ 'common.bed' | t }} {{ s.bed.bedLabel }}</h2>
              <p class="muted">{{ 'common.sharing' | t: { n: s.room.sharingType } }} · {{ (s.room.ac ? 'common.ac' : 'common.nonAc') | t }}</p>

              <form (ngSubmit)="send()" #form="ngForm" novalidate>
                <label>{{ 'booking.type' | t }}
                  <select name="bookingType" [ngModel]="form$().bookingType" (ngModelChange)="setType($event)">
                    @for (bt of bookingTypes; track bt) { <option [value]="bt">{{ 'bookingType.' + bt | t }}</option> }
                  </select>
                </label>
                <div class="grid-2">
                  <label>{{ 'booking.duration' | t }} ({{ 'unit.' + form$().bookingType | t }})
                    <input type="number" name="duration" [ngModel]="form$().duration" (ngModelChange)="setDuration($event)"
                           required min="1" [max]="maxDuration()" step="1" inputmode="numeric" />
                  </label>
                  <label>{{ 'booking.startDate' | t }}
                    <input type="date" name="startDate" [(ngModel)]="startDate" required [min]="today" />
                  </label>
                </div>
                @if (!durationValid()) { <p class="field-error">{{ 'booking.durationRange' | t: { max: maxDuration() } }}</p> }
                @if (planChoice()) {
                  <label>{{ 'booking.plan' | t }}
                    <select name="paymentPlan" [ngModel]="form$().paymentPlan" (ngModelChange)="setPlan($event)">
                      @if (form$().bookingType === 'YEARLY') { <option value="FULL">{{ 'booking.planFull' | t }}</option> }
                      <option value="MONTHLY">{{ 'booking.planMonthly' | t }}</option>
                    </select>
                  </label>
                }
                <label>{{ 'booking.note' | t }}<textarea name="note" [(ngModel)]="note" rows="2" maxlength="1000"></textarea></label>

                <dl class="summary">
                  <div>
                    <dt>₹{{ unit() | number }} × {{ form$().duration || 1 }} {{ 'unit.' + form$().bookingType | t }}</dt>
                    <dd>₹{{ total() | number }}</dd>
                  </div>
                  @if (installments() > 1) {
                    <div><dt>{{ 'booking.installments' | t: { n: installments() } }}</dt><dd>₹{{ s.room.monthlyRent | number }}{{ 'common.perMonth' | t }}</dd></div>
                  }
                  <div class="summary-total"><dt>{{ 'booking.total' | t }}</dt><dd>₹{{ total() | number }}</dd></div>
                </dl>
                <p class="fine-print">{{ 'booking.payLater' | t }}</p>

                @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
                <button class="btn btn-primary block" [disabled]="busy() || !durationValid() || !startDate || startDate < today">
                  {{ 'booking.send' | t }} <app-icon name="arrow-right" [size]="14" />
                </button>
              </form>
            } @else {
              <span class="medallion medallion-lg"><app-icon name="bed" [size]="26" [stroke]="1.5" /></span>
              <p class="eyebrow">{{ 'booking.reserve' | t }}</p>
              <p class="muted center">{{ 'booking.pickBed' | t }}</p>
              }
            }
          </aside>
        </div>
      } @else if (loadError()) {
        <p class="alert error" role="alert">{{ loadError() }}</p>
      } @else {
        <div class="skeleton skeleton-block"></div>
      }
    </div>
  `
})
export class BookingComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);

  readonly available = AVAILABLE;
  readonly statuses: BedStatus[] = [AVAILABLE, 'BLOCKED', 'BOOKED', 'UNAVAILABLE'];
  readonly bookingTypes: BookingType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  readonly today = localToday();

  readonly pg = signal<PgDetail | null>(null);
  readonly view = signal<'visual' | 'list'>('visual');
  readonly sel = signal<Selection | null>(null);
  readonly confirmed = signal<Booking | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly loadError = signal('');
  readonly filters = signal<BedFilters>({ sharing: null, ac: null, availableOnly: false });
  /** Stay details as a signal so the price summary updates live. */
  readonly form$ = signal<StayForm>({ bookingType: 'MONTHLY', duration: 1, paymentPlan: 'MONTHLY' });
  startDate = this.today;
  note = '';

  readonly floors = computed<Floor[]>(() => {
    const f = this.filters();
    return (this.pg()?.floors ?? [])
      .map(fl => ({
        floorNumber: fl.floorNumber,
        rooms: fl.rooms
          .filter(r => (f.sharing === null || r.sharingType === f.sharing) && (f.ac === null || r.ac === f.ac))
          .map(r => ({ ...r, beds: f.availableOnly ? r.beds.filter(b => b.status === AVAILABLE) : r.beds }))
          .filter(r => r.beds.length > 0)
      }))
      .filter(fl => fl.rooms.length > 0);
  });

  readonly maxDuration = computed(() => MAX_DURATION[this.form$().bookingType]);
  readonly durationValid = computed(() => {
    const d = this.form$().duration;
    return Number.isInteger(d) && d >= 1 && d <= this.maxDuration();
  });
  readonly planChoice = computed(() => this.form$().bookingType === 'MONTHLY' || this.form$().bookingType === 'YEARLY');
  readonly unit = computed(() => {
    const s = this.sel();
    return s ? unitRent(s.room, this.form$().bookingType) : 0;
  });
  readonly total = computed(() => this.unit() * Math.max(1, this.form$().duration || 1));
  /** Number of monthly instalments, or 1 when the stay is paid in one go. */
  readonly installments = computed(() => {
    const f = this.form$();
    if (!this.planChoice() || f.paymentPlan !== 'MONTHLY') {
      return 1;
    }
    return f.bookingType === 'YEARLY' ? f.duration * MONTHS_IN_YEAR : f.duration;
  });

  ngOnInit(): void {
    this.load();
  }

  setFilter<K extends keyof BedFilters>(key: K, value: BedFilters[K]): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  setType(bookingType: BookingType): void {
    this.form$.set({ bookingType, duration: 1, paymentPlan: defaultPlan(bookingType) });
  }

  setDuration(duration: number | null): void {
    this.form$.update(f => ({ ...f, duration: duration ?? 0 }));
  }

  setPlan(paymentPlan: PaymentPlan): void {
    this.form$.update(f => ({ ...f, paymentPlan }));
  }

  select(room: Room, bed: Bed): void {
    if (bed.status === AVAILABLE) {
      this.sel.set({ room, bed });
      this.confirmed.set(null);
      this.error.set('');
    }
  }

  send(): void {
    const s = this.sel();
    if (!s || !this.durationValid()) {
      return;
    }
    const f = this.form$();
    this.busy.set(true);
    this.error.set('');
    this.api.requestBooking({
      bedId: s.bed.id, bookingType: f.bookingType, duration: f.duration, startDate: this.startDate,
      paymentPlan: this.planChoice() ? f.paymentPlan : 'FULL', note: this.note.trim() || undefined
    }).subscribe({
      next: booking => {
        this.confirmed.set(booking);
        this.sel.set(null);
        this.note = '';
        this.busy.set(false);
        this.load();
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
        this.load();
      }
    });
  }

  private load(): void {
    this.api.pg(+this.id()).subscribe({
      next: p => this.pg.set(p),
      error: err => this.loadError.set(errorMessage(err))
    });
  }
}
