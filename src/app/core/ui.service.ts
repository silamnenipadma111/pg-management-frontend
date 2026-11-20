import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  text: string;
  tone: ToastTone;
}

export interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
}

export interface PromptOptions extends DialogOptions {
  /** Label of the text field. */
  label: string;
  value?: string;
  placeholder?: string;
  maxLength?: number;
}

export interface ActiveDialog extends PromptOptions {
  kind: 'confirm' | 'prompt';
  resolve: (result: string | null) => void;
}

const TOAST_MS = 4200;

/** App-wide transient UI: toast messages, confirm / prompt dialogs and the slide-over panels. */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly toast = signal<Toast | null>(null);
  readonly dialog = signal<ActiveDialog | null>(null);
  readonly assistantOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly navOpen = signal(false);
  /** Set to re-open the location pop-up on request (e.g. from the user menu). */
  readonly locationPromptOpen = signal(false);

  private toastTimer?: ReturnType<typeof setTimeout>;

  show(text: string, tone: ToastTone = 'info'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, tone });
    this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_MS);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  /** Resolves to true when the user confirms. */
  confirm(options: DialogOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.dialog.set({ ...options, label: '', kind: 'confirm', resolve: result => resolve(result !== null) });
    });
  }

  /** Resolves to the entered text (possibly empty), or null when cancelled. */
  prompt(options: PromptOptions): Promise<string | null> {
    return new Promise(resolve => {
      this.dialog.set({ ...options, kind: 'prompt', resolve });
    });
  }

  closeDialog(result: string | null): void {
    const active = this.dialog();
    this.dialog.set(null);
    active?.resolve(result);
  }
}
