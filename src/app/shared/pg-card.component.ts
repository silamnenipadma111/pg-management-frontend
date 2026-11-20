import { Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n.service';
import { PgSummary } from '../core/models';
import { FACILITY_LABELS } from '../core/translations';
import { CarouselComponent } from './carousel.component';
import { IconComponent } from './icon.component';

const MEDALLION_ICONS: Record<string, string> = { MALE: 'bed', FEMALE: 'lotus', ANY: 'users' };
const FACILITIES_SHOWN = 4;

/**
 * PG listing card: photo slider with the price and distance, an overlapping medallion, the essentials and two
 * actions below - "More Info" plus "Book a bed" for customers / visitors, or "Edit" for the owner's own PGs.
 */
@Component({
  selector: 'app-pg-card',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, CarouselComponent, IconComponent],
  template: `
    @let p = pg();
    <article class="pg-card">
      <div class="pg-media">
        <app-carousel [images]="images()" [alt]="p.name" />
        <span class="price-pill"><strong>₹{{ p.minRent | number }}</strong><span>{{ 'common.perMonth' | t }}</span></span>
        <span class="pill pill-on-image">{{ 'gender.' + p.genderPreference | t }}</span>
        @if (p.distanceKm !== null && p.distanceKm !== undefined) {
          <span class="distance-pill"><app-icon name="map-pin" [size]="12" />{{ 'common.kmAway' | t: { km: p.distanceKm } }}</span>
        }
      </div>

      <div class="medallion-wrap">
        <span class="medallion medallion-ring"><app-icon [name]="icon()" [size]="22" [stroke]="1.5" /></span>
      </div>

      <div class="pg-body">
        @if (note()) { <p class="eyebrow">{{ note() }}</p> }
        <h3 class="display">{{ p.name }}</h3>
        <p class="pg-place">{{ p.area }}, {{ p.city }}</p>

        <p class="pg-meta">
          <span class="pill" [class.pill-green]="p.availableBeds > 0" [class.pill-red]="p.availableBeds === 0">
            {{ p.availableBeds === 0 ? ('card.full' | t) : ('common.bedsAvailable' | t: { n: p.availableBeds }) }}
          </span>
          @if (p.maxRent > p.minRent) { <span class="muted small">{{ 'card.upTo' | t }} ₹{{ p.maxRent | number }}</span> }
        </p>

        <p class="pg-specs">
          {{ sharing() }} · {{ (p.hasAc ? 'card.acAvailable' : 'common.nonAc') | t }}
        </p>

        <ul class="pg-facilities">
          @for (f of p.facilities.slice(0, facilitiesShown); track f) { <li>{{ labels[f] || f }}</li> }
          @if (p.facilities.length > facilitiesShown) { <li class="more">+{{ p.facilities.length - facilitiesShown }}</li> }
        </ul>

        <div class="card-actions" [class.single]="!showsSecondAction()">
          <button type="button" class="btn btn-outline" (click)="go('info')">{{ 'card.moreInfo' | t }}</button>
          @if (owned()) {
            <button type="button" class="btn btn-primary" (click)="go('edit')">
              <app-icon name="edit" [size]="14" /> {{ 'card.edit' | t }}
            </button>
          } @else if (canBook()) {
            <button type="button" class="btn btn-primary" (click)="go('book')" [disabled]="p.availableBeds === 0">
              {{ 'card.book' | t }}
            </button>
          }
        </div>
      </div>
    </article>
  `
})
export class PgCardComponent {
  pg = input.required<PgSummary>();
  /** The signed-in owner's own PG: the second action is "Edit" instead of "Book a bed". */
  owned = input(false);
  /** Optional line above the name, e.g. "You stayed here". */
  note = input('');

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly labels = FACILITY_LABELS;
  readonly facilitiesShown = FACILITIES_SHOWN;
  readonly images = computed(() => this.pg().images.map(i => ApiService.mediaUrl(i)));
  readonly icon = computed(() => MEDALLION_ICONS[this.pg().genderPreference] ?? 'home');
  readonly sharing = computed(() => this.pg().sharingTypes.join(' / ') + ' sharing');
  /** Only customers (or visitors who will sign in as a customer) can book; owners and customer care cannot. */
  readonly canBook = computed(() => !this.auth.loggedIn() || this.auth.role() === 'CUSTOMER');
  readonly showsSecondAction = computed(() => this.owned() || this.canBook());

  go(target: 'info' | 'book' | 'edit'): void {
    const id = this.pg().id;
    if (target === 'edit') {
      void this.router.navigate(['/owner/pgs', id, 'edit']);
      return;
    }
    const url = target === 'info' ? `/pgs/${id}` : `/pgs/${id}/book`;
    if (this.auth.loggedIn()) {
      void this.router.navigateByUrl(url);
    } else {
      void this.router.navigate(['/signin'], { queryParams: { returnUrl: url, role: 'CUSTOMER', reason: 'login' } });
    }
  }
}
