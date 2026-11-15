import { Injectable, signal } from '@angular/core';

export interface Coords {
  lat: number;
  lng: number;
}

const KEY = 'pg.location';

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly coords = signal<Coords | null>(this.read());
  readonly status = signal<'unknown' | 'granted' | 'denied' | 'unsupported'>(this.coords() ? 'granted' : 'unknown');

  request(): Promise<Coords | null> {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) {
        this.status.set('unsupported');
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const c = { lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) };
          this.set(c);
          resolve(c);
        },
        () => {
          this.status.set('denied');
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    });
  }

  set(c: Coords | null): void {
    this.coords.set(c);
    if (c) {
      sessionStorage.setItem(KEY, JSON.stringify(c));
      this.status.set('granted');
    } else {
      sessionStorage.removeItem(KEY);
    }
  }

  private read(): Coords | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Coords) : null;
    } catch {
      return null;
    }
  }
}
