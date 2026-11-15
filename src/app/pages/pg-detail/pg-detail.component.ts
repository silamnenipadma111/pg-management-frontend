import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.service';
import { PgDetail } from '../../core/models';
import { FACILITY_ICONS, FACILITY_LABELS } from '../../core/translations';
import { CarouselComponent } from '../../shared/carousel.component';

@Component({
  selector: 'app-pg-detail',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, RouterLink, CarouselComponent],
  template: `
    <a routerLink="/" class="back">‹ {{ 'common.back' | t }}</a>
    @if (pg(); as p) {
      <div class="detail-grid">
        <div>
          <app-carousel [images]="images()" [alt]="p.name" height="360px" />
          @if (videos().length) {
            <div class="videos">
              @for (v of videos(); track v) { <video [src]="v" controls preload="metadata"></video> }
            </div>
          }
        </div>
        <div class="card pad">
          <div class="row-between">
            <h1>{{ p.name }}</h1>
            <span class="tag tag-{{ p.genderPreference.toLowerCase() }}">{{ 'gender.' + p.genderPreference | t }}</span>
          </div>
          <p class="muted">📍 {{ p.addressLine }}, {{ p.area }}, {{ p.city }}, {{ p.state }} - {{ p.pincode }}</p>
          <p class="price">₹{{ p.minRent | number }} – ₹{{ p.maxRent | number }} <small>{{ 'common.perMonth' | t }}</small></p>
          <p class="avail">{{ 'common.bedsAvailable' | t: { n: p.availableBeds } }} / {{ p.totalBeds }}</p>
          @if (p.description) { <p>{{ p.description }}</p> }
          <p>📞 {{ 'detail.contact' | t }}: <a [href]="'tel:' + p.contactPhone">{{ p.contactPhone }}</a> · {{ p.ownerName }}</p>
          @if (p.latitude && p.longitude) {
            <p><a target="_blank" rel="noopener" [href]="'https://www.google.com/maps?q=' + p.latitude + ',' + p.longitude">🗺 {{ 'detail.location' | t }}</a></p>
          }
          @if (p.registeredVia === 'CUSTOMER_CARE') { <p class="muted small">🎧 {{ 'detail.registeredViaCare' | t }}</p> }
          @if (auth.role() === 'CUSTOMER') {
            <a class="btn btn-primary block" [routerLink]="['/pgs', p.id, 'book']">{{ 'detail.goBooking' | t }}</a>
          }
        </div>
      </div>

      <section class="card pad">
        <h3>{{ 'detail.facilities' | t }}</h3>
        <div class="facility-grid">
          @for (f of p.facilities; track f) { <span class="facility">{{ icons[f] || '•' }} {{ labels[f] || f }}</span> }
        </div>
      </section>

      <section class="card pad">
        <h3>{{ 'detail.rooms' | t }}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ 'common.floor' | t }}</th><th>{{ 'common.room' | t }}</th><th>{{ 'filters.sharing' | t }}</th><th>AC</th>
              <th>{{ 'owner.dailyRent' | t }}</th><th>{{ 'owner.weeklyRent' | t }}</th><th>{{ 'owner.monthlyRent' | t }}</th><th>{{ 'bed.AVAILABLE' | t }}</th></tr></thead>
            <tbody>
              @for (fl of p.floors; track fl.floorNumber) {
                @for (r of fl.rooms; track r.id) {
                  <tr><td>{{ fl.floorNumber === 0 ? ('common.ground' | t) : fl.floorNumber }}</td><td>{{ r.roomNumber }}</td>
                    <td>{{ 'common.sharing' | t: { n: r.sharingType } }}</td><td>{{ r.ac ? '❄️' : '—' }}</td>
                    <td>₹{{ r.dailyRent | number }}</td><td>₹{{ r.weeklyRent | number }}</td><td>₹{{ r.monthlyRent | number }}</td>
                    <td>{{ r.availableBeds }}/{{ r.beds.length }}</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (p.houseRules) {
        <section class="card pad"><h3>{{ 'detail.rules' | t }}</h3><p class="pre">{{ p.houseRules }}</p></section>
      }
    } @else if (error()) {
      <p class="alert error">{{ error() }}</p>
    } @else {
      <p class="muted">{{ 'common.loading' | t }}</p>
    }
  `
})
export class PgDetailComponent implements OnInit {
  id = input.required<string>();
  private api = inject(ApiService);
  auth = inject(AuthService);
  pg = signal<PgDetail | null>(null);
  error = signal('');
  icons = FACILITY_ICONS;
  labels = FACILITY_LABELS;
  images = computed(() => (this.pg()?.media ?? []).filter(m => m.mediaType === 'IMAGE').map(m => ApiService.mediaUrl(m.url)));
  videos = computed(() => (this.pg()?.media ?? []).filter(m => m.mediaType === 'VIDEO').map(m => ApiService.mediaUrl(m.url)));

  ngOnInit(): void {
    this.api.pg(+this.id()).subscribe({ next: p => this.pg.set(p), error: () => this.error.set('PG not found') });
  }
}
