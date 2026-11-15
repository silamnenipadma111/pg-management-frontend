import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { LocationService } from '../../core/location.service';
import { PgSummary, SearchFilters } from '../../core/models';
import { PgCardComponent } from '../../shared/pg-card.component';

const EMPTY: SearchFilters = { q: '', city: '', sharing: null, minRent: null, maxRent: null, gender: '', ac: null, radiusKm: 10, sort: '' };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, TranslatePipe, PgCardComponent],
  template: `
    <section class="hero">
      <h1>{{ (location.coords() ? 'home.nearby' : 'home.all') | t }}</h1>
      @if (location.coords()) {
        <p class="muted">📍 {{ 'home.locationOn' | t: { km: f.radiusKm || '∞' } }}</p>
      } @else {
        <button class="btn btn-outline btn-sm" (click)="useLocation()">📍 {{ 'home.useLocation' | t }}</button>
      }
    </section>

    <form class="filters card" (ngSubmit)="search()">
      <input class="grow" name="q" [(ngModel)]="f.q" [placeholder]="'filters.search' | t" />
      <select name="city" [(ngModel)]="f.city" [attr.aria-label]="'filters.city' | t">
        <option value="">{{ 'filters.city' | t }}: {{ 'filters.any' | t }}</option>
        @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <select name="sharing" [(ngModel)]="f.sharing" [attr.aria-label]="'filters.sharing' | t">
        <option [ngValue]="null">{{ 'filters.sharing' | t }}: {{ 'filters.any' | t }}</option>
        @for (s of [1, 2, 3, 4, 5]; track s) { <option [ngValue]="s">{{ 'common.sharing' | t: { n: s } }}</option> }
      </select>
      <input type="number" name="minRent" [(ngModel)]="f.minRent" [placeholder]="'filters.minRent' | t" min="0" step="500" />
      <input type="number" name="maxRent" [(ngModel)]="f.maxRent" [placeholder]="'filters.maxRent' | t" min="0" step="500" />
      <select name="gender" [(ngModel)]="f.gender" [attr.aria-label]="'filters.gender' | t">
        <option value="">{{ 'filters.gender' | t }}: {{ 'filters.any' | t }}</option>
        <option value="MALE">{{ 'gender.MALE' | t }}</option>
        <option value="FEMALE">{{ 'gender.FEMALE' | t }}</option>
        <option value="ANY">{{ 'gender.ANY' | t }}</option>
      </select>
      <select name="ac" [(ngModel)]="f.ac" [attr.aria-label]="'filters.ac' | t">
        <option [ngValue]="null">{{ 'filters.ac' | t }}</option>
        <option [ngValue]="true">{{ 'common.ac' | t }}</option>
        <option [ngValue]="false">{{ 'common.nonAc' | t }}</option>
      </select>
      @if (location.coords()) {
        <select name="radiusKm" [(ngModel)]="f.radiusKm" [attr.aria-label]="'filters.radius' | t">
          @for (r of [2, 5, 10, 25, 50]; track r) { <option [ngValue]="r">≤ {{ r }} km</option> }
          <option [ngValue]="null">{{ 'filters.any' | t }}</option>
        </select>
      }
      <select name="sort" [(ngModel)]="f.sort" [attr.aria-label]="'filters.sort' | t">
        <option value="">{{ 'filters.sort' | t }}</option>
        @if (location.coords()) { <option value="DISTANCE">{{ 'sort.DISTANCE' | t }}</option> }
        <option value="PRICE_ASC">{{ 'sort.PRICE_ASC' | t }}</option>
        <option value="PRICE_DESC">{{ 'sort.PRICE_DESC' | t }}</option>
        <option value="AVAILABILITY">{{ 'sort.AVAILABILITY' | t }}</option>
      </select>
      <button class="btn btn-primary" type="submit">{{ 'filters.apply' | t }}</button>
      <button class="btn btn-ghost" type="button" (click)="reset()">{{ 'filters.reset' | t }}</button>
    </form>

    @if (loading()) {
      <p class="muted">{{ 'common.loading' | t }}</p>
    } @else if (error()) {
      <p class="alert error">{{ error() }}</p>
    } @else {
      <p class="muted">{{ 'home.results' | t: { n: pgs().length } }}</p>
      @if (!pgs().length) { <p class="empty">{{ 'home.noResults' | t }}</p> }
      <div class="pg-list">
        @for (p of pgs(); track p.id) { <app-pg-card [pg]="p" /> }
      </div>
    }
  `
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  location = inject(LocationService);
  pgs = signal<PgSummary[]>([]);
  loading = signal(true);
  error = signal('');
  cities = ['Hyderabad', 'Bengaluru', 'Chennai'];
  f: SearchFilters = { ...EMPTY };

  ngOnInit(): void {
    this.search();
  }

  async useLocation(): Promise<void> {
    if (await this.location.request()) {
      this.search();
    }
  }

  reset(): void {
    this.f = { ...EMPTY };
    this.search();
  }

  search(): void {
    const c = this.location.coords();
    const filters: SearchFilters = { ...this.f, lat: c?.lat ?? null, lng: c?.lng ?? null, radiusKm: c ? this.f.radiusKm : null };
    this.loading.set(true);
    this.error.set('');
    this.api.searchPgs(filters).subscribe({
      next: list => {
        // No PG within the radius of the user's location: fall back to showing all PGs sorted by distance
        if (!list.length && c && this.f.radiusKm && this.isDefault()) {
          this.f.radiusKm = null;
          this.search();
          return;
        }
        this.pgs.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load PGs. Please check that the server is running.');
        this.loading.set(false);
      }
    });
  }

  private isDefault(): boolean {
    return !this.f.q && !this.f.city && !this.f.sharing && !this.f.minRent && !this.f.maxRent && !this.f.gender && this.f.ac == null;
  }
}
