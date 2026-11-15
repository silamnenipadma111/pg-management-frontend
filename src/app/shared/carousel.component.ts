import { Component, input, signal } from '@angular/core';

/** Image slider with previous / next arrows and dots. */
@Component({
  selector: 'app-carousel',
  standalone: true,
  template: `
    <div class="carousel" [style.height]="height()">
      @if (images().length) {
        <img [src]="images()[index()]" [alt]="alt() + ' photo ' + (index() + 1)" loading="lazy" />
        @if (images().length > 1) {
          <button class="nav prev" (click)="prev($event)" aria-label="Previous photo">‹</button>
          <button class="nav next" (click)="next($event)" aria-label="Next photo">›</button>
          <div class="dots">
            @for (img of images(); track $index) {
              <span [class.on]="$index === index()" (click)="index.set($index)"></span>
            }
          </div>
          <span class="counter">{{ index() + 1 }}/{{ images().length }}</span>
        }
      } @else {
        <div class="no-image">🏠</div>
      }
    </div>
  `
})
export class CarouselComponent {
  images = input<string[]>([]);
  alt = input('PG');
  height = input('220px');
  index = signal(0);

  next(e: Event): void {
    e.stopPropagation();
    this.index.set((this.index() + 1) % this.images().length);
  }

  prev(e: Event): void {
    e.stopPropagation();
    this.index.set((this.index() - 1 + this.images().length) % this.images().length);
  }
}
