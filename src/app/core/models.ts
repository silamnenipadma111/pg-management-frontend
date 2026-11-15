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
}

export interface AuthResponse {
  token: string;
  user: User;
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

export interface SupportRequest {
  id: number;
  name: string;
  phone: string;
  email?: string;
  requestType: 'CALLBACK' | 'REGISTER_PG' | 'GENERAL';
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
  minRent?: number | null;
  maxRent?: number | null;
  gender?: GenderPreference | '';
  ac?: boolean | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  sort?: string;
}
