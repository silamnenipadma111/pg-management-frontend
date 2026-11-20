export type Role = 'OWNER' | 'CUSTOMER' | 'SUPPORT';
export type GenderPreference = 'MALE' | 'FEMALE' | 'ANY';
export type BedStatus = 'AVAILABLE' | 'BLOCKED' | 'BOOKED' | 'UNAVAILABLE';
export type BookingType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type PaymentPlan = 'FULL' | 'MONTHLY';
export type BookingStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BOOKED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'DUE' | 'SUBMITTED' | 'PAID';
export type MediaType = 'IMAGE' | 'VIDEO';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  gender?: string;
  emailVerified: boolean;
}

/**
 * The signed-in user. The session itself lives in an HttpOnly cookie that JavaScript cannot read;
 * `csrfToken` is echoed in the X-CSRF-Token header of every state changing request.
 */
export interface SessionResponse {
  user: User;
  csrfToken: string;
  expiresAt: string;
}

export interface SignupResponse {
  email: string;
  verificationRequired: boolean;
  message: string;
}

export interface MessageResponse {
  message: string;
}

/** Error body of the API. `code` is a machine readable reason, e.g. EMAIL_NOT_VERIFIED. */
export interface ApiErrorBody {
  status: number;
  message: string;
  code?: string;
  retryAfterSeconds?: number;
}

/** Address resolved from coordinates ("use my current location") or from a pincode. */
export interface Address {
  addressLine?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PgSummary {
  id: number;
  name: string;
  addressLine: string;
  area: string;
  city: string;
  genderPreference: GenderPreference;
  facilities: string[];
  images: string[];
  minRent: number;
  maxRent: number;
  sharingTypes: number[];
  hasAc: boolean;
  availableBeds: number;
  totalBeds: number;
  distanceKm?: number | null;
  latitude?: number;
  longitude?: number;
}

/** A PG the customer stayed at before ("book again" suggestion). */
export interface PreviousStay {
  pg: PgSummary;
  lastStayFrom: string;
  stays: number;
}

export interface Media {
  mediaType: MediaType;
  url: string;
}

export interface Bed {
  id: number;
  bedLabel: string;
  status: BedStatus;
}

export interface Room {
  id: number;
  floorNumber: number;
  roomNumber: string;
  sharingType: number;
  ac: boolean;
  attachedBathroom: boolean;
  dailyRent: number;
  weeklyRent: number;
  monthlyRent: number;
  availableBeds: number;
  beds: Bed[];
}

export interface Floor {
  floorNumber: number;
  rooms: Room[];
}

export interface PgDetail {
  id: number;
  name: string;
  description?: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  genderPreference: GenderPreference;
  facilities: string[];
  contactPhone: string;
  upiId?: string | null;
  houseRules?: string;
  ownerName: string;
  registeredVia: 'OWNER' | 'CUSTOMER_CARE';
  media: Media[];
  minRent: number;
  maxRent: number;
  sharingTypes: number[];
  availableBeds: number;
  totalBeds: number;
  floors: Floor[];
}

export interface BedRequest {
  bedLabel: string;
  available: boolean;
}

export interface RoomRequest {
  floorNumber: number;
  roomNumber: string;
  sharingType: number;
  ac: boolean;
  attachedBathroom: boolean;
  dailyRent: number;
  weeklyRent?: number | null;
  monthlyRent: number;
  beds?: BedRequest[];
}

export interface PgRequest {
  name: string;
  description?: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  genderPreference: GenderPreference;
  facilities: string[];
  contactPhone: string;
  upiId?: string | null;
  houseRules?: string;
  media: Media[];
  rooms: RoomRequest[];
}

export interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  email: string;
  gender?: string;
}

export interface Booking {
  id: number;
  pgId: number;
  pgName: string;
  pgArea: string;
  pgCity: string;
  bedId: number;
  roomNumber: string;
  floorNumber: number;
  bedLabel: string;
  sharingType: number;
  ac: boolean;
  bookingType: BookingType;
  paymentPlan: PaymentPlan;
  duration: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: BookingStatus;
  bedStatus: BedStatus;
  customerNote?: string;
  ownerNote?: string;
  createdAt: string;
  customer: CustomerInfo;
  totalInstallments: number;
  paidInstallments: number;
}

export interface Payment {
  id: number;
  bookingId: number;
  installmentNo: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: PaymentStatus;
  overdue: boolean;
  paymentMethod?: string;
  transactionRef?: string;
  paymentDetails?: string;
  ownerNote?: string;
  submittedAt?: string;
  paidAt?: string;
  invoiceNumber?: string;
  pgId: number;
  pgName: string;
  roomNumber: string;
  bedLabel: string;
  bookingType: BookingType;
  bookingStatus: BookingStatus;
  lastReminderOn?: string;
  customer: CustomerInfo;
}

export interface Invoice {
  invoiceNumber: string;
  issuedAt: string;
  pgName: string;
  pgAddress: string;
  pgContactPhone: string;
  ownerName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  roomNumber: string;
  floorNumber: number;
  bedLabel: string;
  sharingType: number;
  bookingType: BookingType;
  paymentPlan: PaymentPlan;
  installmentNo: number;
  totalInstallments: number;
  periodStart: string;
  periodEnd: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  paymentDetails?: string;
}

export interface PgStats {
  pgId: number | null;
  pgName: string;
  area?: string;
  city?: string;
  totalBeds: number;
  availableBeds: number;
  blockedBeds: number;
  bookedBeds: number;
  unavailableBeds: number;
  pendingApprovals: number;
  pendingPaymentConfirmations: number;
  pendingRentAmount: number;
  overdueCount: number;
  occupancyPercent: number;
}

export interface OwnerDashboard {
  totals: PgStats;
  pgs: PgStats[];
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export type SupportRequestType = 'CALLBACK' | 'REGISTER_PG' | 'GENERAL';

export interface SupportRequest {
  id: number;
  name: string;
  phone: string;
  email?: string;
  requestType: SupportRequestType;
  message?: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
}

export interface MetaOptions {
  facilities: string[];
  sharingTypes: number[];
  bookingTypes: BookingType[];
  genderPreferences: GenderPreference[];
}

export interface SearchFilters {
  q?: string;
  city?: string;
  sharing?: number | null;
  gender?: GenderPreference | '';
  ac?: boolean | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  sort?: string;
}

export type OnlineMethod = 'UPI' | 'CARD' | 'NET_BANKING';
export type UpiApp = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM' | 'AMAZONPAY' | 'OTHER';

export interface Checkout {
  paymentId: number;
  orderId: string;
  amount: number;
  paymentMethod: OnlineMethod;
  payeeName: string;
  payeeUpiId?: string;
  note: string;
  upiUri?: string;
}

export interface CompletePayment {
  orderId: string;
  paymentMethod: OnlineMethod;
  upiApp?: UpiApp;
  payerUpiId?: string;
  upiRef?: string;
  cardLast4?: string;
  cardNetwork?: string;
  cardHolder?: string;
  bank?: string;
}

export interface ReminderResult {
  channels: string[];
  sentOn: string;
}

export interface AssistedPgResult {
  pg: PgDetail;
  ownerEmail: string;
  ownerAccountCreated: boolean;
  temporaryPassword?: string;
}
