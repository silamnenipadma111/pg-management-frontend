import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.service';
import { PgDetail } from '../../core/models';
import { FACILITY_LABELS } from '../../core/translations';
import { CarouselComponent } from '../../shared/carousel.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-pg-detail',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, RouterLink, CarouselComponent, IconComponent],
  template: `
    <div class="container page">
      <a routerLink="/" class="back-link"><app-icon name="arrow-left" [size]="14" /> {{ 'common.back' | t }}</a>
      @if (pg(); as p) {
        <div class="detail-grid">
          <div class="detail-main">
            <div class="detail-gallery"><app-carousel [images]="images()" [alt]="p.name" /></div>
            @if (videos().length) {
              <div class="videos">
                @for (v of videos(); track v) { <video [src]="v" controls preload="metadata"></video> }
              </div>
            }

            <header class="detail-head">
              <p class="eyebrow">{{ 'gender.' + p.genderPreference | t }} · {{ p.area }}, {{ p.city }}</p>
              <h1 class="display">{{ p.name }}</h1>
              <p class="muted"><app-icon name="map-pin" [size]="15" />
                {{ p.addressLine }}, {{ p.area }}, {{ p.city }}, {{ p.state }} – {{ p.pincode }}</p>
            </header>
            @if (p.description) { <p class="lead">{{ p.description }}</p> }

            <section class="card pad">
              <p class="eyebrow">{{ 'detail.facilitiesEyebrow' | t }}</p>
              <h2 class="display">{{ 'detail.facilities' | t }}</h2>
              <ul class="facility-grid">
                @for (f of p.facilities; track f) { <li>{{ labels[f] || f }}</li> }
              </ul>
            </section>

            <section class="card ledger">
              <div class="ledger-head">
                <p class="eyebrow">{{ 'detail.roomsEyebrow' | t }}</p>
                <h2 class="display">{{ 'detail.rooms' | t }}</h2>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{{ 'common.floor' | t }}</th><th>{{ 'common.room' | t }}</th><th>{{ 'filters.sharing' | t }}</th>
                      <th>{{ 'common.ac' | t }}</th><th>{{ 'owner.dailyRent' | t }}</th><th>{{ 'owner.weeklyRent' | t }}</th>
                      <th>{{ 'owner.monthlyRent' | t }}</th><th>{{ 'bed.AVAILABLE' | t }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (fl of p.floors; track fl.floorNumber) {
                      @for (r of fl.rooms; track r.id) {
                        <tr>
                          <td>{{ fl.floorNumber === 0 ? ('common.ground' | t) : fl.floorNumber }}</td>
                          <td>{{ r.roomNumber }}</td>
                          <td>{{ 'common.sharing' | t: { n: r.sharingType } }}</td>
                          <td>{{ (r.ac ? 'common.ac' : 'common.nonAc') | t }}</td>
                          <td>₹{{ r.dailyRent | number }}</td><td>₹{{ r.weeklyRent | number }}</td>
                          <td><b>₹{{ r.monthlyRent | number }}</b></td>
                          <td>{{ r.availableBeds }} / {{ r.beds.length }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </section>

            @if (p.houseRules) {
              <section class="card pad">
                <p class="eyebrow">{{ 'detail.rulesEyebrow' | t }}</p>
                <h2 class="display">{{ 'detail.rules' | t }}</h2>
                <p class="pre">{{ p.houseRules }}</p>
              </section>
            }
          </div>

          <aside class="card reserve-panel">
            <p class="eyebrow">{{ 'booking.reserve' | t }}</p>
            <p class="reserve-price">₹{{ p.minRent | number }}
              @if (p.maxRent > p.minRent) { <span>– ₹{{ p.maxRent | number }}</span> }
              <small>{{ 'common.perMonth' | t }}</small>
            </p>
            <p class="status-line"><i class="live-dot" [class.off]="!p.availableBeds"></i>
              {{ p.availableBeds ? ('common.bedsAvailable' | t: { n: p.availableBeds }) : ('card.full' | t) }}
              <span class="muted">/ {{ p.totalBeds }}</span></p>

            <dl class="summary">
              <div><dt>{{ 'filters.sharing' | t }}</dt><dd>{{ p.sharingTypes.join(', ') }}</dd></div>
              <div><dt>{{ 'detail.host' | t }}</dt><dd>{{ p.ownerName }}</dd></div>
              <div><dt>{{ 'detail.contact' | t }}</dt><dd><a [href]="'tel:' + p.contactPhone">{{ p.contactPhone }}</a></dd></div>
            </dl>

            @switch (auth.role()) {
              @case ('CUSTOMER') {
                <a class="btn btn-primary block" [routerLink]="['/pgs', p.id, 'book']">
                  {{ 'detail.goBooking' | t }} <app-icon name="arrow-right" [size]="14" />
                </a>
              }
              @case ('OWNER') {
                @if (mine()) {
                  <a class="btn btn-primary block" [routerLink]="['/owner/pgs', p.id, 'edit']">
                    <app-icon name="edit" [size]="14" /> {{ 'card.edit' | t }}
                  </a>
                }
              }
              @case (null) {
                <a class="btn btn-primary block" routerLink="/signin"
                   [queryParams]="{ reason: 'login', returnUrl: '/pgs/' + p.id + '/book' }">
                  {{ 'detail.signinToBook' | t }}
                </a>
              }
            }
            @if (mapUrl(); as url) {
              <a class="btn btn-outline block" target="_blank" rel="noopener noreferrer" [href]="url">
                <app-icon name="map-pin" [size]="14" /> {{ 'detail.location' | t }}
              </a>
            }
            @if (p.registeredVia === 'CUSTOMER_CARE') {
              <p class="fine-print"><app-icon name="headset" [size]="13" /> {{ 'detail.registeredViaCare' | t }}</p>
            }
          </aside>
        </div>
      } @else if (error()) {
        <p class="alert error" role="alert">{{ error() }}</p>
      } @else {
        <div class="skeleton skeleton-block"></div>
      }
    </div>
  `
})
export class PgDetailComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly pg = signal<PgDetail | null>(null);
  readonly error = signal('');
  readonly labels = FACILITY_LABELS;
  readonly images = computed(() => this.media('IMAGE'));
  readonly videos = computed(() => this.media('VIDEO'));
  readonly mine = computed(() => this.pg()?.ownerName === this.auth.user()?.name);
  readonly mapUrl = computed(() => {
    const p = this.pg();
    return p?.latitude && p.longitude ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : null;
  });

  ngOnInit(): void {
    this.api.pg(+this.id()).subscribe({ next: p => this.pg.set(p), error: err => this.error.set(errorMessage(err)) });
  }

  private media(type: 'IMAGE' | 'VIDEO'): string[] {
    return (this.pg()?.media ?? []).filter(m => m.mediaType === type).map(m => ApiService.mediaUrl(m.url));
  }
}
