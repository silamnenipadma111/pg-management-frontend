import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Invoice } from '../../core/models';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [TranslatePipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <a routerLink="/my-rents" class="back no-print">‹ {{ 'nav.myRents' | t }}</a>
    @if (inv(); as i) {
      <div class="card pad invoice">
        <div class="row-between">
          <div><h2>🏠 {{ 'app.name' | t }}</h2><p class="muted">{{ 'invoice.title' | t }}</p></div>
          <div class="right"><b>{{ i.invoiceNumber }}</b><br /><span class="muted">{{ i.issuedAt | date: 'medium' }}</span></div>
        </div>
        <hr />
        <div class="two-col">
          <div><h4>PG</h4><p>{{ i.pgName }}<br />{{ i.pgAddress }}<br />📞 {{ i.pgContactPhone }}<br />{{ i.ownerName }}</p></div>
          <div><h4>{{ 'dash.customer' | t }}</h4><p>{{ i.customerName }}<br />{{ i.customerEmail }}<br />📞 {{ i.customerPhone }}</p></div>
        </div>
        <table>
          <thead><tr><th>Description</th><th>{{ 'rents.period' | t }}</th><th class="right">{{ 'common.amount' | t }}</th></tr></thead>
          <tbody><tr>
            <td>{{ 'bookingType.' + i.bookingType | t }} rent · {{ 'common.room' | t }} {{ i.roomNumber }} ({{ 'common.floor' | t }} {{ i.floorNumber }}) · {{ 'common.bed' | t }} {{ i.bedLabel }} · {{ 'common.sharing' | t: { n: i.sharingType } }}<br />
              <small class="muted">{{ 'rents.installment' | t: { n: i.installmentNo, t: i.totalInstallments } }}</small></td>
            <td>{{ i.periodStart | date: 'mediumDate' }} – {{ i.periodEnd | date: 'mediumDate' }}</td>
            <td class="right">₹{{ i.amount | number: '1.2-2' }}</td>
          </tr></tbody>
          <tfoot><tr><th colspan="2" class="right">{{ 'booking.total' | t }}</th><th class="right">₹{{ i.amount | number: '1.2-2' }}</th></tr></tfoot>
        </table>
        <p class="muted">{{ 'rents.method' | t }}: {{ i.paymentMethod }} @if (i.transactionRef) { · Ref: {{ i.transactionRef }} } · {{ 'pay.PAID' | t }} ✔</p>
        <button class="btn btn-primary no-print" (click)="print()">{{ 'invoice.print' | t }}</button>
      </div>
    } @else { <p class="muted">{{ 'common.loading' | t }}</p> }
  `
})
export class InvoiceComponent implements OnInit {
  id = input.required<string>();
  private api = inject(ApiService);
  inv = signal<Invoice | null>(null);

  ngOnInit(): void {
    this.api.invoice(+this.id()).subscribe(i => this.inv.set(i));
  }

  print(): void {
    window.print();
  }
}
