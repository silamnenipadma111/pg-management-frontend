import { Component, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { PgDetail, PgRequest } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { PgFormComponent } from '../../shared/pg-form.component';

@Component({
  selector: 'app-register-pg',
  standalone: true,
  imports: [PgFormComponent, TranslatePipe, RouterLink, IconComponent],
  template: `
    <div class="container page page-narrow">
      <a routerLink="/" class="back-link"><app-icon name="arrow-left" [size]="14" /> {{ 'nav.myPgs' | t }}</a>
      <header class="page-head">
        <p class="eyebrow">{{ 'role.OWNER' | t }}</p>
        <h1 class="display">{{ (id() ? 'owner.editTitle' : 'owner.registerTitle') | t }}</h1>
        <p class="muted">{{ 'form.intro' | t }}</p>
      </header>
      @if (loadError()) {
        <p class="alert error" role="alert">{{ loadError() }}</p>
      } @else if (!id() || initial()) {
        <app-pg-form [initial]="initial()" [busy]="busy()" (submitted)="save($event)"
                     [submitLabel]="id() ? 'common.save' : 'owner.registerTitle'" />
      } @else {
        <div class="skeleton skeleton-block"></div>
      }
    </div>
  `
})
export class RegisterPgComponent implements OnInit {
  readonly id = input<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly form = viewChild(PgFormComponent);
  readonly initial = signal<PgDetail | null>(null);
  readonly busy = signal(false);
  readonly loadError = signal('');

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.api.ownerPg(+id).subscribe({ next: p => this.initial.set(p), error: err => this.loadError.set(errorMessage(err)) });
    }
  }

  save(req: PgRequest): void {
    const id = this.id();
    this.busy.set(true);
    const call = id ? this.api.updatePg(+id, req) : this.api.createPg(req);
    call.subscribe({
      next: p => {
        this.busy.set(false);
        void this.router.navigate(['/owner/dashboard'], { queryParams: { pg: p.id, saved: 1 } });
      },
      error: err => {
        this.busy.set(false);
        this.form()?.setError(errorMessage(err));
      }
    });
  }
}
