import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n.service';
import { ActiveDialog, UiService } from '../core/ui.service';

const DEFAULT_MAX_LENGTH = 500;

/** App-wide toast message and the confirm / prompt dialog (used instead of the browser's confirm and prompt). */
@Component({
  selector: 'app-overlays',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  host: { '(document:keydown.escape)': 'cancel()' },
  template: `
    @if (ui.toast(); as toast) {
      <div class="toast no-print" [class.tone-success]="toast.tone === 'success'" [class.tone-error]="toast.tone === 'error'"
           role="status" aria-live="polite">
        <span class="toast-dot"></span>{{ toast.text }}
      </div>
    }

    @if (ui.dialog(); as dialog) {
      <div class="overlay">
        <button type="button" class="overlay-backdrop" (click)="cancel()" [attr.aria-label]="'common.close' | t"></button>
        <form class="modal dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" (ngSubmit)="confirm(dialog)">
          <h3 id="dialog-title" class="display">{{ dialog.title }}</h3>
          @if (dialog.message) { <p class="muted">{{ dialog.message }}</p> }
          @if (dialog.kind === 'prompt') {
            <label>{{ dialog.label }}
              <textarea name="value" [(ngModel)]="value" rows="3" [maxlength]="dialog.maxLength ?? defaultMaxLength"
                        [placeholder]="dialog.placeholder ?? ''"></textarea>
            </label>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="cancel()">{{ dialog.cancelLabel ?? ('common.cancel' | t) }}</button>
            <button type="submit" class="btn" [class.btn-danger]="dialog.danger" [class.btn-primary]="!dialog.danger">
              {{ dialog.confirmLabel ?? ('common.confirm' | t) }}
            </button>
          </div>
        </form>
      </div>
    }
  `
})
export class OverlaysComponent {
  readonly ui = inject(UiService);
  readonly defaultMaxLength = DEFAULT_MAX_LENGTH;
  value = '';

  constructor() {
    effect(() => {
      this.value = this.ui.dialog()?.value ?? '';
    });
  }

  confirm(dialog: ActiveDialog): void {
    this.ui.closeDialog(dialog.kind === 'prompt' ? this.value.trim() : '');
  }

  cancel(): void {
    if (this.ui.dialog()) {
      this.ui.closeDialog(null);
    }
  }
}
