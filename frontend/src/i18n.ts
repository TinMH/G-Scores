import { EN } from './locales/en';

/**
 * Tiny i18n. The Vietnamese source text is the key, so Vietnamese needs no dictionary and a missing
 * English entry simply falls back to the Vietnamese text (easy to spot, never blank).
 *
 * The active language lives in a module variable that SettingsProvider updates; the provider also
 * remounts the tree on change (key={lang}), so every `t()` call re-runs with the new language.
 */
export type Lang = 'vi' | 'en';

let current: Lang = 'vi';

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

/** Locale for number formatting: vi-VN uses "9,60" and "1.061.605"; en-US uses "9.60" and "1,061,605". */
export function locale(): string {
  return current === 'en' ? 'en-US' : 'vi-VN';
}

/** Translate a Vietnamese source string. `{name}` placeholders are filled from `params`. */
export function t(key: string, params?: Record<string, string | number>): string {
  const text = current === 'en' ? (EN[key] ?? key) : key;
  return params ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`)) : text;
}
