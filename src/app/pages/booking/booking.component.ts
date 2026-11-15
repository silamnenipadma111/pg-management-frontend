import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Bed, BookingType, Floor, PaymentPlan, PgDetail, Room } from '../../core/models';

interface Selection {
  room: Room;
  bed: Bed;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, TranslatePipe],
  template: `
    @if (pg(); as p) {
      <a [routerLink]="['/pgs', p.id]" class="back">‹ {{ p.name }}</a>
      <h1>{{ 'booking.title' | t }}</h1>
      <div class="filters card">
        <select [(ngModel)]="sharing" [attr.aria-label]="'filters.sharing' | t">
          <option [ngValue]="null">{{ 'filters.sharing' | t }}: {{ 'filters.any' | t }}</option>
          @for (s of p.sharingTypes; track s) { <option [ngValue]="s">{{ 'common.sharing' | t: { n: s } }}</option> }
        </select>
        <select [(ngModel)]="ac" [attr.aria-label]="'filters.ac' | t">
          <option [ngValue]="null">{{ 'filters.ac' | t }}</option>
          <option [ngValue]="true">{{ 'common.ac' | t }}</option>
          <option [ngValue]="false">{{ 'common.nonAc' | t }}</option>
        </select>
        <input type="number" [(ngModel)]="maxRent" [placeholder]="'filters.maxRent' | t" min="0" step="500" />
        <label class="inline"><input type="checkbox" [(ngModel)]="availableOnly" /> {{ 'filters.availableOnly' | t }}</label>
        <div class="seg">
          <button [class.active]="view() === 'visual'" (click)="view.set('visual')">{{ 'booking.visual' | t }}</button>
          <button [class.active]="view() === 'list'" (click)="view.set('list')">{{ 'booking.list' | t }}</button>
        </div>
      </div>
      <div class="legend">
        @for (s of statuses; track s) { <span><i class="bed-dot {{ s.toLowerCase() }}"></i>{{ 'bed.' + s | t }}</span> }
      </div>

      <div class="booking-layout">
        <div>
          @if (view() === 'visual') {
            @for (fl of floors(); track fl.floorNumber) {
              <section class="floor card">
                <h3>{{ fl.floorNumber === 0 ? ('common.ground' | t) : ('common.floor' | t) + ' ' + fl.floorNumber }}</h3>
                <div class="rooms">
                  @for (r of fl.rooms; track r.id) {
                    <div class="room">
                      <div class="room-head"><b>{{ r.roomNumber }}</b><span>{{ 'common.sharing' | t: { n: r.sharingType } }} · {{ r.ac ? 'AC' : 'Non-AC' }}</span></div>
                      <div class="beds">
                        @for (b of r.beds; track b.id) {
                          <button class="bed {{ b.status.toLowerCase() }}" [class.selected]="sel()?.bed?.id === b.id"
                                  [disabled]="b.status !== 'AVAILABLE'" (click)="select(r, b)" [title]="('bed.' + b.status) | t">
                            🛏 {{ b.bedLabel }}
                          </button>
                        }
                      </div>
                      <div class="room-rent">₹{{ r.monthlyRent | number }}{{ 'common.perMonth' | t }}</div>
                    </div>
                  }
                </div>
              </section>
            } @empty {
              <p class="empty">{{ 'home.noResults' | t }}</p>
            }
          } @else {
            <div class="card table-wrap">
              <table>
                <thead><tr><th>{{ 'common.floor' | t }}</th><th>{{ 'common.room' | t }}</th><th>{{ 'common.bed' | t }}</th><th>{{ 'filters.sharing' | t }}</th>
                  <th>AC</th><th>{{ 'owner.monthlyRent' | t }}</th><th>{{ 'common.status' | t }}</th><th></th></tr></thead>
                <tbody>
                  @for (fl of floors(); track fl.floorNumber) {
                    @for (r of fl.rooms; track r.id) {
                      @for (b of r.beds; track b.id) {
                        <tr [class.selected-row]="sel()?.bed?.id === b.id">
                          <td>{{ fl.floorNumber }}</td><td>{{ r.roomNumber }}</td><td>{{ b.bedLabel }}</td><td>{{ r.sharingType }}</td>
                          <td>{{ r.ac ? '❄️' : '—' }}</td><td>₹{{ r.monthlyRent | number }}</td>
                          <td><i class="bed-dot {{ b.status.toLowerCase() }}"></i>{{ 'bed.' + b.status | t }}</td>
                          <td><button class="btn btn-sm btn-outline" [disabled]="b.status !== 'AVAILABLE'" (click)="select(r, b)">✓</button></td>
                        </tr>
                      }
                    }
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <aside class="card pad booking-panel">
          @if (done()) {
            <p class="alert success">{{ 'booking.sent' | t }}</p>
            <a routerLink="/my-rents" class="btn btn-primary block">{{ 'nav.myRents' | t }}</a>
          } @else if (sel()) {
            @let s = sel()!;
            <h3>{{ 'booking.selected' | t }}</h3>
            <p>{{ 'common.room' | t }} <b>{{ s.room.roomNumber }}</b> · {{ 'common.bed' | t }} <b>{{ s.bed.bedLabel }}</b> ·
              {{ 'common.sharing' | t: { n: s.room.sharingType } }} · {{ s.room.ac ? 'AC' : 'Non-AC' }}</p>
            <label>{{ 'booking.type' | t }}
              <select [(ngModel)]="bookingType" (ngModelChange)="onTypeChange()">
                @for (bt of bookingTypes; track bt) { <option [value]="bt">{{ 'bookingType.' + bt | t }}</option> }
              </select>
            </label>
            <label>{{ 'booking.duration' | t }} ({{ 'unit.' + bookingType | t }})
              <input type="number" [(ngModel)]="duration" min="1" [max]="maxDuration()" />
            </label>
            <label>{{ 'booking.startDate' | t }}<input type="date" [(ngModel)]="startDate" [min]="today" /></label>
            @if (bookingType === 'YEARLY' || bookingType === 'MONTHLY') {
              <label>{{ 'booking.plan' | t }}
                <select [(ngModel)]="paymentPlan">
                  @if (bookingType === 'YEARLY') { <option value="FULL">{{ 'booking.planFull' | t }}</option> }
                  <option value="MONTHLY">{{ 'booking.planMonthly' | t }}</option>
                </select>
              </label>
            }
            <label>{{ 'booking.note' | t }}<textarea [(ngModel)]="note" rows="2" maxlength="1000"></textarea></label>
            <p class="total">{{ 'booking.total' | t }}: <b>₹{{ total() | number }}</b>
              @if (installmentText()) { <br /><small class="muted">{{ installmentText() }}</small> }
            </p>
            @if (error()) { <p class="alert error">{{ error() }}</p> }
            <button class="btn btn-primary block" (click)="send()" [disabled]="busy() || duration < 1 || !startDate">{{ 'booking.send' | t }}</button>
          } @else {
            <p class="muted">{{ 'booking.pickBed' | t }}</p>
          }
        </aside>
      </div>
    } @else {
      <p class="muted">{{ 'common.loading' | t }}</p>
    }
  `
})
export class BookingComponent implements OnInit {
  id = input.required<string>();
  private api = inject(ApiService);
  private router = inject(Router);
  pg = signal<PgDetail | null>(null);
  view = signal<'visual' | 'list'>('visual');
  sel = signal<Selection | null>(null);
  busy = signal(false);
  done = signal(false);
  error = signal('');
  statuses = ['AVAILABLE', 'BLOCKED', 'BOOKED', 'UNAVAILABLE'];
  bookingTypes: BookingType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  today = new Date().toISOString().slice(0, 10);

