import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setLang, type Lang } from './i18n';

export type ThemeMode = 'system' | 'light' | 'dark';
export type TextSize = 'normal' | 'large';

export interface Settings {
  language: Lang;
  theme: ThemeMode;
  textSize: TextSize;
  /** Group shown on the Dashboard when the URL doesn't say otherwise. */
  defaultGroup: string;
  defaultLimit: 10 | 20 | 50;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'vi',
  theme: 'system',
  textSize: 'normal',
  defaultGroup: 'A00',
  defaultLimit: 10,
};

// Keep in sync with the inline script in index.html (applies the theme before first paint).
const STORAGE_KEY = 'gscores:settings:v1';

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS; // storage blocked or corrupt JSON
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  /** What is actually rendered right now (system resolved). */
  resolvedTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Set before children render so every t() call sees the new language; the Fragment key below remounts the tree.
  setLang(settings.language);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.fontSize = settings.textSize === 'large' ? '112.5%' : '';
    root.lang = settings.language;
  }, [resolvedTheme, settings.textSize, settings.language]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable: settings still apply for this session */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset, resolvedTheme }), [settings, update, reset, resolvedTheme]);
  return <SettingsContext.Provider value={value}>
      <Fragment key={settings.language}>{children}</Fragment>
    </SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
