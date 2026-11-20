import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { TranslatePipe } from '../core/i18n.service';
import { Checkout, CompletePayment, Payment, UpiApp } from '../core/models';

type Method = 'UPI' | 'CARD' | 'NET_BANKING' | 'CASH';
type Step = 'method' | 'details' | 'upi-waiting' | 'processing' | 'done';

interface UpiAppInfo {
  code: UpiApp;
  name: string;
  icon: string;
  /** Android package - opens this exact app via an intent:// URL */
  androidPackage?: string;
  /** iOS URL scheme prefix that replaces "upi://pay" */
  iosScheme?: string;
}

const UPI_APPS: UpiAppInfo[] = [
  { code: 'GPAY', name: 'Google Pay', icon: 'G', androidPackage: 'com.google.android.apps.nbu.paisa.user', iosScheme: 'gpay://upi/pay' },
  { code: 'PHONEPE', name: 'PhonePe', icon: 'Pe', androidPackage: 'com.phonepe.app', iosScheme: 'phonepe://pay' },
  { code: 'PAYTM', name: 'Paytm', icon: 'P', androidPackage: 'net.one97.paytm', iosScheme: 'paytmmp://pay' },
  { code: 'BHIM', name: 'BHIM', icon: 'B', androidPackage: 'in.org.npci.upiapp' },
  { code: 'AMAZONPAY', name: 'Amazon Pay', icon: 'a', androidPackage: 'in.amazon.mShop.android.shopping' },
  { code: 'OTHER', name: 'Any UPI app', icon: '⋯' }
];

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank',
  'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'IndusInd Bank', 'Yes Bank', 'IDFC FIRST Bank'];

/**
 * Pay one rent installment. Online methods (UPI / card / net banking) are confirmed immediately and book the bed;
 * cash sends a request to the owner, who has to accept it.
 */