  private filterState = signal({ sharing: null as number | null, ac: null as boolean | null, maxRent: null as number | null, availableOnly: false });
  get sharing() { return this.filterState().sharing; }
  set sharing(v) { this.filterState.update(s => ({ ...s, sharing: v })); }
  get ac() { return this.filterState().ac; }
  set ac(v) { this.filterState.update(s => ({ ...s, ac: v })); }
  get maxRent() { return this.filterState().maxRent; }
  set maxRent(v) { this.filterState.update(s => ({ ...s, maxRent: v })); }
  get availableOnly() { return this.filterState().availableOnly; }
  set availableOnly(v) { this.filterState.update(s => ({ ...s, availableOnly: v })); }

  private form = signal({ bookingType: 'MONTHLY' as BookingType, duration: 1, paymentPlan: 'MONTHLY' as PaymentPlan });
  get bookingType() { return this.form().bookingType; }
  set bookingType(v) { this.form.update(s => ({ ...s, bookingType: v })); }
  get duration() { return this.form().duration; }
  set duration(v) { this.form.update(s => ({ ...s, duration: v })); }
  get paymentPlan() { return this.form().paymentPlan; }
  set paymentPlan(v) { this.form.update(s => ({ ...s, paymentPlan: v })); }
  startDate = this.today;
  note = '';

