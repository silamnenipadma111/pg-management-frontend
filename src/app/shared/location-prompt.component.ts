import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { I18nService, LANGUAGES, Lang, TranslatePipe } from '../core/i18n.service';
import { BrowserPermission, LocationService } from '../core/location.service';
import { UiService } from '../core/ui.service';
import { IconComponent } from './icon.component';

/**
 * Pop-up shown when a visitor enters the site (home page): asks to use their location so that the PGs nearest
 * to them are listed first. On the very first visit it also lets them pick the language.
 * It is skipped when the browser has already granted or blocked location, and for owners / customer care.
 */
@Component({
  selector: 'app-location-prompt',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (visible()) {
      <div class="overlay">
        <div class="modal location-modal" role="dialog" aria-modal="true" aria-labelledby="location-title">
          <div class="medallion medallion-lg"><app-icon name="map-pin" [size]="26" /></div>
          <p class="eyebrow">{{ 'loc.eyebrow' | t }}</p>
          <h2 id="location-title" class="display">{{ 'loc.title' | t }}</h2>
          <p class="muted">{{ 'loc.text' | t }}</p>

          @if (!i18n.chosen()) {
            <p class="eyebrow section-eyebrow">{{ 'welcome.chooseLang' | t }}</p>
            <div class="chip-row center-row">
              @for (l of languages; track l.code) {
                <button type="button" class="chip" [class.selected]="language() === l.code" (click)="pick(l.code)">{{ l.label }}</button>
              }
            </div>
          }

          @if (location.coords()) {
            <p class="alert success small"><app-icon name="check-circle" [size]="16" /> {{ 'loc.enabled' | t }}
              @if (location.placeLabel()) { · {{ location.placeLabel() }} }
            </p>
          } @else if (blocked()) {
            <p class="alert info small">{{ 'location.denied' | t }}</p>
          } @else if (error()) {
            <p class="alert error small">{{ error() | t }}</p>
          }

          <div class="modal-actions stacked">
            @if (canAsk()) {
              <button type="button" class="btn btn-primary" (click)="allow()" [disabled]="location.locating()">
                <app-icon name="locate" [size]="16" />
                {{ (location.locating() ? 'welcome.locating' : 'loc.allow') | t }}
              </button>
              <button type="button" class="btn btn-ghost" (click)="finish(true)">{{ 'welcome.skip' | t }}</button>
            } @else {
              <button type="button" class="btn btn-primary" (click)="finish(false)">{{ 'welcome.continue' | t }}</button>
            }
          </div>
          <p class="muted fine-print">{{ 'loc.privacy' | t }}</p>
        </div>
      </div>
    }
  `
})
export class LocationPromptComponent {
  readonly i18n = inject(I18nService);
  readonly location = inject(LocationService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  readonly languages = LANGUAGES;
  readonly language = signal<Lang>(this.i18n.lang());
  readonly error = signal('');
  private readonly permission = signal<BrowserPermission>('unknown');
  private readonly checked = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)),
    { initialValue: this.router.url });
  private readonly onHome = computed(() => this.url().split(/[?#]/)[0] === '/');
  /** Owners see their own PGs on the home page and customer care works in the console: no nearby search. */
  private readonly searchesNearby = computed(() => this.auth.role() !== 'OWNER' && this.auth.role() !== 'SUPPORT');

  readonly blocked = computed(() => this.permission() === 'denied' || this.location.status() === 'denied');
  readonly canAsk = computed(() => !this.location.coords() && !this.blocked());

  readonly visible = computed(() => {
    if (this.ui.locationPromptOpen()) {
      return true;
    }
    if (!this.onHome() || !this.checked()) {
      return false;
    }
    const askLocation = this.searchesNearby() && this.canAsk() && !this.location.dismissed();
    return askLocation || !this.i18n.chosen();
  });

  constructor() {
    effect(() => {
      if (this.onHome() && !this.checked()) {
        untracked(() => void this.checkBrowserPermission());
      }
    });
  }

  pick(lang: Lang): void {
    this.language.set(lang);
    this.i18n.lang.set(lang);
  }

  async allow(): Promise<void> {
    this.error.set('');
    if (await this.location.request()) {
      this.finish(false);
      this.ui.success(this.i18n.t('loc.showingNearby'));
    } else if (!this.blocked()) {
      this.error.set('location.' + this.location.status());
    }
  }

  /** @param declined the visitor chose "not now" - do not ask again during this visit */
  finish(declined: boolean): void {
    if (!this.i18n.chosen()) {
      this.i18n.setLang(this.language());
    }
    if (declined) {
      this.location.dismiss();
    }
    this.ui.locationPromptOpen.set(false);
  }

  /** When the browser already allows location we simply use it; the pop-up is for the "ask me" case. */
  private async checkBrowserPermission(): Promise<void> {
    const permission = await this.location.browserPermission();
    this.permission.set(permission);
    if (permission === 'granted' && this.searchesNearby() && !this.location.coords()) {
      await this.location.request();
    }
    this.checked.set(true);
  }
}
