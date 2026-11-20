import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../core/api.service';
import { I18nService, TranslatePipe } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { Address, BedStatus, GenderPreference, Media, MediaType, PgDetail, PgRequest, RoomRequest } from '../core/models';
import { FACILITY_LABELS } from '../core/translations';
import { PHONE_PATTERN, PINCODE_PATTERN, UPI_PATTERN } from '../core/validators';
import { IconComponent } from './icon.component';

const BED_LABELS = 'ABCDEFGHIJKL';
const MAX_SHARING = BED_LABELS.length;
const DEFAULT_RENT = 8000;
const DEFAULT_SHARING = 2;
/** Rough daily / weekly rent suggested from the monthly rent. */
const DAYS_FACTOR = 20;
const WEEKS_FACTOR = 3.5;

interface BedForm {
  label: string;
  available: boolean;
  status?: BedStatus;
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

interface PgModel {
  name: string;
  description: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  genderPreference: GenderPreference;
  contactPhone: string;
  upiId: string;
  houseRules: string;
}

function emptyModel(): PgModel {
  return {
    name: '', description: '', addressLine: '', area: '', city: '', state: '', pincode: '', latitude: null, longitude: null,
    genderPreference: 'ANY', contactPhone: '', upiId: '', houseRules: ''
  };
}

function isLocked(bed: BedForm): boolean {
  return bed.status === 'BOOKED' || bed.status === 'BLOCKED';
}

/** PG registration form shared by owners (Register PG) and customer care (register on behalf of an owner). */
@Component({
  selector: 'app-pg-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe, IconComponent],
  template: `
    <form (ngSubmit)="submit()" #form="ngForm" class="pg-form" novalidate>
      <section class="card pad">
        <p class="eyebrow">{{ 'form.step' | t: { n: 1 } }}</p>
        <h2 class="display">{{ 'owner.basic' | t }}</h2>
        <div class="grid-2">
          <label>{{ 'form.pgName' | t }} *<input name="name" [(ngModel)]="m.name" required maxlength="150" /></label>
          <label>{{ 'filters.gender' | t }} *
            <select name="gender" [(ngModel)]="m.genderPreference" required>
              <option value="MALE">{{ 'gender.MALE' | t }}</option>
              <option value="FEMALE">{{ 'gender.FEMALE' | t }}</option>
              <option value="ANY">{{ 'gender.ANY' | t }}</option>
            </select>
          </label>
        </div>

        <div class="locate-box">
          <div>
            <p class="field-label">{{ 'form.addressTitle' | t }}</p>
            <p class="muted small">{{ 'form.addressHint' | t }}</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" (click)="useLocation()" [disabled]="locating()">
            <app-icon name="locate" [size]="15" /> {{ (locating() ? 'welcome.locating' : 'owner.useMyLocation') | t }}
          </button>
        </div>
        @if (locationNote(); as note) { <p class="alert" [class.success]="note.ok" [class.error]="!note.ok" role="status">{{ note.text }}</p> }

        <div class="grid-2">
          <label>{{ 'form.pincode' | t }} *
            <input name="pincode" [ngModel]="m.pincode" (ngModelChange)="onPincode($event)" required [pattern]="pincodePattern"
                   maxlength="6" inputmode="numeric" autocomplete="postal-code" #pincodeField="ngModel" />
            @if (pincodeBusy()) { <small class="muted">{{ 'form.pincodeLooking' | t }}</small> }
            @if (pincodeField.invalid && pincodeField.touched) { <small class="field-error">{{ 'form.pincodeInvalid' | t }}</small> }
          </label>
          <label>{{ 'form.area' | t }} *<input name="area" [(ngModel)]="m.area" required maxlength="100" /></label>
          <label>{{ 'filters.city' | t }} *<input name="city" [(ngModel)]="m.city" required maxlength="100" /></label>
          <label>{{ 'form.state' | t }} *<input name="state" [(ngModel)]="m.state" required maxlength="100" /></label>
          <label class="span-2">{{ 'form.address' | t }} *
            <input name="addressLine" [(ngModel)]="m.addressLine" required maxlength="300" autocomplete="street-address" />
          </label>
          <label>{{ 'form.contactPhone' | t }} *
            <input name="contactPhone" type="tel" [(ngModel)]="m.contactPhone" required [pattern]="phonePattern" maxlength="15"
                   inputmode="tel" #phoneField="ngModel" />
            @if (phoneField.invalid && phoneField.touched) { <small class="field-error">{{ 'auth.phoneInvalid' | t }}</small> }
          </label>
          <label>{{ 'owner.upiId' | t }}
            <input name="upiId" [(ngModel)]="m.upiId" maxlength="100" [pattern]="upiPattern" placeholder="name@bank" #upiField="ngModel" />
            @if (upiField.invalid && upiField.touched) {
              <small class="field-error">{{ 'pay.invalidUpiId' | t }}</small>
            } @else {
              <small class="muted">{{ 'owner.upiHint' | t }}</small>
            }
          </label>
          <label class="span-2">{{ 'form.description' | t }}
            <textarea name="description" [(ngModel)]="m.description" rows="3" maxlength="2000"></textarea>
          </label>
          <label class="span-2">{{ 'detail.rules' | t }}
            <textarea name="houseRules" [(ngModel)]="m.houseRules" rows="2" maxlength="2000"></textarea>
          </label>
        </div>
      </section>

      <section class="card pad">
        <p class="eyebrow">{{ 'form.step' | t: { n: 2 } }}</p>
        <h2 class="display">{{ 'owner.media' | t }} *</h2>
        <p class="muted small">{{ 'owner.uploadHint' | t }}</p>
        <label class="upload-drop">
          <app-icon name="upload" [size]="20" />
          <span>{{ (uploading() ? 'common.loading' : 'form.chooseFiles') | t }}</span>
          <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple
                 (change)="upload($event)" [disabled]="uploading()" />
        </label>
        <div class="url-row">
          <input name="mediaUrl" type="url" [(ngModel)]="mediaUrl" [placeholder]="'owner.addUrl' | t" [attr.aria-label]="'owner.addUrl' | t" />
          <select name="mediaUrlType" [(ngModel)]="mediaUrlType" [attr.aria-label]="'form.mediaType' | t">
            <option value="IMAGE">{{ 'form.image' | t }}</option>
            <option value="VIDEO">{{ 'form.video' | t }}</option>
          </select>
          <button type="button" class="btn btn-outline btn-sm" (click)="addUrl()" [disabled]="!validMediaUrl()">
            <app-icon name="plus" [size]="14" /> {{ 'form.add' | t }}
          </button>
        </div>
        <div class="media-grid">
          @for (md of media(); track md.url; let i = $index) {
            <div class="media-item">
              @if (md.mediaType === 'IMAGE') {
                <img [src]="url(md.url)" [alt]="('form.image' | t) + ' ' + (i + 1)" />
              } @else {
                <video [src]="url(md.url)" muted preload="metadata"></video><span class="pill pill-on-image">{{ 'form.video' | t }}</span>
              }
              @if (i === firstImage()) { <span class="pill pill-gold pill-on-image">{{ 'form.cover' | t }}</span> }
              <button type="button" class="icon-btn solid remove" (click)="removeMedia(i)" [attr.aria-label]="'form.remove' | t">
                <app-icon name="x" [size]="14" />
              </button>
            </div>
          }
        </div>
      </section>

      <section class="card pad">
        <p class="eyebrow">{{ 'form.step' | t: { n: 3 } }}</p>
        <h2 class="display">{{ 'owner.facilities' | t }} *</h2>
        <div class="chip-row">
          @for (f of facilityCodes; track f) {
            <button type="button" class="chip" [class.selected]="facilities().has(f)" [attr.aria-pressed]="facilities().has(f)"
                    (click)="toggleFacility(f)">{{ labels[f] }}</button>
          }
        </div>
      </section>

      <section class="card pad">
        <p class="eyebrow">{{ 'form.step' | t: { n: 4 } }}</p>
        <h2 class="display">{{ 'owner.floors' | t }} *</h2>
        <fieldset class="quick">
          <legend>{{ 'owner.quickAdd' | t }}</legend>
          <label>{{ 'owner.floorsCount' | t }}<input type="number" name="qFloors" [(ngModel)]="q.floors" min="1" max="20" /></label>
          <label>{{ 'owner.roomsPerFloor' | t }}<input type="number" name="qRooms" [(ngModel)]="q.rooms" min="1" max="30" /></label>
          <label>{{ 'filters.sharing' | t }}<input type="number" name="qSharing" [(ngModel)]="q.sharing" min="1" [max]="maxSharing" /></label>
          <label>{{ 'owner.monthlyRent' | t }}<input type="number" name="qRent" [(ngModel)]="q.rent" min="1" /></label>
          <label class="check"><input type="checkbox" name="qAc" [(ngModel)]="q.ac" /> {{ 'common.ac' | t }}</label>
          <button type="button" class="btn btn-outline btn-sm" (click)="generate()">{{ 'owner.generate' | t }}</button>
        </fieldset>
        <p class="muted small">{{ 'owner.bedsHint' | t }}</p>

        @for (fl of floors(); track $index; let fi = $index) {
          <div class="floor-form">
            <div class="section-bar">
              <label class="inline-field">{{ 'common.floor' | t }}
                <input type="number" class="tiny" [name]="'fn' + fi" [(ngModel)]="fl.floorNumber" min="0" max="100" required />
              </label>
              <div class="btn-row">
                <button type="button" class="btn btn-outline btn-sm" (click)="addRoom(fl)">
                  <app-icon name="plus" [size]="14" /> {{ 'owner.addRoom' | t }}
                </button>
                <button type="button" class="icon-btn" (click)="removeFloor(fi)" [attr.aria-label]="'form.removeFloor' | t">
                  <app-icon name="trash" [size]="15" />
                </button>
              </div>
            </div>
            <div class="table-wrap ledger">
              <table class="room-table">
                <thead>
                  <tr>
                    <th>{{ 'common.room' | t }}</th><th>{{ 'filters.sharing' | t }}</th><th>{{ 'common.ac' | t }}</th>
                    <th>{{ 'owner.attachedBath' | t }}</th><th>{{ 'owner.dailyRent' | t }}</th><th>{{ 'owner.weeklyRent' | t }}</th>
                    <th>{{ 'owner.monthlyRent' | t }}</th><th>{{ 'common.bed' | t }}</th>
                    <th><span class="sr-only">{{ 'common.actions' | t }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of fl.rooms; track $index; let ri = $index) {
                    <tr>
                      <td><input class="small-in" [name]="'rn' + fi + '_' + ri" [(ngModel)]="r.roomNumber" required maxlength="20"
                                 [attr.aria-label]="'common.room' | t" /></td>
                      <td><input type="number" class="tiny" [name]="'rs' + fi + '_' + ri" [ngModel]="r.sharingType"
                                 (ngModelChange)="setSharing(r, $event)" min="1" [max]="maxSharing" required
                                 [attr.aria-label]="'filters.sharing' | t" /></td>
                      <td><input type="checkbox" [name]="'ra' + fi + '_' + ri" [(ngModel)]="r.ac" [attr.aria-label]="'common.ac' | t" /></td>
                      <td><input type="checkbox" [name]="'rb' + fi + '_' + ri" [(ngModel)]="r.attachedBathroom"
                                 [attr.aria-label]="'owner.attachedBath' | t" /></td>
                      <td><input type="number" class="small-in" [name]="'rd' + fi + '_' + ri" [(ngModel)]="r.dailyRent" min="0" required
                                 [attr.aria-label]="'owner.dailyRent' | t" /></td>
                      <td><input type="number" class="small-in" [name]="'rw' + fi + '_' + ri" [(ngModel)]="r.weeklyRent" min="0"
                                 [attr.aria-label]="'owner.weeklyRent' | t" /></td>
                      <td><input type="number" class="small-in" [name]="'rm' + fi + '_' + ri" [(ngModel)]="r.monthlyRent" min="1" required
                                 [attr.aria-label]="'owner.monthlyRent' | t" /></td>
                      <td class="bed-toggles">
                        @for (b of r.beds; track b.label) {
                          <button type="button" class="bed small" [attr.data-status]="bedStatus(b)" (click)="toggleBed(b)"
                                  [disabled]="locked(b)" [attr.aria-pressed]="b.available"
                                  [attr.aria-label]="('common.bed' | t) + ' ' + b.label + ' - ' + (('bed.' + bedStatus(b)) | t)">{{ b.label }}</button>
                        }
                      </td>
                      <td><button type="button" class="icon-btn" (click)="removeRoom(fl, ri)" [attr.aria-label]="'form.removeRoom' | t">
                        <app-icon name="trash" [size]="15" /></button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
        <button type="button" class="btn btn-outline" (click)="addFloor()"><app-icon name="plus" [size]="14" /> {{ 'owner.addFloor' | t }}</button>
      </section>

      @if (error()) { <p class="alert error" role="alert">{{ error() }}</p> }
      <button class="btn btn-primary btn-lg" [disabled]="form.invalid || busy() || uploading()">{{ submitLabel() | t }}</button>
    </form>
  `
})
export class PgFormComponent implements OnInit {
  readonly initial = input<PgDetail | null>(null);
  readonly busy = input(false);
  readonly submitLabel = input('common.save');
  readonly submitted = output<PgRequest>();