@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe, RouterLink],
  template: `
    @let p = payment();
    <div class="overlay" (click)="close()">
      <div class="modal pay-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="pay-head">
          <div>
            <small class="muted">{{ p.pgName }} · {{ 'common.room' | t }} {{ p.roomNumber }}-{{ p.bedLabel }}</small>
            <h2>₹{{ p.amount | number: '1.0-2' }}</h2>
            <small class="muted">{{ 'rents.installment' | t: { n: p.installmentNo, t: p.totalInstallments } }} · {{ 'rents.due' | t }} {{ p.dueDate | date: 'mediumDate' }}</small>
          </div>
          <button class="icon-btn" (click)="close()" [attr.aria-label]="'common.close' | t">✕</button>
        </div>

        @if (error()) { <p class="alert error">{{ error() }}</p> }

        @switch (step()) {
          @case ('method') {
            <h4>{{ 'pay.chooseMethod' | t }}</h4>
            <div class="method-grid">
              @for (m of methods; track m.code) {
                <button class="method" (click)="choose(m.code)">
                  <span class="method-icon">{{ m.icon }}</span>
                  <b>{{ m.label | t }}</b>
                  <small class="muted">{{ m.hint | t }}</small>
                </button>
              }
            </div>
            <p class="muted small secure">🔒 {{ 'pay.secureNote' | t }}</p>
          }

          @case ('details') {
            <button class="link-btn back-link" (click)="step.set('method')">‹ {{ 'pay.changeMethod' | t }}</button>
            @switch (method()) {
              @case ('UPI') {
                <h4>{{ 'pay.upiPickApp' | t }}</h4>
                <div class="upi-apps">
                  @for (a of upiApps; track a.code) {
                    <button type="button" class="upi-app" [class.selected]="upiApp() === a.code" (click)="upiApp.set(a.code)">
                      <span class="upi-logo upi-{{ a.code.toLowerCase() }}">{{ a.icon }}</span>{{ a.name }}
                    </button>
                  }
                </div>
                <label>{{ 'pay.payerUpiId' | t }}
                  <input [(ngModel)]="payerUpiId" name="payerUpiId" placeholder="yourname@okaxis" />
                </label>
                @if (payerUpiId && !upiIdValid()) { <p class="field-error">{{ 'pay.invalidUpiId' | t }}</p> }
                @if (!isMobile) { <p class="alert info small">📱 {{ 'pay.upiDesktopNote' | t }}</p> }
                <button class="btn btn-primary block" (click)="startUpi()" [disabled]="busy() || !upiApp() || (!!payerUpiId && !upiIdValid())">
                  {{ 'pay.payWith' | t: { app: appName() } }} · ₹{{ p.amount | number }}
                </button>
              }
              @case ('CARD') {
                <h4>💳 {{ 'pay.cardDetails' | t }}</h4>
                <div class="card-preview">
                  <span class="network">{{ cardNetwork() || 'CARD' }}</span>
                  <span class="number">{{ maskedNumber() }}</span>
                  <span class="holder">{{ cardHolder || ('pay.cardHolder' | t) }}</span>
                  <span class="exp">{{ cardExpiry || 'MM/YY' }}</span>
                </div>
                <label>{{ 'pay.cardHolder' | t }}<input [(ngModel)]="cardHolder" name="holder" autocomplete="cc-name" maxlength="100" /></label>
                <label>{{ 'pay.cardNumber' | t }}
                  <input [ngModel]="cardNumber" (ngModelChange)="onCardNumber($event)" name="number" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="23" />
                </label>
                @if (cardNumber && !cardNumberValid()) { <p class="field-error">{{ 'pay.invalidCard' | t }}</p> }
                <div class="grid-2">
                  <label>{{ 'pay.expiry' | t }}<input [ngModel]="cardExpiry" (ngModelChange)="onExpiry($event)" name="exp" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" /></label>
                  <label>CVV<input [(ngModel)]="cardCvv" name="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="•••" /></label>
                </div>
                @if (cardExpiry.length === 5 && !expiryValid()) { <p class="field-error">{{ 'pay.invalidExpiry' | t }}</p> }
                <button class="btn btn-primary block" (click)="payCard()" [disabled]="busy() || !cardValid()">{{ 'pay.payAmount' | t: { amount: (p.amount | number) ?? '' } }}</button>
                <p class="muted small">🔒 {{ 'pay.cardNote' | t }}</p>
              }
              @case ('NET_BANKING') {
                <h4>🏦 {{ 'pay.chooseBank' | t }}</h4>
                <div class="bank-grid">
                  @for (b of popularBanks; track b) {
                    <button type="button" class="bank" [class.selected]="bank === b" (click)="bank = b">{{ b }}</button>
                  }
                </div>
                <label>{{ 'pay.otherBank' | t }}
                  <select [(ngModel)]="bank" name="bank">
                    <option value="">—</option>
                    @for (b of banks; track b) { <option [value]="b">{{ b }}</option> }
                  </select>
                </label>
                <button class="btn btn-primary block" (click)="payNetBanking()" [disabled]="busy() || !bank">{{ 'pay.continueToBank' | t }}</button>
              }
              @case ('CASH') {
                <h4>💵 {{ 'pay.cashTitle' | t }}</h4>
                <p class="muted small">{{ 'pay.cashHint' | t }}</p>
                <label>{{ 'pay.cashPaidOn' | t }} *<input type="date" [(ngModel)]="cashDate" name="paidOn" [max]="today" /></label>
                <label>{{ 'pay.cashReceivedBy' | t }} *<input [(ngModel)]="cashReceivedBy" name="receivedBy" maxlength="100" [placeholder]="'pay.cashReceivedByPh' | t" /></label>
                <label>{{ 'pay.cashNote' | t }}<input [(ngModel)]="cashNote" name="note" maxlength="300" /></label>
                <button class="btn btn-primary block" (click)="payCash()" [disabled]="busy() || !cashDate || !cashReceivedBy.trim()">{{ 'pay.sendToOwner' | t }}</button>
              }
            }
          }

          @case ('upi-waiting') {
            <div class="center">
              <div class="upi-logo big upi-{{ upiApp()?.toLowerCase() }}">{{ appIcon() }}</div>
              <h4>{{ 'pay.upiOpened' | t: { app: appName() } }}</h4>
              <p class="muted small">{{ 'pay.upiApprove' | t: { amount: (p.amount | number) ?? '', payee: checkout()?.payeeUpiId ?? '' } }}</p>
            </div>
            @if (!isMobile) {
              <div class="upi-manual">
                <span>{{ 'pay.upiIdLabel' | t }}</span><b>{{ checkout()?.payeeUpiId }}</b>
                <button class="btn btn-ghost btn-sm" (click)="copy(checkout()?.payeeUpiId)">{{ (copied() ? 'pay.copied' : 'pay.copy') | t }}</button>
              </div>
            }
            <label>{{ 'pay.utr' | t }}<input [(ngModel)]="upiRef" name="utr" inputmode="numeric" maxlength="12" placeholder="12 digit UTR (optional)" /></label>
            @if (upiRef && !utrValid()) { <p class="field-error">{{ 'pay.invalidUtr' | t }}</p> }
            <button class="btn btn-primary block" (click)="confirmUpi()" [disabled]="busy() || (!!upiRef && !utrValid())">✔ {{ 'pay.upiDone' | t }}</button>
            <div class="row-between small">
              <button class="link-btn" (click)="openUpiApp()">↻ {{ 'pay.reopenApp' | t: { app: appName() } }}</button>
              <button class="link-btn" (click)="step.set('details')">{{ 'pay.upiFailed' | t }}</button>
            </div>
          }

          @case ('processing') {
            <div class="center processing">
              <div class="spinner"></div>
              <p>{{ processingText() | t: { bank: bank } }}</p>
            </div>
          }

          @case ('done') {
            <div class="center done">
              <div class="success-mark" [class.pending]="result()?.status !== 'PAID'">{{ result()?.status === 'PAID' ? '✔' : '⏳' }}</div>
              @if (result()?.status === 'PAID') {
                <h3>{{ 'pay.successTitle' | t }}</h3>
                <p class="muted">{{ 'pay.successText' | t }}</p>
                <p class="small">{{ result()?.paymentDetails }}<br />Ref: {{ result()?.transactionRef }}</p>
                <a class="btn btn-primary block" [routerLink]="['/invoice', result()?.id]" (click)="close()">🧾 {{ 'rents.invoice' | t }}</a>
              } @else {
                <h3>{{ 'pay.cashSentTitle' | t }}</h3>
                <p class="muted">{{ 'pay.cashSentText' | t }}</p>
              }
              <button class="btn btn-ghost block" (click)="close()">{{ 'common.close' | t }}</button>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class PaymentDialogComponent implements OnInit {
  payment = input.required<Payment>();
  closed = output<boolean>();
  private api = inject(ApiService);

  readonly isAndroid = /Android/i.test(navigator.userAgent);
  readonly isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  readonly isMobile = this.isAndroid || this.isIos;
  readonly today = new Date().toISOString().slice(0, 10);

  methods: { code: Method; icon: string; label: string; hint: string }[] = [
    { code: 'UPI', icon: '⚡', label: 'pay.m.UPI', hint: 'pay.h.UPI' },
    { code: 'CARD', icon: '💳', label: 'pay.m.CARD', hint: 'pay.h.CARD' },
    { code: 'NET_BANKING', icon: '🏦', label: 'pay.m.NET_BANKING', hint: 'pay.h.NET_BANKING' },
    { code: 'CASH', icon: '💵', label: 'pay.m.CASH', hint: 'pay.h.CASH' }
  ];
  upiApps = UPI_APPS;
  banks = BANKS;
  popularBanks = BANKS.slice(0, 6);

  step = signal<Step>('method');
  method = signal<Method | null>(null);
  busy = signal(false);
  error = signal('');
  checkout = signal<Checkout | null>(null);
  result = signal<Payment | null>(null);
  copied = signal(false);
  processingText = signal('pay.processing');
  private changed = false;

  upiApp = signal<UpiApp | null>(null);
  payerUpiId = '';
  upiRef = '';
  cardHolder = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  bank = '';
  cashDate = this.today;
  cashReceivedBy = '';
  cashNote = '';

  appName = computed(() => UPI_APPS.find(a => a.code === this.upiApp())?.name ?? 'UPI');
  appIcon = computed(() => UPI_APPS.find(a => a.code === this.upiApp())?.icon ?? '⚡');

  ngOnInit(): void {
    this.upiApp.set(this.isIos ? 'GPAY' : null);
  }

  choose(m: Method): void {
    this.method.set(m);
    this.error.set('');
    this.step.set('details');
  }

  close(): void {
    this.closed.emit(this.changed);
  }

  // ------------------------------------------------------------------ UPI

  upiIdValid(): boolean {
    return /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.]{2,64}$/.test(this.payerUpiId.trim());
  }

  utrValid(): boolean {
    return /^[0-9]{12}$/.test(this.upiRef.trim());
  }

  startUpi(): void {
    this.begin('UPI', c => {
      this.checkout.set(c);
      this.step.set('upi-waiting');
      this.openUpiApp();
    });
  }

  /** Redirects to the chosen UPI app with the amount, payee and order pre-filled. */
  openUpiApp(): void {
    const uri = this.checkout()?.upiUri;
    if (!uri) {
      return;
    }
    const app = UPI_APPS.find(a => a.code === this.upiApp());
    const query = uri.substring(uri.indexOf('?') + 1);
    let target = uri;
    if (this.isAndroid && app?.androidPackage) {
      // intent:// opens exactly this app; if it is not installed Android shows the Play Store page
      target = `intent://pay?${query}#Intent;scheme=upi;package=${app.androidPackage};end`;
    } else if (this.isIos && app?.iosScheme) {
      target = `${app.iosScheme}?${query}`;
    }
    window.location.href = target;
  }

  confirmUpi(): void {
    this.complete({ upiApp: this.upiApp() ?? 'OTHER', payerUpiId: this.payerUpiId.trim() || undefined, upiRef: this.upiRef.trim() || undefined });
  }

  // ------------------------------------------------------------------ card

  cardDigits(): string {
    return this.cardNumber.replace(/\D/g, '');
  }

  onCardNumber(v: string): void {
    const d = (v ?? '').replace(/\D/g, '').slice(0, 19);
    this.cardNumber = d.replace(/(.{4})/g, '$1 ').trim();
  }

  onExpiry(v: string): void {
    const d = (v ?? '').replace(/\D/g, '').slice(0, 4);
    this.cardExpiry = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  }

  cardNetwork(): string {
    const d = this.cardDigits();
    if (/^4/.test(d)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
    if (/^3[47]/.test(d)) return 'AMEX';
    if (/^(60|65|81|82|508|353|356)/.test(d)) return 'RUPAY';
    return '';
  }

  maskedNumber(): string {
    const d = this.cardDigits().padEnd(16, '•');
    return d.replace(/(.{4})/g, '$1 ').trim();
  }

  /** Luhn checksum */
  cardNumberValid(): boolean {
    const d = this.cardDigits();
    if (d.length < 12 || d.length > 19) {
      return false;
    }
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      let n = +d[d.length - 1 - i];
      if (i % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    }
    return sum % 10 === 0;
  }

  expiryValid(): boolean {
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(this.cardExpiry);
    if (!m) {
      return false;
    }
    const end = new Date(2000 + +m[2], +m[1], 1); // first day after the expiry month
    return end > new Date();
  }

  cardValid(): boolean {
    return this.cardHolder.trim().length > 1 && this.cardNumberValid() && this.expiryValid() && /^[0-9]{3,4}$/.test(this.cardCvv);
  }

  payCard(): void {
    // Only the last 4 digits and the network leave the browser - never the full number, expiry or CVV.
    const last4 = this.cardDigits().slice(-4);
    const network = this.cardNetwork() || 'Card';
    const holder = this.cardHolder.trim();
    this.cardNumber = '';
    this.cardCvv = '';
    this.begin('CARD', () => this.simulate('pay.processing', () =>
      this.complete({ cardLast4: last4, cardNetwork: network, cardHolder: holder })));
  }

  // ------------------------------------------------------------------ net banking

  payNetBanking(): void {
    this.begin('NET_BANKING', () => this.simulate('pay.redirectingBank', () => this.complete({ bank: this.bank })));
  }

  // ------------------------------------------------------------------ cash

  payCash(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.cashPayment(this.payment().id, { paidOn: this.cashDate, receivedBy: this.cashReceivedBy.trim(), note: this.cashNote.trim() || undefined })
      .subscribe({
        next: res => this.finish(res),
        error: err => this.fail(err)
      });
  }

  // ------------------------------------------------------------------ helpers

  copy(text?: string): void {
    if (text) {
      navigator.clipboard?.writeText(text).then(() => this.copied.set(true));
    }
  }

  private begin(method: 'UPI' | 'CARD' | 'NET_BANKING', then: (c: Checkout) => void): void {
    this.busy.set(true);
    this.error.set('');
    this.api.checkout(this.payment().id, method).subscribe({
      next: c => {
        this.checkout.set(c);
        this.busy.set(false);
        then(c);
      },
      error: err => this.fail(err)
    });
  }

  /** Demo gateway: show the processing / bank redirect screen briefly before confirming. */
  private simulate(text: string, then: () => void): void {
    this.processingText.set(text);
    this.step.set('processing');
    setTimeout(then, 1500);
  }

  private complete(extra: Partial<CompletePayment>): void {
    const c = this.checkout();
    if (!c) {
      return;
    }
    this.busy.set(true);
    this.api.completePayment(this.payment().id, { orderId: c.orderId, paymentMethod: c.paymentMethod, ...extra }).subscribe({
      next: res => this.finish(res),
      error: err => this.fail(err)
    });
  }

  private finish(res: Payment): void {
    this.changed = true;
    this.result.set(res);
    this.busy.set(false);
    this.step.set('done');
  }

  private fail(err: unknown): void {
    this.error.set(errorMessage(err));
    this.busy.set(false);
    if (this.step() === 'processing') {
      this.step.set('details');
    }
  }
}
