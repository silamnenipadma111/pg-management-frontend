import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { UiService } from '../core/ui.service';
import { IconComponent } from './icon.component';

/**
 * Account menu in the header. Collapsed it shows only the name; clicking it expands a panel with the name,
 * the role and the current address (when location is enabled) plus the location controls and sign out.
 */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  host: {
    class: 'user-menu',
    '(document:click)': 'closeIfOutside($event)',
    '(document:keydown.escape)': 'open.set(false)'
  },
  template: `
    @if (auth.user(); as user) {
      <button type="button" class="user-trigger" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-haspopup="dialog">
        <span class="avatar">{{ initials() }}</span>
        <span class="user-name">{{ user.name }}</span>
        <app-icon name="chevron-down" [size]="16" />
      </button>
      @if (open()) {
        <div class="user-panel" role="dialog" [attr.aria-label]="'user.account' | t">
          <p class="eyebrow">{{ 'user.signedInAs' | t }}</p>
          <p class="user-full">{{ user.name }}</p>
          <p class="user-role"><span class="pill pill-gold">{{ 'role.' + user.role | t }}</span></p>
          <p class="muted small user-email">{{ user.email }}</p>

          <div class="user-section">
            <p class="eyebrow">{{ 'user.currentAddress' | t }}</p>
            @if (location.coords()) {
              <p class="user-address">
                <app-icon name="map-pin" [size]="16" />
                <span>{{ location.fullAddress() || ('user.findingAddress' | t) }}</span>
              </p>
              <p class="status-line"><span class="live-dot"></span>{{ 'user.locationOn' | t }}
                @if (location.approximate()) { <span class="muted">· {{ 'user.approximate' | t }}</span> }
              </p>
              <div class="panel-links">
                <button type="button" class="link-btn" (click)="enable()" [disabled]="location.locating()">{{ 'home.refreshLocation' | t }}</button>
                <button type="button" class="link-btn" (click)="turnOff()">{{ 'user.turnOff' | t }}</button>
              </div>
            } @else {
              <p class="muted small">{{ 'user.locationOff' | t }}</p>
              <button type="button" class="btn btn-outline btn-sm block" (click)="enable()" [disabled]="location.locating()">
                <app-icon name="locate" [size]="16" />
                {{ (location.locating() ? 'welcome.locating' : 'user.enableLocation') | t }}
              </button>
              @if (error()) { <p class="field-error">{{ error() | t }}</p> }
            }
          </div>

          <button type="button" class="btn btn-ghost block" (click)="signout()">
            <app-icon name="log-out" [size]="16" /> {{ 'nav.logout' | t }}
          </button>
        </div>
      }
    }
  `
})
export class UserMenuComponent {
  readonly auth = inject(AuthService);
  readonly location = inject(LocationService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly open = signal(false);
  readonly error = signal('');
  readonly initials = computed(() => initialsOf(this.auth.user()?.name ?? ''));

  closeIfOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  async enable(): Promise<void> {
    this.error.set('');
    if (!(await this.location.request())) {
      this.error.set('location.' + this.location.status());
    }
  }

  turnOff(): void {
    this.location.set(null);
    this.location.dismiss();
  }

  signout(): void {
    this.open.set(false);
    this.auth.signout().subscribe(() => {
      this.ui.show('You have been signed out.');
      void this.router.navigate(['/']);
    });
  }
}

/** "Anil Varma" -> "AV" */
export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '?';
}
