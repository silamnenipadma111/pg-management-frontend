import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { AppNotification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [TranslatePipe, DatePipe],
  template: `
    <div class="row-between"><h1>{{ 'nav.notifications' | t }}</h1>
      <button class="btn btn-ghost btn-sm" (click)="readAll()">{{ 'notif.markAll' | t }}</button></div>
    @for (n of items(); track n.id) {
      <div class="card pad list-item notif" [class.unread]="!n.read" (click)="open(n)">
        <b>{{ n.title }}</b> <span class="muted small">{{ n.createdAt | date: 'medium' }}</span>
        <p class="pre">{{ n.message }}</p>
      </div>
    } @empty { <p class="empty">{{ 'notif.empty' | t }}</p> }
  `
})
export class NotificationsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  items = signal<AppNotification[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.notifications().subscribe(r => this.items.set(r.items));
  }

  open(n: AppNotification): void {
    this.api.markRead(n.id).subscribe(() => {
      if (n.link) {
        this.router.navigateByUrl(n.link);
      } else {
        this.load();
      }
    });
  }

  readAll(): void {
    this.api.markAllRead().subscribe(() => this.load());
  }
}
