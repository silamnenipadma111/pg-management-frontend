import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AppNotification, AuthResponse, Booking, BookingType, Invoice, Media, MetaOptions, OwnerDashboard, Payment,
  PaymentPlan, PgDetail, PgRequest, PgSummary, Role, SearchFilters, SupportRequest, User
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/api';

  /** Resolve media URLs returned by the API (uploaded files are relative to the API host). */
  static mediaUrl(url: string | null | undefined): string {
    if (!url) {
      return '';
    }
    return url.startsWith('/') ? environment.apiUrl + url : url;
  }

  signup(body: { name: string; email: string; phone: string; password: string; role: Role; gender?: string | null }) {
    return this.http.post<AuthResponse>(`${this.base}/auth/signup`, body);
  }

  signin(body: { email: string; password: string; role: Role }) {
    return this.http.post<AuthResponse>(`${this.base}/auth/signin`, body);
  }

  me() {
    return this.http.get<User>(`${this.base}/auth/me`);
  }

  options() {
    return this.http.get<MetaOptions>(`${this.base}/meta/options`);
  }

  searchPgs(f: SearchFilters): Observable<PgSummary[]> {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PgSummary[]>(`${this.base}/pgs`, { params });
  }

  pg(id: number) {
    return this.http.get<PgDetail>(`${this.base}/pgs/${id}`);
  }

  // customer
  requestBooking(body: { bedId: number; bookingType: BookingType; duration: number; startDate: string; paymentPlan: PaymentPlan; note?: string }) {
    return this.http.post<Booking>(`${this.base}/bookings`, body);
  }

  myBookings() {
    return this.http.get<Booking[]>(`${this.base}/bookings/my`);
  }

  cancelBooking(id: number) {
    return this.http.post<Booking>(`${this.base}/bookings/${id}/cancel`, {});
  }

  myPayments(scope: 'upcoming' | 'history') {
    return this.http.get<Payment[]>(`${this.base}/payments/my`, { params: { scope } });
  }

  pay(id: number, paymentMethod: string, transactionRef?: string) {
    return this.http.post<Payment>(`${this.base}/payments/${id}/pay`, { paymentMethod, transactionRef });
  }

  invoice(id: number) {
    return this.http.get<Invoice>(`${this.base}/payments/${id}/invoice`);
  }

  // owner
  ownerPgs() {
    return this.http.get<PgDetail[]>(`${this.base}/owner/pgs`);
  }

  ownerPg(id: number) {
    return this.http.get<PgDetail>(`${this.base}/owner/pgs/${id}`);
  }

  createPg(body: PgRequest) {
    return this.http.post<PgDetail>(`${this.base}/owner/pgs`, body);
  }

  updatePg(id: number, body: PgRequest) {
    return this.http.put<PgDetail>(`${this.base}/owner/pgs/${id}`, body);
  }

  setBedStatus(bedId: number, status: string) {
    return this.http.patch<PgDetail>(`${this.base}/owner/beds/${bedId}/status`, { status });
  }

  dashboard() {
    return this.http.get<OwnerDashboard>(`${this.base}/owner/dashboard`);
  }

  ownerBookings(status?: string[], pgId?: number | null) {
    let params = new HttpParams();
    status?.forEach(s => (params = params.append('status', s)));
    if (pgId) {
      params = params.set('pgId', pgId);
    }
    return this.http.get<Booking[]>(`${this.base}/owner/bookings`, { params });
  }

  approveBooking(id: number, note?: string) {
    return this.http.post<Booking>(`${this.base}/owner/bookings/${id}/approve`, { note });
  }

  rejectBooking(id: number, note?: string) {
    return this.http.post<Booking>(`${this.base}/owner/bookings/${id}/reject`, { note });
  }

  ownerPayments(status?: string[], pgId?: number | null) {
    let params = new HttpParams();
    status?.forEach(s => (params = params.append('status', s)));
    if (pgId) {
      params = params.set('pgId', pgId);
    }
    return this.http.get<Payment[]>(`${this.base}/owner/payments`, { params });
  }

  confirmPayment(id: number) {
    return this.http.post<Payment>(`${this.base}/owner/payments/${id}/confirm`, {});
  }

  rejectPayment(id: number, note?: string) {
    return this.http.post<Payment>(`${this.base}/owner/payments/${id}/reject`, { note });
  }

  upload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Media>(`${this.base}/media/upload`, fd);
  }

  // notifications
  notifications() {
    return this.http.get<{ unread: number; items: AppNotification[] }>(`${this.base}/notifications`);
  }

  markRead(id: number) {
    return this.http.post<void>(`${this.base}/notifications/${id}/read`, {});
  }

  markAllRead() {
    return this.http.post<void>(`${this.base}/notifications/read-all`, {});
  }

  // support
  createSupportRequest(body: { name: string; phone: string; email?: string; requestType: string; message?: string }) {
    return this.http.post<SupportRequest>(`${this.base}/support/requests`, body);
  }

  supportRequests() {
    return this.http.get<SupportRequest[]>(`${this.base}/support/requests`);
  }

  resolveSupportRequest(id: number) {
    return this.http.post<SupportRequest>(`${this.base}/support/requests/${id}/resolve`, {});
  }

  registerPgForOwner(body: { ownerName: string; ownerEmail: string; ownerPhone: string; supportRequestId?: number | null; pg: PgRequest }) {
    return this.http.post<{ pg: PgDetail; ownerEmail: string; ownerAccountCreated: boolean; temporaryPassword?: string }>(
      `${this.base}/support/pgs`, body);
  }
}

export function errorMessage(err: unknown): string {
  const e = err as { error?: { message?: string; errors?: Record<string, string> }; status?: number };
  if (e?.error?.errors) {
    return Object.entries(e.error.errors).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  if (e?.error?.message) {
    return e.error.message;
  }
  if (e?.status === 0) {
    return 'Cannot reach the server. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
