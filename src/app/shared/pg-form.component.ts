import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../core/api.service';
import { TranslatePipe } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { GenderPreference, Media, PgDetail, PgRequest } from '../core/models';
import { FACILITY_ICONS, FACILITY_LABELS } from '../core/translations';

const BED_LABELS = 'ABCDEFGHIJKL';

interface BedForm {
  label: string;
  available: boolean;
  status?: string;
}

interface RoomForm {
  roomNumber: string;
  sharingType: number;
  ac: boolean;
  attachedBathroom: boolean;
  dailyRent: number | null;
  weeklyRent: number | null;
  monthlyRent: number | null;
  beds: BedForm[];
}

interface FloorForm {
  floorNumber: number;
  rooms: RoomForm[];
}

/** PG registration form shared by owners (Register PG) and customer care (register on behalf of an owner). */
@Component({
  selector: 'app-pg-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <form (ngSubmit)="submit()" #form="ngForm" class="pg-form">
      <section class="card pad">
        <h3>1. {{ 'owner.basic' | t }}</h3>
        <div class="grid-2">
          <label>PG name *<input name="name" [(ngModel)]="m.name" required maxlength="150" /></label>
          <label>{{ 'filters.gender' | t }} *
            <select name="gender" [(ngModel)]="m.genderPreference" required>
              <option value="MALE">{{ 'gender.MALE' | t }}</option>
              <option value="FEMALE">{{ 'gender.FEMALE' | t }}</option>
              <option value="ANY">{{ 'gender.ANY' | t }}</option>
            </select>
          </label>
          <label class="span-2">Address *<input name="addressLine" [(ngModel)]="m.addressLine" required maxlength="300" /></label>
          <label>Area / locality *<input name="area" [(ngModel)]="m.area" required /></label>
          <label>{{ 'filters.city' | t }} *<input name="city" [(ngModel)]="m.city" required /></label>
          <label>State *<input name="state" [(ngModel)]="m.state" required /></label>
          <label>Pincode *<input name="pincode" [(ngModel)]="m.pincode" required pattern="^[0-9]{6}$" /></label>
          <label>Contact phone *<input name="contactPhone" [(ngModel)]="m.contactPhone" required pattern="^[0-9+ -]{10,15}$" /></label>
          <div class="latlng">
            <label>Latitude<input type="number" name="lat" [(ngModel)]="m.latitude" step="0.00001" /></label>
            <label>Longitude<input type="number" name="lng" [(ngModel)]="m.longitude" step="0.00001" /></label>
            <button type="button" class="btn btn-outline btn-sm" (click)="useLocation()">📍 {{ 'owner.useMyLocation' | t }}</button>
          </div>
          <label class="span-2">Description<textarea name="description" [(ngModel)]="m.description" rows="3" maxlength="2000"></textarea></label>
          <label class="span-2">{{ 'detail.rules' | t }}<textarea name="houseRules" [(ngModel)]="m.houseRules" rows="2" maxlength="2000"></textarea></label>
        </div>
      </section>

      <section class="card pad">
        <h3>2. {{ 'owner.media' | t }} *</h3>
        <p class="muted small">{{ 'owner.uploadHint' | t }}</p>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple (change)="upload($event)" />
        @if (uploading()) { <span class="muted"> {{ 'common.loading' | t }}</span> }
        <div class="url-row">
          <input name="mediaUrl" [(ngModel)]="mediaUrl" [placeholder]="'owner.addUrl' | t" />
          <select name="mediaUrlType" [(ngModel)]="mediaUrlType"><option value="IMAGE">Image</option><option value="VIDEO">Video</option></select>
          <button type="button" class="btn btn-outline btn-sm" (click)="addUrl()" [disabled]="!mediaUrl">+</button>
        </div>
        <div class="media-grid">
          @for (md of media(); track md.url; let i = $index) {
            <div class="media-item">
              @if (md.mediaType === 'IMAGE') { <img [src]="url(md.url)" alt="" /> } @else { <video [src]="url(md.url)" muted></video><span class="vid">▶ video</span> }
              @if (i === 0 && md.mediaType === 'IMAGE') { <span class="cover">cover</span> }
              <button type="button" class="remove" (click)="removeMedia(i)" aria-label="Remove">✕</button>
            </div>
          }
        </div>
      </section>

      <section class="card pad">
        <h3>3. {{ 'owner.facilities' | t }} *</h3>
        <div class="facility-grid">
          @for (f of facilityCodes; track f) {
            <label class="check"><input type="checkbox" [checked]="facilities().has(f)" (change)="toggleFacility(f)" /> {{ icons[f] }} {{ labels[f] }}</label>
          }
        </div>
      </section>

      <section class="card pad">
        <h3>4. {{ 'owner.floors' | t }} *</h3>
        <div class="quick">
          <b>{{ 'owner.quickAdd' | t }}:</b>
          <label>{{ 'owner.floorsCount' | t }}<input type="number" name="qFloors" [(ngModel)]="q.floors" min="1" max="20" /></label>
          <label>{{ 'owner.roomsPerFloor' | t }}<input type="number" name="qRooms" [(ngModel)]="q.rooms" min="1" max="30" /></label>
          <label>{{ 'filters.sharing' | t }}<input type="number" name="qSharing" [(ngModel)]="q.sharing" min="1" max="12" /></label>
          <label>{{ 'owner.monthlyRent' | t }}<input type="number" name="qRent" [(ngModel)]="q.rent" min="1" /></label>
          <label class="check"><input type="checkbox" name="qAc" [(ngModel)]="q.ac" /> AC</label>
          <button type="button" class="btn btn-outline btn-sm" (click)="generate()">{{ 'owner.generate' | t }}</button>
        </div>
        <p class="muted small">{{ 'owner.bedsHint' | t }}</p>
        @for (fl of floors(); track $index; let fi = $index) {
          <div class="floor-form">
            <div class="row-between">
              <h4>{{ 'common.floor' | t }} <input type="number" class="tiny" [name]="'fn' + fi" [(ngModel)]="fl.floorNumber" min="0" max="100" /></h4>
              <div>
                <button type="button" class="btn btn-outline btn-sm" (click)="addRoom(fl)">+ {{ 'owner.addRoom' | t }}</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="removeFloor(fi)">✕</button>
              </div>
            </div>
            <div class="table-wrap">
              <table class="room-table">
                <thead><tr><th>{{ 'common.room' | t }}</th><th>{{ 'filters.sharing' | t }}</th><th>AC</th><th>{{ 'owner.attachedBath' | t }}</th>
                  <th>{{ 'owner.dailyRent' | t }}</th><th>{{ 'owner.weeklyRent' | t }}</th><th>{{ 'owner.monthlyRent' | t }}</th><th>{{ 'common.bed' | t }}</th><th></th></tr></thead>
                <tbody>
                  @for (r of fl.rooms; track $index; let ri = $index) {
                    <tr>
                      <td><input class="small-in" [name]="'rn' + fi + '_' + ri" [(ngModel)]="r.roomNumber" required /></td>
                      <td><input type="number" class="tiny" [name]="'rs' + fi + '_' + ri" [ngModel]="r.sharingType" (ngModelChange)="setSharing(r, $event)" min="1" max="12" required /></td>
                      <td><input type="checkbox" [name]="'ra' + fi + '_' + ri" [(ngModel)]="r.ac" /></td>
                      <td><input type="checkbox" [name]="'rb' + fi + '_' + ri" [(ngModel)]="r.attachedBathroom" /></td>
                      <td><input type="number" class="small-in" [name]="'rd' + fi + '_' + ri" [(ngModel)]="r.dailyRent" min="0" required /></td>
                      <td><input type="number" class="small-in" [name]="'rw' + fi + '_' + ri" [(ngModel)]="r.weeklyRent" min="0" /></td>
                      <td><input type="number" class="small-in" [name]="'rm' + fi + '_' + ri" [(ngModel)]="r.monthlyRent" min="1" required /></td>
                      <td class="bed-toggles">
                        @for (b of r.beds; track b.label) {
                          <button type="button" class="bed small {{ bedClass(b) }}" (click)="toggleBed(b)" [disabled]="b.status === 'BOOKED' || b.status === 'BLOCKED'"
                                  [title]="b.status || (b.available ? 'AVAILABLE' : 'UNAVAILABLE')">{{ b.label }}</button>
                        }
                      </td>
                      <td><button type="button" class="btn btn-ghost btn-sm" (click)="fl.rooms.splice(ri, 1)">✕</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
        <button type="button" class="btn btn-outline" (click)="addFloor()">+ {{ 'owner.addFloor' | t }}</button>
      </section>

      @if (error()) { <p class="alert error">{{ error() }}</p> }
      <button class="btn btn-primary btn-lg" [disabled]="form.invalid || busy()">{{ submitLabel() | t }}</button>
    </form>
  `
})
export class PgFormComponent implements OnInit {
  initial = input<PgDetail | null>(null);
  busy = input(false);
  submitLabel = input('common.save');
  submitted = output<PgRequest>();

  private api = inject(ApiService);
  private location = inject(LocationService);
  icons = FACILITY_ICONS;
  labels = FACILITY_LABELS;
  facilityCodes = Object.keys(FACILITY_LABELS);

  m = {
    name: '', description: '', addressLine: '', area: '', city: 'Hyderabad', state: 'Telangana', pincode: '',
    latitude: null as number | null, longitude: null as number | null, genderPreference: 'ANY' as GenderPreference,
    contactPhone: '', houseRules: ''
  };
  media = signal<Media[]>([]);
  facilities = signal<Set<string>>(new Set(['WIFI']));
  floors = signal<FloorForm[]>([]);
  uploading = signal(false);
  error = signal('');
  mediaUrl = '';
  mediaUrlType: 'IMAGE' | 'VIDEO' = 'IMAGE';
  q = { floors: 3, rooms: 4, sharing: 2, rent: 8000, ac: false };

  ngOnInit(): void {
    const p = this.initial();
    if (!p) {
      this.floors.set([{ floorNumber: 1, rooms: [this.newRoom(1, 1, 2, 8000, false)] }]);
      return;
    }
    this.m = {
      name: p.name, description: p.description ?? '', addressLine: p.addressLine, area: p.area, city: p.city, state: p.state,
      pincode: p.pincode, latitude: p.latitude ?? null, longitude: p.longitude ?? null, genderPreference: p.genderPreference,
      contactPhone: p.contactPhone, houseRules: p.houseRules ?? ''
    };
    this.media.set([...p.media]);
    this.facilities.set(new Set(p.facilities));
    this.floors.set(p.floors.map(f => ({
      floorNumber: f.floorNumber,
      rooms: f.rooms.map(r => ({
        roomNumber: r.roomNumber, sharingType: r.sharingType, ac: r.ac, attachedBathroom: r.attachedBathroom,
        dailyRent: r.dailyRent, weeklyRent: r.weeklyRent, monthlyRent: r.monthlyRent,
        beds: r.beds.map(b => ({ label: b.bedLabel, available: b.status !== 'UNAVAILABLE', status: b.status }))
      }))
    })));
  }

  url(u: string): string {
    return ApiService.mediaUrl(u);
  }

  async useLocation(): Promise<void> {
    const c = await this.location.request();
    if (c) {
      this.m.latitude = c.lat;
      this.m.longitude = c.lng;
    }
  }

  upload(e: Event): void {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (!files.length) {
      return;
    }
    this.uploading.set(true);
    let pending = files.length;
    files.forEach(f => this.api.upload(f).subscribe({
      next: res => this.media.update(list => [...list, { mediaType: res.mediaType, url: res.url }]),
      error: err => this.error.set(errorMessage(err)),
      complete: () => {
        if (--pending === 0) {
          this.uploading.set(false);
        }
      }
    }));
    (e.target as HTMLInputElement).value = '';
  }

  addUrl(): void {
    this.media.update(list => [...list, { mediaType: this.mediaUrlType, url: this.mediaUrl.trim() }]);
    this.mediaUrl = '';
  }

  removeMedia(i: number): void {
    this.media.update(list => list.filter((_, idx) => idx !== i));
  }

  toggleFacility(f: string): void {
    this.facilities.update(s => {
      const n = new Set(s);
      n.has(f) ? n.delete(f) : n.add(f);
      return n;
    });
  }

  newRoom(floor: number, idx: number, sharing: number, rent: number, ac: boolean): RoomForm {
    return {
      roomNumber: `${floor === 0 ? 'G' : floor}${String(idx).padStart(2, '0')}`, sharingType: sharing, ac, attachedBathroom: true,
      dailyRent: Math.round(rent / 20), weeklyRent: Math.round(rent / 3.5), monthlyRent: rent, beds: this.beds(sharing)
    };
  }

  beds(n: number, old: BedForm[] = []): BedForm[] {
    return Array.from({ length: Math.max(1, Math.min(12, n || 1)) }, (_, i) => old[i] ?? { label: BED_LABELS[i], available: true });
  }

  setSharing(r: RoomForm, n: number): void {
    r.sharingType = n;
    r.beds = this.beds(n, r.beds);
  }

  toggleBed(b: BedForm): void {
    b.available = !b.available;
  }

  bedClass(b: BedForm): string {
    if (b.status === 'BOOKED' || b.status === 'BLOCKED') {
      return b.status.toLowerCase();
    }
    return b.available ? 'available' : 'unavailable';
  }

  generate(): void {
    const floors: FloorForm[] = [];
    for (let f = 1; f <= this.q.floors; f++) {
      floors.push({ floorNumber: f, rooms: Array.from({ length: this.q.rooms }, (_, i) => this.newRoom(f, i + 1, this.q.sharing, this.q.rent, this.q.ac)) });
    }
    this.floors.set(floors);
  }

  addFloor(): void {
    const next = Math.max(0, ...this.floors().map(f => f.floorNumber)) + 1;
    this.floors.update(list => [...list, { floorNumber: next, rooms: [this.newRoom(next, 1, 2, 8000, false)] }]);
  }

  removeFloor(i: number): void {
    this.floors.update(list => list.filter((_, idx) => idx !== i));
  }

  addRoom(fl: FloorForm): void {
    fl.rooms.push(this.newRoom(fl.floorNumber, fl.rooms.length + 1, 2, fl.rooms.at(-1)?.monthlyRent ?? 8000, false));
  }

  submit(): void {
    this.error.set('');
    if (!this.media().some(m => m.mediaType === 'IMAGE')) {
      this.error.set('Please add at least one photo of the PG.');
      return;
    }
    if (!this.facilities().size) {
      this.error.set('Please select at least one facility.');
      return;
    }
    const rooms = this.floors().flatMap(f => f.rooms.map(r => ({
      floorNumber: f.floorNumber, roomNumber: r.roomNumber.trim(), sharingType: r.sharingType, ac: r.ac,
      attachedBathroom: r.attachedBathroom, dailyRent: r.dailyRent ?? 0, weeklyRent: r.weeklyRent, monthlyRent: r.monthlyRent ?? 0,
      beds: r.beds.map(b => ({ bedLabel: b.label, available: b.available }))
    })));
    if (!rooms.length) {
      this.error.set('Please add at least one room.');
      return;
    }
    const dup = rooms.map(r => r.roomNumber).find((n, i, arr) => arr.indexOf(n) !== i);
    if (dup) {
      this.error.set(`Room number ${dup} is used more than once.`);
      return;
    }
    const facilities = [...this.facilities()];
    this.submitted.emit({ ...this.m, facilities, media: this.media(), rooms });
  }

  setError(msg: string): void {
    this.error.set(msg);
  }
}
