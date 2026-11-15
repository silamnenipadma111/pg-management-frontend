import { Component, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { PgDetail, PgRequest } from '../../core/models';
import { PgFormComponent } from '../../shared/pg-form.component';

@Component({
  selector: 'app-register-pg',
  standalone: true,
  imports: [PgFormComponent, TranslatePipe, RouterLink, DecimalPipe],
  template: `
    <h1>{{ (id() ? 'owner.editTitle' : 'owner.registerTitle') | t }}</h1>
    @if (!id() && myPgs().length) {
      <div class="card pad">
        <h3>{{ 'nav.myPgs' | t }}</h3>
        <div class="my-pgs">
          @for (p of myPgs(); track p.id) {
            <div class="my-pg">
              <b>{{ p.name }}</b> <span class="muted">{{ p.area }}, {{ p.city }} · {{ p.availableBeds }}/{{ p.totalBeds }} {{ 'bed.AVAILABLE' | t }} · ₹{{ p.minRent | number }}+</span>
              <a class="btn btn-outline btn-sm" [routerLink]="['/owner/pgs', p.id, 'edit']">✎ Edit</a>
              <a class="btn btn-ghost btn-sm" [routerLink]="['/pgs', p.id]">{{ 'common.view' | t }}</a>
            </div>
          }
        </div>
      </div>
    }
    @if (saved()) { <p class="alert success">{{ 'owner.saved' | t }}</p> }
    @if (!id() || initial()) {
      <app-pg-form [initial]="initial()" [busy]="busy()" (submitted)="save($event)" [submitLabel]="id() ? 'common.save' : 'owner.registerTitle'" />
    } @else { <p class="muted">{{ 'common.loading' | t }}</p> }
  `
})
export class RegisterPgComponent implements OnInit {
  id = input<string>();
  private api = inject(ApiService);
  private router = inject(Router);
  form = viewChild(PgFormComponent);
  initial = signal<PgDetail | null>(null);
  myPgs = signal<PgDetail[]>([]);
  busy = signal(false);
  saved = signal(false);

  ngOnInit(): void {
    if (this.id()) {
      this.api.ownerPg(+this.id()!).subscribe(p => this.initial.set(p));
    } else {
      this.api.ownerPgs().subscribe(list => this.myPgs.set(list));
    }
  }

  save(req: PgRequest): void {
    this.busy.set(true);
    const call = this.id() ? this.api.updatePg(+this.id()!, req) : this.api.createPg(req);
    call.subscribe({
      next: p => {
        this.busy.set(false);
        this.saved.set(true);
        this.router.navigate(['/owner/dashboard'], { queryParams: { pg: p.id, saved: 1 } });
      },
      error: err => {
        this.busy.set(false);
        this.form()?.setError(errorMessage(err));
      }
    });
  }
}
