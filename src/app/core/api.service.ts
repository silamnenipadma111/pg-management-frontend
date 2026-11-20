import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Address, ApiErrorBody, AppNotification, AssistedPgResult, Booking, BookingType, Checkout, CompletePayment, Invoice,
  Media, MessageResponse, MetaOptions, OnlineMethod, OwnerDashboard, Payment, PaymentPlan, PgDetail, PgRequest,
  PgSummary, PreviousStay, ReminderResult, Role, SearchFilters, SessionResponse, SignupResponse, SupportRequest,
  SupportRequestType
} from './models';

/** Base URL of every API call; the auth interceptor only attaches credentials to URLs below it. */
export const API_BASE = environment.apiUrl + '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = API_BASE;

  /** Resolve media URLs returned by the API (uploaded files are relative to the API host). */
  static mediaUrl(url: string | null | undefined): string {
    if (!url) {
      return '';
    }
    return url.startsWith('/') ? environment.apiUrl + url : url;
  }

  // account
  signup(body: { name: string; email: string; phone: string; password: string; role: Role; gender?: string | null }) {
    return this.http.post<SignupResponse>(`${this.base}/auth/signup`, body);
  }

  signin(body: { email: string; password: string; role: Role }) {
    return this.http.post<SessionResponse>(`${this.base}/auth/signin`, body);
  }

  /** The current session (restores the signed-in state after a page reload). */
  session() {
    return this.http.get<SessionResponse>(`${this.base}/auth/session`);
  }

  signout() {
    return this.http.post<void>(`${this.base}/auth/signout`, {});
  }

  verifyEmail(token: string) {
    return this.http.post<MessageResponse>(`${this.base}/auth/verify-email`, { token });
  }

  resendVerification(email: string) {
    return this.http.post<MessageResponse>(`${this.base}/auth/resend-verification`, { email });
  }

  forgotPassword(email: string) {
    return this.http.post<MessageResponse>(`${this.base}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<MessageResponse>(`${this.base}/auth/reset-password`, { token, password });
  }

  // browsing
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

  /** Address at the given coordinates ("use my current location"). */
  reverseGeocode(lat: number, lng: number) {
    return this.http.get<Address>(`${this.base}/geo/reverse`, { params: { lat, lng } });
  }

  /** City, state and approximate coordinates of a 6 digit pincode. */
  pincode(pincode: string) {
    return this.http.get<Address>(`${this.base}/geo/pincode/${encodeURIComponent(pincode)}`);
  }

  // customer
  requestBooking(body: { bedId: number; bookingType: BookingType; duration: number; startDate: string; paymentPlan: PaymentPlan; note?: string }) {
    return this.http.post<Booking>(`${this.base}/bookings`, body);
  }

  myBookings() {
    return this.http.get<Booking[]>(`${this.base}/bookings/my`);
  }

  /** PGs this customer stayed at before. */
  previousStays() {
    return this.http.get<PreviousStay[]>(`${this.base}/bookings/suggestions`);
  }

  cancelBooking(id: number) {
    return this.http.post<Booking>(`${this.base}/bookings/${id}/cancel`, {});
  }

  myPayments(scope: 'upcoming' | 'history') {
    return this.http.get<Payment[]>(`${this.base}/payments/my`, { params: { scope } });
  }

  /** Online payment step 1: issues an order (and the upi:// link for UPI). */
  checkout(id: number, paymentMethod: OnlineMethod) {
    return this.http.post<Checkout>(`${this.base}/payments/${id}/checkout`, { paymentMethod });
  }

  /** Online payment step 2: marks the rent paid and books the bed. */
  completePayment(id: number, body: CompletePayment) {
    return this.http.post<Payment>(`${this.base}/payments/${id}/complete`, body);
  }

  /** Cash given to the owner: the owner has to accept it. */
  cashPayment(id: number, body: { paidOn: string; receivedBy: string; note?: string }) {
    return this.http.post<Payment>(`${this.base}/payments/${id}/cash`, body);
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
    return this.http.get<Booking[]>(`${this.base}/owner/bookings`, { params: this.statusParams(status, pgId) });
  }

  approveBooking(id: number, note?: string) {
    return this.http.post<Booking>(`${this.base}/owner/bookings/${id}/approve`, { note });
  }

  rejectBooking(id: number, note?: string) {
    return this.http.post<Booking>(`${this.base}/owner/bookings/${id}/reject`, { note });
  }

  ownerPayments(status?: string[], pgId?: number | null) {
    return this.http.get<Payment[]>(`${this.base}/owner/payments`, { params: this.statusParams(status, pgId) });
  }

  confirmPayment(id: number) {
    return this.http.post<Payment>(`${this.base}/owner/payments/${id}/confirm`, {});
  }

  remindPayment(id: number) {
    return this.http.post<ReminderResult>(`${this.base}/owner/payments/${id}/remind`, {});
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
  createSupportRequest(body: { name: string; phone: string; email?: string; requestType: SupportRequestType; message?: string }) {
    return this.http.post<SupportRequest>(`${this.base}/support/requests`, body);
  }

  supportRequests() {
    return this.http.get<SupportRequest[]>(`${this.base}/support/requests`);
  }

  resolveSupportRequest(id: number) {
    return this.http.post<SupportRequest>(`${this.base}/support/requests/${id}/resolve`, {});
  }

  registerPgForOwner(body: { ownerName: string; ownerEmail: string; ownerPhone: string; supportRequestId?: number | null; pg: PgRequest }) {
    return this.http.post<AssistedPgResult>(`${this.base}/support/pgs`, body);
  }

  private statusParams(status?: string[], pgId?: number | null): HttpParams {
    let params = new HttpParams();
    status?.forEach(s => (params = params.append('status', s)));
    if (pgId) {
      params = params.set('pgId', pgId);
    }
    return params;
  }
}

function errorBody(err: unknown): Partial<ApiErrorBody> | undefined {
  return (err as { error?: Partial<ApiErrorBody> } | null)?.error;
}

/** Message of a failed API call, safe to show to the user. */
export function errorMessage(err: unknown): string {
  const message = errorBody(err)?.message;
  if (message) {
    return message;
  }
  if ((err as { status?: number } | null)?.status === 0) {
    return 'Cannot reach the server. Please check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

/** Machine readable reason of a failed API call, e.g. EMAIL_NOT_VERIFIED. */
export function errorCode(err: unknown): string | undefined {
  return errorBody(err)?.code;
}
