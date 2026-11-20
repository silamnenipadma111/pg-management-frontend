import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Address } from './models';

export interface Coords {
  lat: number;
  lng: number;
  /** Accuracy radius in metres reported by the browser (GPS ≈ 5-50 m, Wi-Fi ≈ 50-500 m, IP based = km). */
  accuracy?: number;
  /** When the fix was taken (ms since epoch). */
  at?: number;
}

export type LocationStatus = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'timeout' | 'insecure' | 'unsupported';
export type BrowserPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** City centres used as a fallback label when the address lookup is unavailable. */
const CITY_CENTRES = [
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 }
];

const COORDS_KEY = 'pg.location';
const ADDRESS_KEY = 'pg.location.address';
const DISMISSED_KEY = 'pg.location.dismissed';
/** A stored fix older than this is refreshed automatically. */
const MAX_AGE_MS = 30 * 60 * 1000;
const NEAR_CITY_KM = 60;
const APPROXIMATE_ABOVE_METRES = 1000;
const GPS_TIMEOUT_MS = 15000;
const NETWORK_TIMEOUT_MS = 10000;
const NETWORK_MAX_AGE_MS = 60000;
const PERMISSION_DENIED = 1;
const POSITION_TIMEOUT = 3;

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly api = inject(ApiService);

  readonly coords = signal<Coords | null>(readJson<Coords>(COORDS_KEY, isCoords));
  readonly status = signal<LocationStatus>(this.coords() ? 'granted' : 'unknown');
  readonly locating = signal(false);
  /** Street level address of the current position, resolved by the server. */
  readonly address = signal<Address | null>(readJson<Address>(ADDRESS_KEY, value => typeof value === 'object'));
  /** The visitor chose "not now" in the location pop-up during this visit. */
  readonly dismissed = signal(sessionStorage.getItem(DISMISSED_KEY) === '1');

  /** Nearest known city and the distance to its centre. */
  readonly nearestCity = computed(() => {
    const c = this.coords();
    if (!c) {
      return null;
    }
    return CITY_CENTRES.map(city => ({ name: city.name, km: distanceKm(c.lat, c.lng, city.lat, city.lng) }))
      .sort((a, b) => a.km - b.km)[0];
  });

  /** True when the fix is coarse (Wi-Fi / IP based), so distances may be off by a kilometre or more. */
  readonly approximate = computed(() => (this.coords()?.accuracy ?? 0) > APPROXIMATE_ABOVE_METRES);

  /** Short place name: "HITEC City, Hyderabad". Empty while unknown. */
  readonly placeLabel = computed(() => {
    const a = this.address();
    const parts = [a?.area, a?.city].filter(Boolean);
    if (parts.length) {
      return parts.join(', ');
    }
    const near = this.nearestCity();
    return near && near.km < NEAR_CITY_KM ? near.name : '';
  });

  /** Full current address: "Ayyappa Society, HITEC City, Hyderabad, Telangana 500081". */
  readonly fullAddress = computed(() => {
    const a = this.address();
    if (!a) {
      return this.placeLabel();
    }
    const line = [a.addressLine, a.area === a.addressLine ? null : a.area, a.city].filter(Boolean).join(', ');
    return [line, [a.state, a.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  });

  constructor() {
    const c = this.coords();
    if (c && (!c.at || Date.now() - c.at > MAX_AGE_MS)) {
      // stale fix from an earlier visit: refresh silently (permission was already given)
      void this.request();
    } else if (c && !this.address()) {
      this.resolveAddress(c);
    }
  }

  /** What the browser would do if asked now: already allowed, blocked, or it would show its own prompt. */
  async browserPermission(): Promise<BrowserPermission> {
    try {
      if (!('geolocation' in navigator) || !navigator.permissions) {
        return 'unknown';
      }
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Asks the browser for a fresh position. Uses GPS (high accuracy, no cached position) first and falls back
   * to a quicker network based fix if GPS does not answer in time (e.g. indoors / laptops without GPS).
   */
  async request(): Promise<Coords | null> {
    if (!('geolocation' in navigator)) {
      this.status.set('unsupported');
      return null;
    }
    // Browsers only allow geolocation on https:// or http://localhost
    if (!window.isSecureContext) {
      this.status.set('insecure');
      return null;
    }
    this.locating.set(true);
    try {
      const pos = await this.bestPosition();
      const c: Coords = {
        lat: +pos.coords.latitude.toFixed(6),
        lng: +pos.coords.longitude.toFixed(6),
        accuracy: Math.round(pos.coords.accuracy),
        at: pos.timestamp || Date.now()
      };
      this.set(c);
      return c;
    } catch (e) {
      this.status.set(failureStatus((e as GeolocationPositionError | undefined)?.code));
      return null;
    } finally {
      this.locating.set(false);
    }
  }

  set(c: Coords | null): void {
    this.coords.set(c);
    if (c) {
      sessionStorage.setItem(COORDS_KEY, JSON.stringify(c));
      this.status.set('granted');
      this.resolveAddress(c);
    } else {
      sessionStorage.removeItem(COORDS_KEY);
      sessionStorage.removeItem(ADDRESS_KEY);
      this.address.set(null);
      this.status.set('unknown');
    }
  }

  /** Remember for this visit that the location pop-up was answered with "not now". */
  dismiss(): void {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    this.dismissed.set(true);
  }

  private async bestPosition(): Promise<GeolocationPosition> {
    try {
      return await this.position({ enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 });
    } catch (e) {
      if ((e as GeolocationPositionError).code === PERMISSION_DENIED) {
        throw e;
      }
      return this.position({ enableHighAccuracy: false, timeout: NETWORK_TIMEOUT_MS, maximumAge: NETWORK_MAX_AGE_MS });
    }
  }

  private position(options: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
  }

  private resolveAddress(c: Coords): void {
    this.api.reverseGeocode(c.lat, c.lng).subscribe({
      next: address => {
        this.address.set(address);
        sessionStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
      },
      // lookup unavailable: the nearest city is shown instead
      error: () => this.address.set(null)
    });
  }
}

function failureStatus(code: number | undefined): LocationStatus {
  if (code === PERMISSION_DENIED) {
    return 'denied';
  }
  return code === POSITION_TIMEOUT ? 'timeout' : 'unavailable';
}

function isCoords(value: unknown): boolean {
  const c = value as Coords | null;
  return !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

function readJson<T>(key: string, isValid: (value: unknown) => boolean): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value && isValid(value) ? (value as T) : null;
  } catch {
    return null;
  }
}

/** Haversine distance - same formula as the backend (GeoUtils). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
