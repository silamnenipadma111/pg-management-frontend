import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.service';
import { LocationService } from '../../core/location.service';
import { GenderPreference, PgDetail, PgSummary, PreviousStay, SearchFilters } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { IconComponent } from '../../shared/icon.component';
import { PgCardComponent } from '../../shared/pg-card.component';

const DEFAULT_RADIUS_KM = 10;
const EMPTY: SearchFilters = { q: '', city: '', sharing: null, gender: '', ac: null, radiusKm: DEFAULT_RADIUS_KM, sort: '' };
const HERO_IMAGE = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=80';

/**
 * Home page. Visitors and customers search PGs (nearest first once location is allowed) and customers also
 * see the PGs they stayed at before; a signed-in owner sees their own registered PGs instead.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, PgCardComponent, IconComponent],
  template: `
    <section class="hero" [class.hero-compact]="isOwner()">
      @if (!heroFailed()) {
        <img class="hero-bg" [src]="heroImage" alt="" (error)="heroFailed.set(true)" />
      }
      <div class="hero-scrim"></div>
      <div class="container hero-content">
        @if (isOwner()) {
          <p class="eyebrow eyebrow-light reveal">{{ 'home.ownerEyebrow' | t }}</p>
          <h1 class="display reveal">{{ 'home.welcomeBack' | t }}<br /><em>{{ auth.user()?.name }}</em></h1>
          <p class="hero-sub reveal">{{ 'home.ownerSub' | t }}</p>
          <div class="hero-actions reveal">
            <a routerLink="/owner/register-pg" class="btn btn-primary btn-lg">{{ 'owner.registerTitle' | t }} <app-icon name="arrow-right" [size]="16" /></a>
            <a routerLink="/owner/dashboard" class="btn btn-on-dark btn-lg">{{ 'home.openDashboard' | t }}</a>
          </div>
        } @else {
          <p class="eyebrow eyebrow-light reveal">{{ 'home.heroEyebrow' | t }}</p>
          <h1 class="display reveal">{{ 'home.heroLine1' | t }}<br /><em>{{ 'home.heroLine2' | t }}</em></h1>
          <p class="hero-sub reveal">{{ 'home.subtitle' | t }}</p>
          <div class="hero-actions reveal">
            <button type="button" class="btn btn-primary btn-lg" (click)="scrollToStays()">
              {{ 'home.heroCta' | t }} <app-icon name="arrow-right" [size]="16" />
            </button>
            @if (!auth.loggedIn()) {
              <a routerLink="/signup" [queryParams]="{ role: 'OWNER' }" class="btn btn-on-dark btn-lg">{{ 'home.listYourPg' | t }}</a>
            }
          </div>
        }
      </div>
    </section>

    @if (isOwner()) {
      <section class="container section">
        <div class="section-head">
          <p class="eyebrow">{{ 'home.ownerListEyebrow' | t }}</p>
          <h2 class="display">{{ 'home.ownerListTitle' | t }}</h2>
          @if (myPgs().length) {
            <p class="muted">{{ 'home.ownerListSub' | t: { n: myPgs().length, beds: ownerAvailableBeds() } }}</p>
          }
        </div>
        @if (loading()) {
          <div class="pg-grid">
            @for (i of placeholders; track i) { <div class="pg-card skeleton"></div> }
          </div>
        } @else if (error()) {
          <p class="alert error">{{ error() }}</p>
        } @else if (!myPgs().length) {
          <div class="empty-state">
            <span class="medallion medallion-lg"><app-icon name="home" [size]="26" /></span>
            <h3 class="display">{{ 'dash.noPgs' | t }}</h3>
            <p class="muted">{{ 'home.ownerEmpty' | t }}</p>
            <a routerLink="/owner/register-pg" class="btn btn-primary">{{ 'owner.registerTitle' | t }}</a>
          </div>
        } @else {
          <div class="pg-grid">
            @for (p of myPgs(); track p.id) { <app-pg-card [pg]="p" [owned]="true" /> }
          </div>
        }
      </section>
    } @else {
      <div class="container">
        <form class="search-card" (ngSubmit)="search()">
          <div class="search-fields">
            <div class="search-field grow">
              <span class="field-tile"><app-icon name="search" /></span>
              <label for="home-q">
                <span class="field-label">{{ 'filters.searchLabel' | t }}</span>
                <input id="home-q" name="q" [(ngModel)]="f.q" [placeholder]="'filters.search' | t" maxlength="80" autocomplete="off" />
              </label>
            </div>
            <div class="search-field">
              <span class="field-tile"><app-icon name="map-pin" /></span>
              <label for="home-city">
                <span class="field-label">{{ 'filters.city' | t }}</span>
                <select id="home-city" name="city" [(ngModel)]="f.city" (ngModelChange)="search()">
                  <option value="">{{ 'filters.anyCity' | t }}</option>
                  @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </label>
            </div>
            <div class="search-field">
              <span class="field-tile"><app-icon name="users" /></span>
              <label for="home-sharing">
                <span class="field-label">{{ 'filters.sharing' | t }}</span>
                <select id="home-sharing" name="sharing" [(ngModel)]="f.sharing" (ngModelChange)="search()">
                  <option [ngValue]="null">{{ 'filters.any' | t }}</option>
                  @for (s of sharingOptions; track s) { <option [ngValue]="s">{{ 'common.sharing' | t: { n: s } }}</option> }
                </select>
              </label>
            </div>
            <button class="btn btn-primary search-submit" type="submit">{{ 'filters.searchAction' | t }}</button>
          </div>
          <div class="search-foot">
            <span class="search-status"><span class="live-dot"></span>
              @if (location.coords() && activeRadius()) {
                {{ 'home.locationOn' | t: { km: activeRadius() ?? 0 } }}
              } @else {
                {{ 'home.searchHint' | t }}
              }
            </span>
            @if (location.coords()) {
              <button type="button" class="link-btn" (click)="location.set(null)">{{ 'home.locationOff' | t }}</button>
            } @else {
              <button type="button" class="link-btn" (click)="ui.locationPromptOpen.set(true)">
                <app-icon name="locate" [size]="14" /> {{ 'home.useLocation' | t }}
              </button>
            }
          </div>
        </form>
      </div>

      @if (previous().length) {
        <section class="container section section-tight">
          <div class="section-head">
            <p class="eyebrow">{{ 'home.previousEyebrow' | t }}</p>
            <h2 class="display">{{ 'home.previousTitle' | t }}</h2>
            <p class="muted">{{ 'home.previousSub' | t }}</p>
          </div>
          <div class="pg-grid">
            @for (stay of previous(); track stay.pg.id) {
              <app-pg-card [pg]="stay.pg" [note]="('home.stayedSince' | t) + ' ' + (stay.lastStayFrom | date: 'MMM y')" />
            }
          </div>
        </section>
      }

      <section id="stays" class="container section">
        <div class="section-head">
          <p class="eyebrow">{{ 'home.sectionEyebrow' | t }}</p>
          <h2 class="display">{{ (location.coords() ? 'home.nearby' : 'home.all') | t }}</h2>
          <p class="muted">{{ 'home.sectionSub' | t }}</p>
        </div>

        <div class="pill-row" role="group" [attr.aria-label]="'filters.gender' | t">
          @for (g of genders; track g.value) {
            <button type="button" class="filter-pill" [class.active]="f.gender === g.value" (click)="pickGender(g.value)">{{ g.label | t }}</button>
          }
        </div>

        <div class="refine-row">
          <select name="ac" [(ngModel)]="f.ac" (ngModelChange)="search()" [attr.aria-label]="'filters.ac' | t">
            <option [ngValue]="null">{{ 'filters.ac' | t }}</option>
            <option [ngValue]="true">{{ 'common.ac' | t }}</option>
            <option [ngValue]="false">{{ 'common.nonAc' | t }}</option>
          </select>
          @if (location.coords()) {
            <select name="radiusKm" [(ngModel)]="f.radiusKm" (ngModelChange)="search()" [attr.aria-label]="'filters.radius' | t">
              @for (r of radiusOptions; track r) { <option [ngValue]="r">{{ 'filters.within' | t: { km: r } }}</option> }
              <option [ngValue]="null">{{ 'filters.anyDistance' | t }}</option>
            </select>
          }
          <select name="sort" [(ngModel)]="f.sort" (ngModelChange)="search()" [attr.aria-label]="'filters.sort' | t">
            <option value="">{{ 'filters.sort' | t }}</option>
            @if (location.coords()) { <option value="DISTANCE">{{ 'sort.DISTANCE' | t }}</option> }
            <option value="PRICE_ASC">{{ 'sort.PRICE_ASC' | t }}</option>
            <option value="PRICE_DESC">{{ 'sort.PRICE_DESC' | t }}</option>
            <option value="AVAILABILITY">{{ 'sort.AVAILABILITY' | t }}</option>
          </select>
          <button class="btn btn-ghost btn-sm" type="button" (click)="reset()">{{ 'filters.reset' | t }}</button>
          <span class="results-count" aria-live="polite">
            @if (!loading() && !error()) {
              {{ 'home.results' | t: { n: pgs().length } }}
              @if (widened()) { · {{ 'home.widened' | t }} }
            }
          </span>
        </div>

        @if (loading()) {
          <div class="pg-grid">
            @for (i of placeholders; track i) { <div class="pg-card skeleton"></div> }
          </div>
        } @else if (error()) {
          <p class="alert error">{{ error() }}</p>
        } @else if (!pgs().length) {
          <div class="empty-state">
            <span class="medallion medallion-lg"><app-icon name="search" [size]="26" /></span>
            <h3 class="display">{{ 'home.noResultsTitle' | t }}</h3>
            <p class="muted">{{ 'home.noResults' | t }}</p>
            <button type="button" class="btn btn-outline" (click)="reset()">{{ 'filters.reset' | t }}</button>
          </div>
        } @else {
          <div class="pg-grid">
            @for (p of pgs(); track p.id) { <app-pg-card [pg]="p" /> }
          </div>
        }
      </section>

      <section class="band">
        <div class="container">
          <div class="section-head">
            <p class="eyebrow">{{ 'home.howEyebrow' | t }}</p>
            <h2 class="display">{{ 'home.howTitle' | t }}</h2>
          </div>
          <div class="pillars">
            @for (step of steps; track step.title) {
              <div class="pillar">
                <span class="medallion medallion-lg"><app-icon [name]="step.icon" [size]="24" [stroke]="1.5" /></span>
                <h3 class="display">{{ step.title | t }}</h3>
                <p>{{ step.text | t }}</p>
              </div>
            }
          </div>
          <p class="band-foot">
            {{ 'home.ownerPitch' | t }}
            @if (auth.loggedIn()) {
              <button type="button" class="link-btn" (click)="ui.assistantOpen.set(true)">{{ 'nav.assistant' | t }}</button>
            } @else {
              <a routerLink="/signup" [queryParams]="{ role: 'OWNER' }">{{ 'home.listYourPg' | t }}</a>
            }
          </p>
        </div>
      </section>
    }
  `
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly location = inject(LocationService);
  readonly ui = inject(UiService);

  readonly heroImage = HERO_IMAGE;
  readonly heroFailed = signal(false);
  readonly pgs = signal<PgSummary[]>([]);
  readonly myPgs = signal<PgSummary[]>([]);
  readonly previous = signal<PreviousStay[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly widened = signal(false);
  /** Radius the current result list was searched with (null = everywhere). */
  readonly activeRadius = signal<number | null>(null);
  readonly isOwner = computed(() => this.auth.role() === 'OWNER');
  readonly ownerAvailableBeds = computed(() => this.myPgs().reduce((sum, p) => sum + p.availableBeds, 0));

  readonly cities = ['Hyderabad', 'Bengaluru', 'Chennai', 'Pune'];
  readonly sharingOptions = [1, 2, 3, 4, 5];
  readonly radiusOptions = [2, 5, 10, 25, 50];
  readonly placeholders = [1, 2, 3];
  readonly genders: { value: GenderPreference | ''; label: string }[] = [
    { value: '', label: 'home.allStays' },
    { value: 'MALE', label: 'gender.MALE' },
    { value: 'FEMALE', label: 'gender.FEMALE' },
    { value: 'ANY', label: 'gender.ANY' }
  ];
  readonly steps = [
    { icon: 'search', title: 'home.step1Title', text: 'home.step1Text' },
    { icon: 'bed', title: 'home.step2Title', text: 'home.step2Text' },
    { icon: 'wallet', title: 'home.step3Title', text: 'home.step3Text' }
  ];
  f: SearchFilters = { ...EMPTY };

  constructor() {
    // Reload when the visitor signs in / out or when the location changes (e.g. allowed in the pop-up)
    let first = true;
    effect(() => {
      this.auth.role();
      this.location.coords();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.load());
    });
  }

  ngOnInit(): void {
    this.load();
  }

  pickGender(gender: GenderPreference | ''): void {
    this.f.gender = gender;
    this.search();
  }

  reset(): void {
    this.f = { ...EMPTY };
    this.search();
  }

  scrollToStays(): void {
    document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' });
  }

  search(): void {
    const c = this.location.coords();
    // When a city is picked explicitly, don't restrict to the radius around the visitor's location
    const radius = c && !this.f.city ? this.f.radiusKm ?? null : null;
    const filters: SearchFilters = { ...this.f, lat: c?.lat ?? null, lng: c?.lng ?? null, radiusKm: radius };
    this.loading.set(true);
    this.error.set('');
    this.widened.set(false);
    this.api.searchPgs(filters).subscribe({
      next: list => {
        // No PG within the radius of the visitor: fall back to all PGs sorted by distance
        if (!list.length && radius && this.isDefaultSearch()) {
          this.searchEverywhere(filters);
        } else {
          this.show(list, radius);
        }
      },
      error: () => this.fail()
    });
  }

  private load(): void {
    if (this.isOwner()) {
      this.loadOwnerPgs();
      return;
    }
    this.search();
    this.previous.set([]);
    if (this.auth.role() === 'CUSTOMER') {
      this.api.previousStays().subscribe({ next: stays => this.previous.set(stays), error: () => this.previous.set([]) });
    }
  }

  private loadOwnerPgs(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.ownerPgs().subscribe({
      next: list => {
        this.myPgs.set(list.map(toSummary));
        this.loading.set(false);
      },
      error: () => this.fail()
    });
  }

  private searchEverywhere(filters: SearchFilters): void {
    this.api.searchPgs({ ...filters, radiusKm: null, sort: 'DISTANCE' }).subscribe({
      next: all => {
        this.show(all, null);
        this.widened.set(true);
      },
      error: () => this.fail()
    });
  }

  private show(list: PgSummary[], radius: number | null): void {
    this.pgs.set(list);
    this.activeRadius.set(radius);
    this.loading.set(false);
  }

  private fail(): void {
    this.error.set('Unable to load PGs right now. Please try again in a moment.');
    this.loading.set(false);
  }

  private isDefaultSearch(): boolean {
    return !this.f.q && !this.f.city && !this.f.sharing && !this.f.gender && this.f.ac == null;
  }
}

/** The owner API returns full PG details; the listing card needs the summary shape. */
function toSummary(pg: PgDetail): PgSummary {
  return {
    id: pg.id,
    name: pg.name,
    addressLine: pg.addressLine,
    area: pg.area,
    city: pg.city,
    genderPreference: pg.genderPreference,
    facilities: pg.facilities,
    images: pg.media.filter(m => m.mediaType === 'IMAGE').map(m => m.url),
    minRent: pg.minRent,
    maxRent: pg.maxRent,
    sharingTypes: pg.sharingTypes,
    hasAc: pg.floors.some(floor => floor.rooms.some(room => room.ac)),
    availableBeds: pg.availableBeds,
    totalBeds: pg.totalBeds
  };
}
