import { Component, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n.service';

/** The eight-petal lotus mark with the stacked PG-STAY.IN wordmark. */
@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <span class="brand-mark" [class.on-dark]="onDark()">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
        <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M32 6C36.5 14 36.5 23 32 31C27.5 23 27.5 14 32 6Z" />
          <path d="M32 58C36.5 50 36.5 41 32 33C27.5 41 27.5 50 32 58Z" />
          <path d="M6 32C14 27.5 23 27.5 31 32C23 36.5 14 36.5 6 32Z" />
          <path d="M58 32C50 27.5 41 27.5 33 32C41 36.5 50 36.5 58 32Z" />
          <path d="M13.6 13.6C22.4 16.5 28.8 22.9 31.3 31.3C22.9 28.8 16.5 22.4 13.6 13.6Z" />
          <path d="M50.4 50.4C41.6 47.5 35.2 41.1 32.7 32.7C41.1 35.2 47.5 41.6 50.4 50.4Z" />
          <path d="M50.4 13.6C47.5 22.4 41.1 28.8 32.7 31.3C35.2 22.9 41.6 16.5 50.4 13.6Z" />
          <path d="M13.6 50.4C16.5 41.6 22.9 35.2 31.3 32.7C28.8 41.1 22.4 47.5 13.6 50.4Z" />
          <circle cx="32" cy="32" r="2.2" fill="currentColor" />
        </g>
      </svg>
    </span>
    <span class="brand-text" [class.on-dark]="onDark()">
      <span class="brand-name">PG-STAY</span>
      @if (!compact()) { <span class="brand-tag">{{ 'app.brandTag' | t }}</span> }
    </span>
  `,
  host: { class: 'brand' }
})
export class BrandComponent {
  /** Light version for the dark footer. */
  onDark = input(false);
  /** Hides the tagline. */
  compact = input(false);
}
