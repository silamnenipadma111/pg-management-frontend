import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n.service';
import { PgSummary } from '../core/models';
import { FACILITY_ICONS, FACILITY_LABELS } from '../core/translations';
import { CarouselComponent } from './carousel.component';

@Component({
  selector: 'app-pg-card',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, CarouselComponent],
  template: `
    @let p = pg();
    <article class="card pg-card">
      <app-carousel [images]="images()" [alt]="p.name" />
      <div class="pg-card-body">
        <div class="row-between">
          <h3>{{ p.name }}</h3>
          <span class="tag tag-{{ p.genderPreference.toLowerCase() }}">{{ 'gender.' + p.genderPreference | t }}</span>
        </div>
        <p class="muted">📍 {{ p.area }}, {{ p.city }}
          @if (p.distanceKm != null) { · {{ 'common.kmAway' | t: { km: p.distanceKm } }} }
        </p>
        <p class="price">₹{{ p.minRent | number }} <small>{{ 'common.perMonth' | t }}</small>
          @if (p.maxRent > p.minRent) { <small class="muted">– ₹{{ p.maxRent | number }}</small> }
        </p>
        <div class="chips">
          @for (s of p.sharingTypes; track s) { <span class="chip small">{{ 'common.sharing' | t: { n: s } }}</span> }
          <span class="chip small">{{ p.hasAc ? ('common.ac' | t) + ' / ' + ('common.nonAc' | t) : ('common.nonAc' | t) }}</span>
        </div>
        <div class="facilities">
          @for (f of p.facilities.slice(0, 6); track f) { <span [title]="labels[f] || f">{{ icons[f] || '•' }} {{ labels[f] || f }}</span> }
        </div>
        <p class="avail" [class.none]="p.availableBeds === 0">{{ 'common.bedsAvailable' | t: { n: p.availableBeds } }}</p>
        <div class="card-actions">
          <button class="btn btn-outline" (click)="go('info')">{{ 'card.moreInfo' | t }}</button>
          <button class="btn btn-primary" (click)="go('book')" [disabled]="p.availableBeds === 0">{{ 'card.book' | t }}</button>
        </div>
      </div>
    </article>
  `
})
export class PgCardComponent {
  pg = input.required<PgSummary>();
  private auth = inject(AuthService);
  private router = inject(Router);
  icons = FACILITY_ICONS;
  labels = FACILITY_LABELS;
  images = computed(() => this.pg().images.map(i => ApiService.mediaUrl(i)));

  go(target: 'info' | 'book'): void {
    const url = target === 'info' ? `/pgs/${this.pg().id}` : `/pgs/${this.pg().id}/book`;
    if (!this.auth.loggedIn()) {
      this.router.navigate(['/signin'], { queryParams: { returnUrl: url, role: 'CUSTOMER', reason: 'login' } });
      return;
    }
    if (target === 'book' && this.auth.role() !== 'CUSTOMER') {
      this.router.navigate([`/pgs/${this.pg().id}`]);
      return;
    }
    this.router.navigateByUrl(url);
  }
}
