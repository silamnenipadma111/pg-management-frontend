import { Component, inject, signal } from '@angular/core';
import { I18nService, LANGUAGES, Lang, TranslatePipe } from '../core/i18n.service';
import { LocationService } from '../core/location.service';

/** First-visit overlay shown on top of the home page: pick a language and allow location access. */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="overlay">
      <div class="modal welcome">
        <h2>🏠 {{ 'welcome.title' | t }}</h2>
        <p class="muted">{{ 'app.tagline' | t }}</p>
        <h4>{{ 'welcome.chooseLang' | t }}</h4>
        <div class="lang-options">
          @for (l of languages; track l.code) {
            <button class="chip" [class.selected]="selected() === l.code" (click)="pick(l.code)">{{ l.label }}</button>
          }
        </div>
        <h4>📍 {{ 'welcome.location' | t }}</h4>
        @if (location.status() === 'granted') {
          <p class="ok">✔ {{ location.coords()?.lat }}, {{ location.coords()?.lng }}</p>
        } @else if (location.status() === 'denied' || location.status() === 'unsupported') {
          <p class="warn">{{ 'welcome.denied' | t }}</p>
        } @else if (locating()) {
          <p class="muted">{{ 'welcome.locating' | t }}</p>
        }
        <div class="actions">
          @if (location.status() !== 'granted') {
            <button class="btn btn-primary" (click)="allow()" [disabled]="locating()">{{ 'welcome.allow' | t }}</button>
            <button class="btn btn-ghost" (click)="done()">{{ 'welcome.skip' | t }}</button>
          } @else {
            <button class="btn btn-primary" (click)="done()">{{ 'welcome.continue' | t }}</button>
          }
        </div>
      </div>
    </div>
  `
})
export class WelcomeComponent {
  private i18n = inject(I18nService);
  location = inject(LocationService);
  languages = LANGUAGES;
  selected = signal<Lang>(this.i18n.lang());
  locating = signal(false);

  pick(l: Lang): void {
    this.selected.set(l);
    this.i18n.lang.set(l);
  }

  async allow(): Promise<void> {
    this.locating.set(true);
    const c = await this.location.request();
    this.locating.set(false);
    if (c) {
      this.done();
    }
  }

  done(): void {
    this.i18n.setLang(this.selected());
  }
}