  private readonly api = inject(ApiService);
  private readonly location = inject(LocationService);
  private readonly i18n = inject(I18nService);

  readonly labels = FACILITY_LABELS;
  readonly facilityCodes = Object.keys(FACILITY_LABELS);
  readonly pincodePattern = PINCODE_PATTERN;
  readonly phonePattern = PHONE_PATTERN;
  readonly upiPattern = UPI_PATTERN;
  readonly maxSharing = MAX_SHARING;

  /** Latitude / longitude are never typed: they come from "use my current location" or from the pincode. */
  m: PgModel = emptyModel();
  readonly media = signal<Media[]>([]);
  readonly facilities = signal<Set<string>>(new Set(['WIFI']));
  readonly floors = signal<FloorForm[]>([]);
  readonly uploading = signal(false);
  readonly locating = signal(false);
  readonly pincodeBusy = signal(false);
  readonly locationNote = signal<{ ok: boolean; text: string } | null>(null);
  readonly error = signal('');
  mediaUrl = '';
  mediaUrlType: MediaType = 'IMAGE';
  q = { floors: 3, rooms: 4, sharing: DEFAULT_SHARING, rent: DEFAULT_RENT, ac: false };

  ngOnInit(): void {
    const p = this.initial();
    if (!p) {
      this.floors.set([{ floorNumber: 1, rooms: [this.newRoom(1, 1, DEFAULT_SHARING, DEFAULT_RENT, false)] }]);
      return;
    }
    this.m = {
      name: p.name, description: p.description ?? '', addressLine: p.addressLine, area: p.area, city: p.city, state: p.state,
      pincode: p.pincode, latitude: p.latitude ?? null, longitude: p.longitude ?? null, genderPreference: p.genderPreference,
      contactPhone: p.contactPhone, upiId: p.upiId ?? '', houseRules: p.houseRules ?? ''
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

  firstImage(): number {
    return this.media().findIndex(md => md.mediaType === 'IMAGE');
  }

  /** Fills the whole address (and the hidden map position) from the device's current location. */
  async useLocation(): Promise<void> {
    this.locating.set(true);
    this.locationNote.set(null);
    const coords = await this.location.request();
    if (!coords) {
      this.locating.set(false);
      this.locationNote.set({ ok: false, text: this.i18n.t('location.' + this.location.status()) });
      return;
    }
    this.m.latitude = coords.lat;
    this.m.longitude = coords.lng;
    this.api.reverseGeocode(coords.lat, coords.lng).subscribe({
      next: address => {
        this.applyAddress(address, true);
        this.locating.set(false);
        this.locationNote.set({ ok: true, text: this.i18n.t('form.addressFilled') });
      },
      error: () => {
        this.locating.set(false);
        this.locationNote.set({ ok: false, text: this.i18n.t('form.addressLookupFailed') });
      }
    });
  }

  /** A complete pincode fills in the city and state (and the approximate map position). */
  onPincode(value: string): void {
    this.m.pincode = (value ?? '').trim();
    if (!PINCODE_PATTERN.test(this.m.pincode)) {
      return;
    }
    const pincode = this.m.pincode;
    this.pincodeBusy.set(true);
    this.api.pincode(pincode).subscribe({
      next: address => {
        this.pincodeBusy.set(false);
        if (this.m.pincode !== pincode) {
          return; // the user kept typing
        }
        this.applyAddress(address, false);
        if (address.latitude != null && address.longitude != null) {
          this.m.latitude = address.latitude;
          this.m.longitude = address.longitude;
        }
        this.locationNote.set(null);
      },
      // unknown pincode or lookup unavailable: the fields stay editable
      error: () => this.pincodeBusy.set(false)
    });
  }

  upload(e: Event): void {
    const inputEl = e.target as HTMLInputElement;
    const files = Array.from(inputEl.files ?? []);
    if (!files.length) {
      return;
    }
    this.uploading.set(true);
    let pending = files.length;
    const finished = () => {
      pending -= 1;
      if (pending === 0) {
        this.uploading.set(false);
      }
    };
    files.forEach(file => this.api.upload(file).subscribe({
      next: res => {
        this.media.update(list => [...list, { mediaType: res.mediaType, url: res.url }]);
        finished();
      },
      error: err => {
        this.error.set(errorMessage(err));
        finished();
      }
    }));
    inputEl.value = '';
  }

  validMediaUrl(): boolean {
    return /^https:\/\/\S+$/i.test(this.mediaUrl.trim());
  }

  addUrl(): void {
    const url = this.mediaUrl.trim();
    if (this.validMediaUrl() && !this.media().some(md => md.url === url)) {
      this.media.update(list => [...list, { mediaType: this.mediaUrlType, url }]);
    }
    this.mediaUrl = '';
  }

  removeMedia(i: number): void {
    this.media.update(list => list.filter((_, idx) => idx !== i));
  }

  toggleFacility(f: string): void {
    this.facilities.update(current => {
      const next = new Set(current);
      if (!next.delete(f)) {
        next.add(f);
      }
      return next;
    });
  }

  setSharing(r: RoomForm, n: number): void {
    r.sharingType = n;
    r.beds = this.beds(n, r.beds);
  }

  toggleBed(b: BedForm): void {
    b.available = !b.available;
  }

  locked(b: BedForm): boolean {
    return isLocked(b);
  }

  bedStatus(b: BedForm): BedStatus {
    if (isLocked(b) && b.status) {
      return b.status;
    }
    return b.available ? 'AVAILABLE' : 'UNAVAILABLE';
  }

  generate(): void {
    const floors: FloorForm[] = [];
    for (let f = 1; f <= this.q.floors; f++) {
      floors.push({
        floorNumber: f,
        rooms: Array.from({ length: this.q.rooms }, (_, i) => this.newRoom(f, i + 1, this.q.sharing, this.q.rent, this.q.ac))
      });
    }
    this.floors.set(floors);
  }

  addFloor(): void {
    const next = Math.max(0, ...this.floors().map(f => f.floorNumber)) + 1;
    this.floors.update(list => [...list, { floorNumber: next, rooms: [this.newRoom(next, 1, DEFAULT_SHARING, DEFAULT_RENT, false)] }]);
  }

  removeFloor(i: number): void {
    this.floors.update(list => list.filter((_, idx) => idx !== i));
  }

  addRoom(fl: FloorForm): void {
    fl.rooms.push(this.newRoom(fl.floorNumber, fl.rooms.length + 1, DEFAULT_SHARING, fl.rooms.at(-1)?.monthlyRent ?? DEFAULT_RENT, false));
  }

  removeRoom(fl: FloorForm, index: number): void {
    fl.rooms.splice(index, 1);
  }

  submit(): void {
    this.error.set('');
    const rooms = this.rooms();
    const problem = this.problem(rooms);
    if (problem) {
      this.error.set(this.i18n.t(problem.key, problem.params));
      return;
    }
    this.submitted.emit({
      ...this.m,
      name: this.m.name.trim(), addressLine: this.m.addressLine.trim(), area: this.m.area.trim(), city: this.m.city.trim(),
      state: this.m.state.trim(), contactPhone: this.m.contactPhone.trim(), upiId: this.m.upiId.trim() || null,
      facilities: [...this.facilities()], media: this.media(), rooms
    });
  }

  setError(msg: string): void {
    this.error.set(msg);
  }

  private applyAddress(address: Address, overwrite: boolean): void {
    const pick = (current: string, found?: string | null) => (found && (overwrite || !current.trim()) ? found : current);
    this.m.city = address.city ?? this.m.city;
    this.m.state = address.state ?? this.m.state;
    this.m.area = pick(this.m.area, address.area);
    this.m.addressLine = pick(this.m.addressLine, address.addressLine);
    if (overwrite && address.pincode) {
      this.m.pincode = address.pincode;
    }
  }

  private rooms(): RoomRequest[] {
    return this.floors().flatMap(f => f.rooms.map(r => ({
      floorNumber: f.floorNumber, roomNumber: r.roomNumber.trim(), sharingType: r.sharingType, ac: r.ac,
      attachedBathroom: r.attachedBathroom, dailyRent: r.dailyRent ?? 0, weeklyRent: r.weeklyRent, monthlyRent: r.monthlyRent ?? 0,
      beds: r.beds.map(b => ({ bedLabel: b.label, available: b.available }))
    })));
  }

  private problem(rooms: RoomRequest[]): { key: string; params?: Record<string, string> } | null {
    if (!this.media().some(md => md.mediaType === 'IMAGE')) {
      return { key: 'form.needPhoto' };
    }
    if (!this.facilities().size) {
      return { key: 'form.needFacility' };
    }
    if (!rooms.length) {
      return { key: 'form.needRoom' };
    }
    const duplicate = rooms.map(r => r.roomNumber).find((n, i, all) => all.indexOf(n) !== i);
    return duplicate ? { key: 'form.duplicateRoom', params: { room: duplicate } } : null;
  }

  private newRoom(floor: number, idx: number, sharing: number, rent: number, ac: boolean): RoomForm {
    return {
      roomNumber: `${floor === 0 ? 'G' : floor}${String(idx).padStart(2, '0')}`, sharingType: sharing, ac, attachedBathroom: true,
      dailyRent: Math.round(rent / DAYS_FACTOR), weeklyRent: Math.round(rent / WEEKS_FACTOR), monthlyRent: rent,
      beds: this.beds(sharing)
    };
  }

  private beds(n: number, old: BedForm[] = []): BedForm[] {
    const count = Math.max(1, Math.min(MAX_SHARING, n || 1));
    return Array.from({ length: count }, (_, i) => old[i] ?? { label: BED_LABELS[i], available: true });
  }
}