  floors = computed<Floor[]>(() => {
    const p = this.pg();
    const f = this.filterState();
    if (!p) {
      return [];
    }
    return p.floors
      .map(fl => ({
        floorNumber: fl.floorNumber,
        rooms: fl.rooms
          .filter(r => (f.sharing == null || r.sharingType === f.sharing) && (f.ac == null || r.ac === f.ac)
            && (!f.maxRent || r.monthlyRent <= f.maxRent))
          .map(r => ({ ...r, beds: f.availableOnly ? r.beds.filter(b => b.status === 'AVAILABLE') : r.beds }))
          .filter(r => r.beds.length)
      }))
      .filter(fl => fl.rooms.length);
  });

  total = computed(() => {
    const s = this.sel();
    const f = this.form();
    if (!s) {
      return 0;
    }
    const unit = { DAILY: s.room.dailyRent, WEEKLY: s.room.weeklyRent, MONTHLY: s.room.monthlyRent, YEARLY: s.room.monthlyRent * 12 }[f.bookingType];
    return unit * Math.max(1, f.duration || 1);
  });

  installmentText = computed(() => {
    const s = this.sel();
    const f = this.form();
    if (!s) {
      return '';
    }
    if (f.paymentPlan === 'MONTHLY' && (f.bookingType === 'MONTHLY' || f.bookingType === 'YEARLY')) {
      const months = f.bookingType === 'YEARLY' ? f.duration * 12 : f.duration;
      return `${months} × ₹${s.room.monthlyRent.toLocaleString('en-IN')} / month`;
    }
    if (f.bookingType === 'YEARLY') {
      return `${f.duration} × ₹${(s.room.monthlyRent * 12).toLocaleString('en-IN')} / year`;
    }
    return '';
  });

  maxDuration = computed(() => ({ DAILY: 365, WEEKLY: 52, MONTHLY: 24, YEARLY: 5 })[this.form().bookingType]);

  ngOnInit(): void {
    this.api.pg(+this.id()).subscribe(p => this.pg.set(p));
  }

  select(room: Room, bed: Bed): void {
    if (bed.status === 'AVAILABLE') {
      this.sel.set({ room, bed });
      this.error.set('');
    }
  }

  onTypeChange(): void {
    this.paymentPlan = this.bookingType === 'MONTHLY' ? 'MONTHLY' : this.bookingType === 'YEARLY' ? 'MONTHLY' : 'FULL';
    this.duration = 1;
  }

  send(): void {
    const s = this.sel();
    if (!s) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.requestBooking({
      bedId: s.bed.id, bookingType: this.bookingType, duration: this.duration, startDate: this.startDate,
      paymentPlan: this.bookingType === 'DAILY' || this.bookingType === 'WEEKLY' ? 'FULL' : this.paymentPlan, note: this.note || undefined
    }).subscribe({
      next: () => {
        this.done.set(true);
        this.busy.set(false);
        this.api.pg(+this.id()).subscribe(p => this.pg.set(p));
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
        this.api.pg(+this.id()).subscribe(p => this.pg.set(p));
      }
    });
  }
}
