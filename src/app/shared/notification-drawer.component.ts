import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TranslatePipe } from '../core/i18n.service';
import { AppNotification } from '../core/models';
import { UiService } from '../core/ui.service';
import { IconComponent } from './icon.component';

/** Slide-over panel with the latest notifications (booking requests, approvals, payments, reminders). */
@Component({
  selector: 'app-notification-drawer',
  standalone: true,
  imports: [TranslatePipe, DatePipe, IconComponent],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (ui.notificationsOpen()) {
      <div class="drawer-layer no-print">
        <button type="button" class="drawer-backdrop" (click)="close()" [attr.aria-label]="'common.close' | t"></button>
        <aside class="drawer drawer-right" role="dialog" aria-modal="true" [attr.aria-label]="'nav.notifications' | t">
          <div class="drawer-head">
            <div>
              <p class="eyebrow">{{ 'notif.eyebrow' | t }}</p>
              <h3 class="display">{{ 'nav.notifications' | t }}</h3>
            </div>
            <button type="button" class="icon-btn" (click)="close()" [attr.aria-label]="'common.close' | t">
              <app-icon name="x" [size]="18" />
            </button>
          </div>

          <div class="drawer-body">
            @if (loading()) {
              <p class="muted">{{ 'common.loading' | t }}</p>
            } @else {
              @for (n of items(); track n.id) {
                <button type="button" class="notice" [class.unread]="!n.read" (click)="open(n)">
                  <span class="notice-head">
                    <span class="notice-title">{{ n.title }}</span>
                    <span class="notice-time">{{ n.createdAt | date: 'd MMM, h:mm a' }}</span>
                  </span>
                  <span class="notice-text">{{ n.message }}</span>
                </button>
              } @empty {
                <p class="empty">{{ 'notif.empty' | t }}</p>
              }
            }
          </div>

          <button type="button" class="btn btn-primary block" (click)="readAll()" [disabled]="!hasUnread()">
            {{ 'notif.markAll' | t }}
          </button>
        </aside>
      </div>
    }
  `
})
export class NotificationDrawerComponent {
  readonly ui = inject(UiService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      if (this.ui.notificationsOpen()) {
        this.load();
      }
    });
  }

  hasUnread(): boolean {
    return this.items().some(n => !n.read);
  }

  close(): void {
    this.ui.notificationsOpen.set(false);
  }

  open(n: AppNotification): void {
    this.api.markRead(n.id).subscribe({
      next: () => this.follow(n),
      error: () => this.follow(n)
    });
  }

  readAll(): void {
    this.api.markAllRead().subscribe(() => this.items.update(list => list.map(n => ({ ...n, read: true }))));
  }

  private follow(n: AppNotification): void {
    this.items.update(list => list.map(item => (item.id === n.id ? { ...item, read: true } : item)));
    if (n.link?.startsWith('/')) {
      this.close();
      void this.router.navigateByUrl(n.link);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api.notifications().subscribe({
      next: r => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
