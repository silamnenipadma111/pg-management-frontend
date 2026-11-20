import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Invoice } from '../../core/models';
import { BrandComponent } from '../../shared/brand.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [TranslatePipe, DatePipe, DecimalPipe, RouterLink, BrandComponent, IconComponent],
  template: `
    <div class="container page page-narrow">
      <a routerLink="/my-rents" [queryParams]="{ tab: 'history' }" class="back-link no-print">
        <app-icon name="arrow-left" [size]="14" /> {{ 'nav.myRents' | t }}
      </a>
      @if (inv(); as i) {
        <article class="card invoice">
          <header class="invoice-head">
            <app-brand />
            <div class="invoice-meta">
              <p class="eyebrow">{{ 'invoice.title' | t }}</p>
              <p class="invoice-number">{{ i.invoiceNumber }}</p>
              <p class="muted small">{{ i.issuedAt | date: 'd MMM y, h:mm a' }}</p>
            </div>
          </header>

          <div class="invoice-parties">
            <div>
              <p class="eyebrow">{{ 'invoice.from' | t }}</p>
              <p><b>{{ i.pgName }}</b><br />{{ i.pgAddress }}<br />{{ i.ownerName }} · {{ i.pgContactPhone }}</p>
            </div>
            <div>
              <p class="eyebrow">{{ 'invoice.to' | t }}</p>
              <p><b>{{ i.customerName }}</b><br />{{ i.customerEmail }}<br />{{ i.customerPhone }}</p>
            </div>
          </div>

          <div class="table-wrap ledger">
            <table>
              <thead>
                <tr><th>{{ 'invoice.description' | t }}</th><th>{{ 'rents.period' | t }}</th><th class="num">{{ 'common.amount' | t }}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ 'bookingType.' + i.bookingType | t }} · {{ 'common.room' | t }} {{ i.roomNumber }}
                    ({{ 'common.floor' | t }} {{ i.floorNumber }}) · {{ 'common.bed' | t }} {{ i.bedLabel }} ·
                    {{ 'common.sharing' | t: { n: i.sharingType } }}<br />
                    <small class="muted">{{ 'rents.installment' | t: { n: i.installmentNo, t: i.totalInstallments } }}</small></td>
                  <td>{{ i.periodStart | date: 'd MMM y' }} – {{ i.periodEnd | date: 'd MMM y' }}</td>
                  <td class="num">₹{{ i.amount | number: '1.2-2' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><th colspan="2" class="num">{{ 'booking.total' | t }}</th><th class="num">₹{{ i.amount | number: '1.2-2' }}</th></tr>
              </tfoot>
            </table>
          </div>

          <footer class="invoice-foot">
            <p class="muted">{{ 'rents.method' | t }}: {{ 'pay.m.' + i.paymentMethod | t }}
              @if (i.paymentDetails) { ({{ i.paymentDetails }}) }
              @if (i.transactionRef) { · {{ 'invoice.ref' | t }} {{ i.transactionRef }} }</p>
            <span class="status-pill" data-status="PAID"><app-icon name="check" [size]="13" /> {{ 'pay.PAID' | t }}</span>
          </footer>
          <button type="button" class="btn btn-primary no-print" (click)="print()">
            <app-icon name="printer" [size]="14" /> {{ 'invoice.print' | t }}
          </button>
        </article>
      } @else if (error()) {
        <p class="alert error" role="alert">{{ error() }}</p>
      } @else {
        <div class="skeleton skeleton-block"></div>
      }
    </div>
  `
})
export class InvoiceComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  readonly inv = signal<Invoice | null>(null);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.invoice(+this.id()).subscribe({ next: i => this.inv.set(i), error: err => this.error.set(errorMessage(err)) });
  }

  print(): void {
    globalThis.print();
  }
}
