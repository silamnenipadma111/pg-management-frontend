import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { TRANSLATIONS } from './translations';

export type Lang = 'en' | 'hi' | 'te';
export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' }
];

const KEY = 'pg.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>((localStorage.getItem(KEY) as Lang) || 'en');
  readonly chosen = signal<boolean>(!!localStorage.getItem(KEY));

  setLang(lang: Lang): void {
    localStorage.setItem(KEY, lang);
    this.lang.set(lang);
    this.chosen.set(true);
    document.documentElement.lang = lang;
  }

  t(key: string, params?: Record<string, string | number>): string {
    const dict = TRANSLATIONS[this.lang()] ?? {};
    let text = dict[key] ?? TRANSLATIONS['en'][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => (text = text.replace(`{${k}}`, String(v))));
    }
    return text;
  }
}

/** Usage: {{ 'nav.home' | t }}  - impure so that it re-renders when the language changes. */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
