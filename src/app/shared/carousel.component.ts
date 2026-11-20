import { Component, input, signal } from '@angular/core';
import { IconComponent } from './icon.component';

/** Shown when a photo URL cannot be loaded, instead of the browser's broken-image icon. */
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#EAE3D8"/></svg>');

/** Image slider with previous / next arrows and dots. */
@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="carousel">
      @if (images().length) {
        <img [src]="images()[index()]" [alt]="alt() + ' - photo ' + (index() + 1)" loading="lazy" (error)="onError($event)" />
        @if (images().length > 1) {
          <button type="button" class="carousel-nav prev" (click)="step(-1, $event)" aria-label="Previous photo">
            <app-icon name="chevron-left" [size]="18" />
          </button>
          <button type="button" class="carousel-nav next" (click)="step(1, $event)" aria-label="Next photo">
            <app-icon name="chevron-right" [size]="18" />
          </button>
          <div class="carousel-dots" aria-hidden="true">
            @for (img of images(); track $index) { <span [class.on]="$index === index()"></span> }
          </div>
        }
      } @else {
        <div class="no-image"><app-icon name="home" [size]="40" [stroke]="1.2" /></div>
      }
    </div>
  `
})
export class CarouselComponent {
  images = input<string[]>([]);
  alt = input('PG');
  index = signal(0);

  step(delta: number, event: Event): void {
    event.stopPropagation();
    const count = this.images().length;
    this.index.set((this.index() + delta + count) % count);
  }

  onError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = PLACEHOLDER;
    }
  }
}
